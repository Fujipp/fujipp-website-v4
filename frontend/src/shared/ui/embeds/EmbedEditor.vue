<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import DiscordEmbedPreview, { SLOT_ROLES } from "./DiscordEmbedPreview.vue";
import DiscordComponentsV2Preview from "./DiscordComponentsV2Preview.vue";
import VariableTextarea, { type VariableSuggestion } from "./VariableTextarea.vue";
import type { EmbedObject, ComponentConfig, PreviewRole } from "./DiscordEmbedPreview.vue";
import {
    VARIABLE_SUGGESTIONS,
    WALLET_COMPONENT_V2_FIELDS,
    createWalletComponentLayout,
    type ComponentV2Block,
    type ComponentsV2Config,
} from "./discordMessage";
import { DateField, SelectField, TextareaField, TextField } from "@/shared/ui/fields";
import { ActionButton, PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { CheckboxInput } from "@/shared/ui/inputs";
import { ConfirmModal } from "@/shared/ui/modals";
import { API_BASE_URL, icons } from "@/config";
import { useToastStore, useUserStore, type ToastStatus } from "@/stores";
import { supabase } from "@/shared/lib/supabase";
import { useLocaleText } from "@/i18n";

const text = useLocaleText();

/**
 * Reusable Discord embed editor. Drives the per-bot embed slots over a configurable
 * API base path so both the shop ("/api/bots") and admin ("/api/admin/bots") reuse it.
 */
const props = withDefaults(
    defineProps<{
        botId: string;
        botName?: string;
        botAvatarUrl?: string;
        basePath?: string;
        featureCode?: string;
        mode?: "embed" | "components";
        previewConfigValues?: Record<string, string>;
    }>(),
    { basePath: "/api/bots", botName: "", botAvatarUrl: "", featureCode: "", mode: "embed", previewConfigValues: () => ({}) },
);

interface EmbedSlot {
    featureCode: string;
    slotKey: string;
    label: string;
    description: string | null;
    availableVars: string[];
    overridden: boolean;
    embed: EmbedObject;
}

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const toastStore = useToastStore();

const slots = ref<EmbedSlot[]>([]);
// The bot's saved config values — used to mock the preview realistically (e.g. how
// many Roblox groups / which packages to show), so editing reflects the real setup.
const configValues = ref<Record<string, string>>({});
const selectedKey = ref("");
const draft = ref<EmbedObject | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const loadError = ref("");
const confirmation = ref<{
    title: string;
    reason: string;
    confirmLabel: string;
    variant: "default" | "danger";
    action: () => void | Promise<void>;
} | null>(null);
const confirmationBusy = ref(false);

const selected = computed(() => slots.value.find((s) => s.slotKey === selectedKey.value) ?? null);
const effectiveConfigValues = computed(() => ({
    ...configValues.value,
    ...props.previewConfigValues,
}));

// Editable component roles per slot come from the shared SLOT_ROLES map (kept in
// DiscordEmbedPreview so the form and preview never drift). custom_id/behaviour
// stay fixed in the bot — only label/emoji/style are editable here.
type Role = PreviewRole;
const COMPONENT_ROLES = SLOT_ROLES;
const BUTTON_STYLES = [
    { value: "primary", label: "Blue (Primary)" },
    { value: "secondary", label: "Gray (Secondary)" },
    { value: "success", label: "Green (Success)" },
    { value: "danger", label: "Red (Danger)" },
];
const roles = computed<Role[]>(() => COMPONENT_ROLES[selectedKey.value] ?? []);
const isWalletBuilder = computed(() => selected.value?.featureCode === "wallet-topup" && props.mode === "components");
const componentLayout = computed<ComponentV2Block[]>(() => {
    if (!draft.value) return [];
    draft.value.componentsV2 = draft.value.componentsV2 ?? {};
    const config = draft.value.componentsV2 as ComponentsV2Config;
    config.layout = Array.isArray(config.layout) ? config.layout : createWalletComponentLayout(selectedKey.value, config);
    return config.layout;
});
const previewComponentsV2 = computed<ComponentsV2Config | undefined>(() => (
    draft.value?.componentsV2 as ComponentsV2Config | undefined
));
const visibleSlots = computed(() => props.mode === "components"
    ? slots.value.filter((slot) => slot.featureCode === "wallet-topup" && Boolean(
        WALLET_COMPONENT_V2_FIELDS[slot.slotKey]?.length || COMPONENT_ROLES[slot.slotKey]?.length,
    ))
    : slots.value);
const ENGLISH_VARIABLE_DESCRIPTIONS: Record<string, string> = {
    amount: "Top-up amount",
    gross: "Amount before the fee is deducted",
    fee: "Transaction fee",
    account_name: "PromptPay account name",
    countdown: "Remaining payment time",
    qr_image: "Generated PromptPay QR image",
    fee_text: "TrueMoney fee notice",
    member: "Discord member ID used for a mention",
    total_balance: "Wallet balance after the transaction",
    method: "Top-up payment method",
    datetime: "Transaction date and time",
    reason: "Validation or payment failure reason",
    minimum: "Store minimum top-up amount",
    balance: "Member wallet balance",
    avatar_url: "Discord profile image of the member",
    member_id: "Discord user ID of the member",
    member_mention: "Clickable mention of the member",
    member_username: "Discord username of the member",
    member_display_name: "Discord display name of the member",
    member_avatar_url: "Discord profile image of the member",
    guild_id: "Discord server ID",
    guild_name: "Discord server name",
    channel_id: "Discord channel ID",
    channel_mention: "Clickable mention of the channel",
    bot_id: "Discord user ID of the bot",
    bot_name: "Discord username of the bot",
    bot_avatar_url: "Discord profile image of the bot",
};
const variableCatalog = computed<VariableSuggestion[]>(() => Object.entries(VARIABLE_SUGGESTIONS).map(([name, thaiDescription]) => ({
    name,
    description: text(ENGLISH_VARIABLE_DESCRIPTIONS[name] ?? name, thaiDescription),
})));
const selectedVariableSuggestions = computed<VariableSuggestion[]>(() => {
    const available = new Set(selected.value?.availableVars ?? []);
    return variableCatalog.value.map((item) => ({
        ...item,
        description: available.has(item.name)
            ? item.description
            : text(
                `${item.description} · value depends on the event stage`,
                `${item.description} · ค่าจะขึ้นอยู่กับขั้นตอนของรายการ`,
            ),
    }));
});
const discordSyntaxSuggestions = computed(() => [
    { name: "member_mention", token: "<@{{member}}>", description: text("Mention the member who made the transaction", "Mention สมาชิกที่ทำรายการ") },
    { name: "user_mention", token: "<@USER_ID>", description: text("Mention a Discord member by user ID", "Mention สมาชิก Discord ด้วย User ID") },
    { name: "channel_mention", token: "<#CHANNEL_ID>", description: text("Mention a Discord channel by channel ID", "Mention ห้อง Discord ด้วย Channel ID") },
    { name: "role_mention", token: "<@&ROLE_ID>", description: text("Mention a Discord role by role ID", "Mention Role Discord ด้วย Role ID") },
    { name: "relative_time", token: "<t:UNIX:R>", description: text("Relative time, for example “5 minutes ago”", "เวลาแบบสัมพัทธ์ เช่น “5 นาทีที่แล้ว”") },
    { name: "short_datetime", token: "<t:UNIX:f>", description: text("Short Discord date and time", "วันที่และเวลา Discord แบบสั้น") },
    { name: "custom_emoji", token: "<:name:EMOJI_ID>", description: text("Static custom server emoji", "Custom Emoji แบบภาพนิ่ง") },
    { name: "animated_emoji", token: "<a:name:EMOJI_ID>", description: text("Animated custom server emoji", "Custom Emoji แบบเคลื่อนไหว") },
    { name: "slash_command", token: "</command:COMMAND_ID>", description: text("Clickable Discord slash command", "คำสั่ง Slash Command ที่กดได้") },
]);
const autocompleteSuggestions = computed<VariableSuggestion[]>(() => [
    ...selectedVariableSuggestions.value,
    ...discordSyntaxSuggestions.value.map((item) => ({
        name: item.name,
        label: item.token,
        insertText: item.token,
        description: item.description,
    })),
]);

// Slots whose bot reply also sends message text above the embed (the Price Board
// per-category embeds use it for the tag line). Other slots' senders ignore content,
// so only expose the editor where it actually does something.
const supportsContent = computed(() => selectedKey.value.startsWith("price_cat"));

// Collapsible editor sections (mirrors Discohook's grouping). All open by default.
type SectionKey = "author" | "body" | "images" | "fields" | "footer" | "components";
const openSections = ref<Record<SectionKey, boolean>>({
    author: true,
    body: true,
    images: true,
    fields: true,
    footer: true,
    components: true,
});
function toggleSection(key: SectionKey): void {
    openSections.value[key] = !openSections.value[key];
}

function notify(status: ToastStatus, title: string, description?: string): void {
    toastStore.show(title, description ?? "", status);
}

function requestConfirmation(
    title: string,
    reason: string,
    confirmLabel: string,
    variant: "default" | "danger",
    action: () => void | Promise<void>,
): void {
    confirmation.value = { title, reason, confirmLabel, variant, action };
}

async function runConfirmedAction(): Promise<void> {
    const pending = confirmation.value;
    if (!pending || confirmationBusy.value) return;
    confirmationBusy.value = true;
    try {
        await pending.action();
        confirmation.value = null;
    } finally {
        confirmationBusy.value = false;
    }
}

// Authenticated fetch that self-heals a stale token: if the first try is 401, refresh
// the session once and retry. Returns null only when there is no session at all.
async function authedFetch(url: string, init: RequestInit = {}): Promise<Response | null> {
    await userStore.initAuth();
    let token = userStore.accessToken;
    if (!token) {
        await router.push({ name: "login", query: { redirect: route.fullPath } });
        return null;
    }
    const base = (init.headers as Record<string, string> | undefined) ?? {};
    const send = (t: string) => fetch(url, { ...init, headers: { ...base, Authorization: `Bearer ${t}` } });

    let res = await send(token);
    if (res.status === 401 || res.status === 403) {
        const { data } = await supabase.auth.refreshSession();
        token = data.session?.access_token ?? null;
        if (token) res = await send(token);
        if (!token || res.status === 401 || res.status === 403) {
            await router.push({ name: "login", query: { redirect: route.fullPath } });
            return null;
        }
    }
    return res;
}

function cloneEmbed(embed: EmbedObject): EmbedObject {
    return JSON.parse(JSON.stringify(embed ?? {}));
}

function normalize(embed: EmbedObject): EmbedObject {
    const e: EmbedObject = cloneEmbed(embed);
    e.image = e.image ?? {};
    e.thumbnail = e.thumbnail ?? {};
    e.footer = e.footer ?? {};
    e.author = e.author ?? {};
    return e;
}

function ensureComponentRoles(embed: EmbedObject, slotKey: string): EmbedObject {
    const editableRoles = COMPONENT_ROLES[slotKey] ?? [];
    if (editableRoles.length) {
        embed.components = embed.components ?? {};
        for (const role of editableRoles) {
            embed.components[role.key] = embed.components[role.key] ?? {};
        }
    }
    if (WALLET_COMPONENT_V2_FIELDS[slotKey]?.length) {
        embed.componentsV2 = embed.componentsV2 ?? {};
        embed.componentsV2.texts = embed.componentsV2.texts ?? {};
        for (const field of WALLET_COMPONENT_V2_FIELDS[slotKey]) {
            embed.componentsV2.texts[field.key] = embed.componentsV2.texts[field.key] || field.fallback;
        }
        const v2 = embed.componentsV2 as ComponentsV2Config;
        v2.layout = createWalletComponentLayout(slotKey, v2);
    }
    return embed;
}

function componentBlockCount(slotKey: string): number {
    return createWalletComponentLayout(slotKey).length;
}

const ROW_ROLE_KEYS: Record<string, string[]> = {
    topup_panel_actions: ["btn_topup", "btn_balance"],
    topup_method_actions: ["btn_promptpay", "btn_truemoney"],
    close_action: ["btn_close"],
    slip_action: ["btn_slip"],
    timeout_actions: ["btn_retry", "btn_close"],
};

function rolesForRow(rowKey = ""): Role[] {
    const keys = ROW_ROLE_KEYS[rowKey] ?? [];
    return roles.value.filter((role) => keys.includes(role.key));
}

function rowLabel(rowKey = ""): string {
    const labels: Record<string, string> = {
        topup_panel_actions: text("Top-up and balance buttons", "ปุ่มเติมเงินและเช็กยอด"),
        topup_method_actions: text("Payment method buttons", "ปุ่มช่องทางชำระเงิน"),
        close_action: text("Close button", "ปุ่มปิด"),
        slip_action: text("Submit slip button", "ปุ่มส่งสลิป"),
        timeout_actions: text("Retry and close buttons", "ปุ่มทำรายการใหม่และปิด"),
    };
    return labels[rowKey] ?? text("Link button row", "Row ปุ่มลิงก์");
}

function isFixedRow(block: ComponentV2Block): boolean {
    return block.type === "row" && Boolean(block.rowKey);
}

function componentSlotLabel(slot: EmbedSlot): string {
    const labels: Record<string, string> = {
        topup_panel: "Top-up panel",
        balance: text("Wallet balance", "กระเป๋าเงิน"),
        topup_method: text("Select payment method", "เลือกช่องทางเติมเงิน"),
        topup_invalid: text("Invalid amount", "จำนวนเงินไม่ถูกต้อง"),
        topup_qr: text("PromptPay QR", "QR พร้อมเพย์"),
        topup_timeout: text("Payment timed out", "หมดเวลาชำระเงิน"),
        processing: text("Processing payment", "กำลังประมวลผล"),
        error: text("System error", "ข้อผิดพลาดของระบบ"),
        topup_failed: "Top-up failed",
        topup_success: "Top-up successful",
    };
    return labels[slot.slotKey] ?? slot.label;
}

function insertBlockVar(block: Extract<ComponentV2Block, { type: "text" | "section" }>, variable: string): void {
    block.content += `{{${variable}}}`;
}

function nextBlockId(type: ComponentV2Block["type"]): string {
    return `${selectedKey.value}-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function addComponentBlock(type: "text" | "section" | "separator" | "media" | "row"): void {
    if (!draft.value) return;
    const block: ComponentV2Block = type === "row"
        ? { id: nextBlockId(type), type, buttons: [{ id: nextBlockId("row"), label: "Open link", emoji: "🔗", url: "https://" }] }
        : type === "text"
        ? { id: nextBlockId(type), type, content: "New content" }
        : type === "section"
        ? { id: nextBlockId(type), type, content: "New section", accessoryUrl: "https://" }
        : type === "separator"
            ? { id: nextBlockId(type), type, divider: true, spacing: 2 }
            : { id: nextBlockId(type), type, url: "https://", description: "Image" };
    componentLayout.value.push(block);
}

function removeComponentBlock(index: number): void {
    const block = componentLayout.value[index];
    if (!block || isFixedRow(block)) return;
    if (componentLayout.value.length === 1) {
        notify("warning", text("At least one component is required", "ต้องมีอย่างน้อยหนึ่ง Component"), text("Discord does not allow an empty container.", "Discord ไม่อนุญาตให้ Container ว่าง"));
        return;
    }
    componentLayout.value.splice(index, 1);
}

function duplicateComponentBlock(index: number): void {
    const block = componentLayout.value[index];
    if (!block || isFixedRow(block)) return;
    componentLayout.value.splice(index + 1, 0, { ...JSON.parse(JSON.stringify(block)), id: nextBlockId(block.type) });
}

function addLinkButton(block: Extract<ComponentV2Block, { type: "row" }>): void {
    block.buttons = block.buttons ?? [];
    if (block.buttons.length >= maxLinkButtons(block)) return;
    block.buttons.push({ id: nextBlockId("row"), label: "Open link", emoji: "🔗", url: "https://" });
}

function removeLinkButton(block: Extract<ComponentV2Block, { type: "row" }>, index: number): void {
    if (!block.buttons) return;
    block.buttons.splice(index, 1);
}

function maxLinkButtons(block: Extract<ComponentV2Block, { type: "row" }>): number {
    return Math.max(0, 5 - rolesForRow(block.rowKey).length);
}

function moveComponentBlock(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= componentLayout.value.length) return;
    const current = componentLayout.value[index];
    const adjacent = componentLayout.value[target];
    if (!current || !adjacent) return;
    componentLayout.value[index] = adjacent;
    componentLayout.value[target] = current;
}

function componentContainer(): NonNullable<ComponentsV2Config["container"]> {
    if (!draft.value) return {};
    draft.value.componentsV2 = draft.value.componentsV2 ?? {};
    const config = draft.value.componentsV2 as ComponentsV2Config;
    config.container = config.container ?? {};
    return config.container;
}

const containerColorHex = computed<string>({
    get: () => {
        const color = componentContainer().accentColor;
        return color == null ? "" : `#${(color & 0xffffff).toString(16).padStart(6, "0")}`;
    },
    set: (value) => {
        const normalized = value.trim().replace(/^#/, "");
        if (/^[0-9a-fA-F]{6}$/.test(normalized)) componentContainer().accentColor = Number.parseInt(normalized, 16);
        else if (!value.trim()) delete componentContainer().accentColor;
    },
});

const containerColorPicker = computed<string>({
    get: () => containerColorHex.value || "#000000",
    set: (value) => { containerColorHex.value = value; },
});

function selectSlot(key: string): void {
    selectedKey.value = key;
    const slot = slots.value.find((s) => s.slotKey === key);
    draft.value = slot ? ensureComponentRoles(normalize(slot.embed), key) : null;
}

const colorHex = computed<string>({
    get: () => `#${((draft.value?.color ?? 0) & 0xffffff).toString(16).padStart(6, "0")}`,
    set: (value) => {
        if (!draft.value) return;
        const normalized = value.trim().replace(/^#/, "");
        if (/^[0-9a-fA-F]{6}$/.test(normalized)) draft.value.color = Number.parseInt(normalized, 16);
    },
});

function varToken(name: string): string {
    return `{{${name}}}`;
}

function insertVar(name: string): void {
    if (!draft.value) return;
    draft.value.description = `${draft.value.description ?? ""}${varToken(name)}`;
}

// Footer timestamp (ISO) edited as separate date + time inputs, like Discohook.
function setTimestamp(date: string, time: string): void {
    if (!draft.value) return;
    if (!date && !time) { draft.value.timestamp = undefined; return; }
    const d = date || new Date().toISOString().slice(0, 10);
    const t = time || "00:00";
    const composed = new Date(`${d}T${t}`);
    draft.value.timestamp = Number.isNaN(composed.getTime()) ? undefined : composed.toISOString();
}
const tsDate = computed<string>({
    get: () => (draft.value?.timestamp ? draft.value.timestamp.slice(0, 10) : ""),
    set: (d) => setTimestamp(d, tsTime.value),
});
const tsTime = computed<string>({
    get: () => {
        const m = draft.value?.timestamp?.match(/T(\d{2}:\d{2})/);
        return m?.[1] ?? "";
    },
    set: (t: string) => setTimestamp(tsDate.value, t),
});

function addField(): void {
    if (!draft.value) return;
    if (!draft.value.fields) draft.value.fields = [];
    draft.value.fields.push({ name: "", value: "", inline: false });
}

function removeField(index: number): void {
    draft.value?.fields?.splice(index, 1);
    notify("success", text("Field removed", "ลบช่องแล้ว"));
}

function confirmRemoveField(index: number): void {
    requestConfirmation(
        text("Remove field?", "ลบช่องนี้หรือไม่?"),
        `Field ${index + 1} will be removed from this Embed draft.`,
        text("Remove", "ลบ"),
        "danger",
        () => removeField(index),
    );
}

function moveField(index: number, dir: -1 | 1): void {
    const fields = draft.value?.fields;
    if (!fields) return;
    const target = index + dir;
    if (target < 0 || target >= fields.length) return;
    const a = fields[index];
    const b = fields[target];
    if (!a || !b) return;
    fields[index] = b;
    fields[target] = a;
}

function duplicateField(index: number): void {
    const fields = draft.value?.fields;
    if (!fields) return;
    const copy = JSON.parse(JSON.stringify(fields[index]));
    fields.splice(index + 1, 0, copy);
}

function componentConfig(roleKey: string): ComponentConfig {
    if (!draft.value) return {};
    draft.value.components = draft.value.components ?? {};
    draft.value.components[roleKey] = draft.value.components[roleKey] ?? {};
    return draft.value.components[roleKey];
}

// Whether an optional component (e.g. a Price Board category button) is currently in
// use — the bot only shows it when it has a label.
function roleInUse(roleKey: string): boolean {
    return Boolean(draft.value?.components?.[roleKey]?.label?.trim());
}

// "Remove" an optional component: wipe its label/emoji/style so it's dropped on save
// and hidden by the bot. The slot stays in the editor so it can be re-added later.
function removeComponent(roleKey: string): void {
    if (!draft.value) return;
    draft.value.components = draft.value.components ?? {};
    draft.value.components[roleKey] = {};
    notify("success", text("Button removed", "ลบปุ่มแล้ว"), text("Save Embed to apply this change to the bot.", "บันทึก Embed เพื่อนำการเปลี่ยนแปลงไปใช้กับบอท"));
}

function confirmRemoveComponent(roleKey: string, roleLabel: string): void {
    requestConfirmation(
        text("Remove button?", "ลบปุ่มนี้หรือไม่?"),
        `${roleLabel} will be hidden from this Embed.`,
        text("Remove button", "ลบปุ่ม"),
        "danger",
        () => removeComponent(roleKey),
    );
}

function cleanComponent(role: Role, cfg: ComponentConfig): ComponentConfig | null {
    const out: ComponentConfig = {};
    const label = cfg.label?.trim();
    const emoji = cfg.emoji?.trim();
    const style = cfg.style?.trim();
    const placeholder = cfg.placeholder?.trim();
    const url = cfg.url?.trim();
    const optionLabel = cfg.option_label?.trim();
    const optionDescription = cfg.option_description?.trim();
    const optionOk = cfg.option_ok?.trim();
    const optionInsufficient = cfg.option_insufficient?.trim();

    if (role.type !== "select" && label) out.label = label;
    if (emoji) out.emoji = emoji;
    if (role.type === "button" && style) out.style = style;
    if (role.type === "select" && placeholder) out.placeholder = placeholder;
    if (role.type === "link" && url) out.url = url;
    if (role.type === "select" && optionLabel) out.option_label = optionLabel;
    if (role.type === "select" && optionDescription) out.option_description = optionDescription;
    if (role.type === "select" && optionOk) out.option_ok = optionOk;
    if (role.type === "select" && optionInsufficient) out.option_insufficient = optionInsufficient;
    return Object.keys(out).length ? out : null;
}

function clean(embed: EmbedObject): EmbedObject {
    const e: EmbedObject = cloneEmbed(embed);
    if (!e.content || !e.content.trim()) delete e.content;
    if (!e.url || !e.url.trim()) delete e.url;
    if (!e.timestamp) delete e.timestamp;
    if (!e.image?.url) delete e.image;
    if (!e.thumbnail?.url) delete e.thumbnail;
    if (!e.footer?.text && !e.footer?.icon_url) delete e.footer;
    if (!e.author?.name && !e.author?.icon_url && !e.author?.url) delete e.author;
    if (e.fields) {
        e.fields = e.fields.filter((f) => (f.name && f.name.trim()) || (f.value && f.value.trim()));
        if (e.fields.length === 0) delete e.fields;
    }
    const editableRoles = COMPONENT_ROLES[selectedKey.value] ?? [];
    if (e.components && editableRoles.length) {
        const kept: Record<string, ComponentConfig> = {};
        for (const role of editableRoles) {
            const cfg = e.components[role.key];
            const cleaned = cfg ? cleanComponent(role, cfg) : null;
            if (cleaned) {
                kept[role.key] = cleaned;
            } else if (role.optional) {
                // Persist an explicit empty override for an emptied optional button.
                // The effective embed is `default.components || override.components`
                // (shallow, per role key), so omitting it would let the seeded default
                // label re-appear; an explicit {} overrides that default to "hidden".
                kept[role.key] = {};
            }
        }
        if (Object.keys(kept).length) e.components = kept;
        else delete e.components;
    }
    return e;
}

async function loadSlots(): Promise<void> {
    if (!props.botId) return;
    isLoading.value = true;
    loadError.value = "";
    try {
        const res = await authedFetch(`${API_BASE_URL}${props.basePath}/${props.botId}/embeds`);
        if (!res) return;
        if (!res.ok) {
            let body = "";
            try { body = (await res.text()).slice(0, 300); } catch { /* ignore */ }
            throw new Error(`HTTP ${res.status}${body ? ` — ${body}` : ""}`);
        }
        let loaded = (await res.json()) as EmbedSlot[];
        // When opened for a specific feature, only show that feature's slots so the
        // user isn't faced with every bot embed at once.
        if (props.featureCode) loaded = loaded.filter((s) => s.featureCode === props.featureCode);
        slots.value = loaded;
        const first = visibleSlots.value[0];
        if (first) selectSlot(first.slotKey);
        else { selectedKey.value = ""; draft.value = null; }
    } catch (e) {
        slots.value = [];
        loadError.value = `${text("Unable to load message settings", "โหลดการตั้งค่าข้อความไม่สำเร็จ")}: ${(e as Error).message || text("Please try again.", "กรุณาลองใหม่อีกครั้ง")}`;
    } finally {
        isLoading.value = false;
    }
}

async function save(): Promise<void> {
    if (!draft.value || !selected.value) return;
    isSaving.value = true;
    try {
        const res = await authedFetch(
            `${API_BASE_URL}${props.basePath}/${props.botId}/embeds/${selected.value.slotKey}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(clean(draft.value)),
            },
        );
        if (!res) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const slot = slots.value.find((s) => s.slotKey === selectedKey.value);
        if (slot) { slot.embed = clean(draft.value); slot.overridden = true; }
        notify("success", props.mode === "components" ? text("Components saved", "บันทึก Components แล้ว") : text("Embed saved", "บันทึก Embed แล้ว"));
    } catch {
        notify("error", text("Unable to save", "บันทึกไม่สำเร็จ"), text("Please try again.", "กรุณาลองใหม่อีกครั้ง"));
    } finally {
        isSaving.value = false;
    }
}

async function resetToDefault(): Promise<void> {
    if (!selected.value) return;
    isSaving.value = true;
    try {
        const res = await authedFetch(
            `${API_BASE_URL}${props.basePath}/${props.botId}/embeds/${selected.value.slotKey}`,
            { method: "DELETE" },
        );
        if (!res || !res.ok) throw new Error(`HTTP ${res?.status ?? 0}`);
        const restored = normalize((await res.json()) as EmbedObject);
        const slot = slots.value.find((item) => item.slotKey === selectedKey.value);
        if (slot) {
            slot.embed = restored;
            slot.overridden = false;
        }
        draft.value = ensureComponentRoles(restored, selectedKey.value);
        notify("success", text("Default restored", "คืนค่าเริ่มต้นแล้ว"), text("This event now follows the latest template.", "เหตุการณ์นี้ใช้ Template ล่าสุดแล้ว"));
    } catch {
        notify("error", text("Unable to restore default", "คืนค่าเริ่มต้นไม่สำเร็จ"), text("Please try again.", "กรุณาลองใหม่อีกครั้ง"));
    } finally {
        isSaving.value = false;
    }
}

function confirmResetToDefault(): void {
    requestConfirmation(
        text("Restore the latest template?", "คืนค่า Template ล่าสุดหรือไม่?"),
        text("Your custom settings for this event will be removed.", "การตั้งค่าที่แก้เองสำหรับเหตุการณ์นี้จะถูกลบ"),
        text("Restore default", "คืนค่าเริ่มต้น"),
        "danger",
        resetToDefault,
    );
}

function confirmSave(): void {
    requestConfirmation(
        `Save ${props.mode === "components" ? "components" : "embed"}?`,
        `Save the ${props.mode === "components" ? "components" : "embed"} for ${selected.value ? componentSlotLabel(selected.value) : "this event"}?`,
        text("Save", "บันทึก"),
        "default",
        save,
    );
}

// Pull the bot config so the preview can mock {{vars}} / dynamic lists from real data.
async function loadConfigValues(): Promise<void> {
    if (!props.botId) return;
    try {
        const res = await authedFetch(`${API_BASE_URL}${props.basePath}/${props.botId}/config`);
        if (!res || !res.ok) return;
        const data = (await res.json()) as { values?: Record<string, string> };
        configValues.value = data.values ?? {};
    } catch { /* non-blocking — preview falls back to sample data */ }
}

onMounted(() => { loadSlots(); loadConfigValues(); });
watch(() => [props.botId, props.featureCode], loadSlots);
watch(() => props.botId, loadConfigValues);
watch(() => props.mode, () => {
    const next = visibleSlots.value[0];
    if (next && !visibleSlots.value.some((slot) => slot.slotKey === selectedKey.value)) selectSlot(next.slotKey);
});
</script>

<template>
    <div>
        <p v-if="isLoading" :class="$style.state" class="type-body-small-r">{{ text("Loading…", "กำลังโหลด…") }}</p>
        <section v-else-if="loadError" :class="$style.statePanel">
            <p :class="$style.stateText">{{ loadError }}</p>
            <PrimaryButton width-mode="hug" :leading-icon="icons.restart" @click="loadSlots">{{ text("Retry", "ลองใหม่") }}</PrimaryButton>
        </section>

        <div v-else :class="[$style.layout, mode === 'components' ? $style.componentsLayout : '']">
            <!-- slot list -->
            <nav :class="$style.slotList">
                <div v-if="mode === 'components'" :class="$style.slotListHead">
                    <strong>{{ text("Select an event to edit", "เลือกเหตุการณ์ที่ต้องการแก้ไข") }}</strong>
                    <span>{{ visibleSlots.length }} events</span>
                </div>
                <div :class="mode === 'components' ? $style.slotScroller : $style.slotStack">
                    <button
                        v-for="(slot, slotIndex) in visibleSlots"
                        :key="slot.slotKey"
                        type="button"
                        :aria-pressed="slot.slotKey === selectedKey"
                        :class="[$style.slotItem, slot.slotKey === selectedKey ? $style.slotActive : '']"
                        @click="selectSlot(slot.slotKey)"
                    >
                        <span v-if="mode === 'components'" :class="$style.slotNumber">{{ slotIndex + 1 }}</span>
                        <span :class="$style.slotCopy">
                            <span :class="$style.slotLabel">{{ mode === "components" ? componentSlotLabel(slot) : slot.label }}</span>
                            <span v-if="mode === 'components'" :class="$style.slotDescription">
                                {{ componentBlockCount(slot.slotKey) }} editable blocks
                            </span>
                        </span>
                        <span :class="$style.slotMeta">
                            <span v-if="slot.slotKey === selectedKey" :class="$style.selectedState" aria-hidden="true">✓</span>
                            <span v-if="slot.overridden" :class="$style.dot" :title="text('Edited', 'แก้ไขแล้ว')" />
                        </span>
                    </button>
                    <p v-if="visibleSlots.length === 0" :class="$style.state" class="type-body-small-r">
                        {{ mode === "components" ? text("No components are available for this feature.", "ฟีเจอร์นี้ไม่มี Components") : text("No embeds are available for this feature.", "ฟีเจอร์นี้ไม่มี Embed") }}
                    </p>
                </div>
            </nav>

            <!-- editor + preview -->
            <div v-if="draft && selected" :class="[$style.editor, mode === 'components' ? $style.componentsEditor : '']">
                <div :class="$style.formCol">
                    <p v-if="mode === 'embed'" :class="$style.slotDesc" class="type-body-small-r">{{ selected.description }}</p>
                    <details v-if="mode === 'embed' && selected.featureCode === 'wallet-topup'" :class="$style.variableGuide">
                        <summary>
                            <span>
                                <strong>{{ text("Variables and Discord syntax", "ตัวแปรและรูปแบบ Discord") }}</strong>
                                <small>{{ text("Type {{ in any supported field to open suggestions.", "พิมพ์ {{ ในช่องที่รองรับเพื่อเปิดคำแนะนำ") }}</small>
                            </span>
                            <span>{{ variableCatalog.length }}</span>
                        </summary>
                        <div :class="$style.variableGuideBody">
                            <section>
                                <h4>{{ text("Available variables", "ตัวแปรที่ใช้ได้") }}</h4>
                                <div :class="$style.variableReference">
                                    <div v-for="item in variableCatalog" :key="item.name" :class="selected.availableVars.includes(item.name) ? $style.variableAvailable : ''">
                                        <code>{{ varToken(item.name) }}</code>
                                        <span>{{ item.description }}</span>
                                        <small v-if="selected.availableVars.includes(item.name)">{{ text("Available here", "ใช้กับข้อความนี้ได้") }}</small>
                                    </div>
                                </div>
                            </section>
                            <section>
                                <h4>{{ text("Discord syntax", "รูปแบบ Discord") }}</h4>
                                <div :class="$style.variableReference">
                                    <div v-for="item in discordSyntaxSuggestions" :key="item.token">
                                        <code>{{ item.token }}</code>
                                        <span>{{ item.description }}</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </details>

                    <!-- ── Body ── -->
                    <section v-if="mode === 'embed'" :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('body')">
                            <span :class="[$style.chevron, openSections.body ? $style.chevronOpen : '']">›</span>
                            <span>{{ text("Body", "เนื้อหา") }}</span>
                        </button>
                        <div v-show="openSections.body" :class="$style.sectionBody">
                            <template v-if="supportsContent">
                                <VariableTextarea
                                    v-model="draft.content"
                                    :label="text('Content', 'ข้อความ')"
                                    :rows="2"
                                    :placeholder="text('Text above the embed — use {{member}} to mention the member', 'ข้อความเหนือ Embed — ใช้ {{member}} เพื่อกล่าวถึงสมาชิก')"
                                    :suggestions="autocompleteSuggestions"
                                />
                            </template>

                            <div :class="$style.colorField">
                                <label for="embed-color-hex" :class="$style.colorLabel">{{ text("Embed color (HEX)", "สี Embed (HEX)") }}</label>
                                <div :class="$style.colorControls">
                                    <input
                                        id="embed-color-hex"
                                        v-model="colorHex"
                                        type="text"
                                        inputmode="text"
                                        maxlength="7"
                                        pattern="#[0-9A-Fa-f]{6}"
                                        placeholder="#000000"
                                        :class="$style.hexInput"
                                    />
                                    <label :class="$style.swatchLabel" :title="text('Open color picker', 'เปิดตัวเลือกสี')">
                                        <span :style="{ backgroundColor: colorHex }" :class="$style.colorSwatch" />
                                        <input v-model="colorHex" type="color" :class="$style.nativeColor" :aria-label="text('Select Embed color', 'เลือกสี Embed')" />
                                    </label>
                                </div>
                                <span :class="$style.colorHint">{{ text("Enter a color in #RRGGBB format", "กรอกค่าสีรูปแบบ #RRGGBB") }}</span>
                            </div>

                            <VariableTextarea v-model="draft.title" single-line :label="text('Title', 'หัวข้อ')" :placeholder="text('Text and emoji supported', 'รองรับข้อความและ emoji')" :suggestions="autocompleteSuggestions" />
                            <VariableTextarea v-model="draft.url" single-line :label="text('Title URL', 'ลิงก์หัวข้อ')" :placeholder="text('https:// (opens when the title is clicked)', 'https:// (เปิดเมื่อกดหัวข้อ)')" :suggestions="autocompleteSuggestions" />

                            <VariableTextarea
                                v-model="draft.description"
                                :label="text('Description', 'รายละเอียด')"
                                :rows="5"
                                :placeholder="text('Supports Markdown, variables, and custom emoji', 'รองรับ Markdown ตัวแปร และ custom emoji')"
                                :suggestions="autocompleteSuggestions"
                            />

                            <div v-if="selected.availableVars.length" :class="$style.vars">
                                <span :class="$style.varsLabel">{{ text("Variables:", "ตัวแปร:") }}</span>
                                <button
                                    v-for="v in selected.availableVars"
                                    :key="v"
                                    type="button"
                                    :class="$style.varChip"
                                    @click="insertVar(v)"
                                >{{ varToken(v) }}</button>
                            </div>
                        </div>
                    </section>

                    <!-- ── Author ── -->
                    <section v-if="mode === 'embed'" :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('author')">
                            <span :class="[$style.chevron, openSections.author ? $style.chevronOpen : '']">›</span>
                            <span>{{ text("Author", "ผู้เขียน") }}</span>
                        </button>
                        <div v-show="openSections.author" :class="$style.sectionBody">
                            <VariableTextarea v-model="draft.author!.name" single-line :label="text('Author name', 'ชื่อผู้เขียน')" :placeholder="text('Optional', 'ไม่บังคับ')" :suggestions="autocompleteSuggestions" />
                            <div :class="$style.grid2">
                                <VariableTextarea v-model="draft.author!.url" single-line :label="text('Author URL', 'ลิงก์ผู้เขียน')" placeholder="https://" :suggestions="autocompleteSuggestions" />
                                <VariableTextarea v-model="draft.author!.icon_url" single-line :label="text('Author icon URL', 'ลิงก์ไอคอนผู้เขียน')" placeholder="https://" :suggestions="autocompleteSuggestions" />
                            </div>
                        </div>
                    </section>

                    <!-- ── Images ── -->
                    <section v-if="mode === 'embed'" :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('images')">
                            <span :class="[$style.chevron, openSections.images ? $style.chevronOpen : '']">›</span>
                            <span>{{ text("Images", "รูปภาพ") }}</span>
                        </button>
                        <div v-show="openSections.images" :class="$style.sectionBody">
                            <div :class="$style.grid2">
                                <VariableTextarea v-model="draft.image!.url" single-line :label="text('Image URL', 'ลิงก์รูปใหญ่')" placeholder="https://" :suggestions="autocompleteSuggestions" />
                                <VariableTextarea v-model="draft.thumbnail!.url" single-line :label="text('Thumbnail URL', 'ลิงก์รูปย่อ')" placeholder="https://" :suggestions="autocompleteSuggestions" />
                            </div>
                        </div>
                    </section>

                    <!-- ── Fields ── -->
                    <section v-if="mode === 'embed'" :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('fields')">
                            <span :class="[$style.chevron, openSections.fields ? $style.chevronOpen : '']">›</span>
                            <span>{{ text("Fields", "ช่องข้อมูล") }}</span>
                        </button>
                        <div v-show="openSections.fields" :class="$style.sectionBody">
                            <div :class="$style.fieldsHead">
                                <span :class="$style.helperText">{{ (draft.fields ?? []).length }} fields</span>
                                <PrimaryButton width-mode="hug" :leading-icon="icons.add" @click="addField">{{ text("Add field", "เพิ่มช่อง") }}</PrimaryButton>
                            </div>
                            <div v-for="(f, i) in draft.fields ?? []" :key="i" :class="$style.fieldRow">
                                <div :class="$style.fieldInputs">
                                    <VariableTextarea v-model="f.name" single-line :label="text('Field name', 'ชื่อช่อง')" :placeholder="text('Name and emoji', 'ชื่อและ emoji')" :suggestions="autocompleteSuggestions" />
                                    <VariableTextarea v-model="f.value" :rows="3" :label="text('Value', 'ค่า')" :placeholder="text('Markdown and variables supported', 'รองรับ Markdown และตัวแปร')" :suggestions="autocompleteSuggestions" />
                                </div>
                                <div :class="$style.fieldActions">
                                    <label :class="$style.inlineToggle">
                                        <CheckboxInput v-model="f.inline" size="m" :aria-label="`Display field ${i + 1} inline`" />
                                        <span>{{ text("Inline", "แสดงแถวเดียวกัน") }}</span>
                                    </label>
                                    <ActionButton action="scroll-top" :aria-label="text('Move field up', 'เลื่อนช่องขึ้น')" :disabled="i === 0" @click="moveField(i, -1)" />
                                    <ActionButton action="scroll-bottom" :aria-label="text('Move field down', 'เลื่อนช่องลง')" :disabled="i === (draft.fields?.length ?? 0) - 1" @click="moveField(i, 1)" />
                                    <SecondaryButton width-mode="hug" @click="duplicateField(i)">{{ text("Duplicate", "ทำซ้ำ") }}</SecondaryButton>
                                    <SecondaryButton width-mode="hug" :leading-icon="icons.delete" @click="confirmRemoveField(i)">{{ text("Remove", "ลบ") }}</SecondaryButton>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- ── Footer ── -->
                    <section v-if="mode === 'embed'" :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('footer')">
                            <span :class="[$style.chevron, openSections.footer ? $style.chevronOpen : '']">›</span>
                            <span>{{ text("Footer", "ส่วนท้าย") }}</span>
                        </button>
                        <div v-show="openSections.footer" :class="$style.sectionBody">
                            <div :class="$style.grid2">
                                <VariableTextarea v-model="draft.footer!.text" single-line :label="text('Footer text', 'ข้อความท้าย')" :placeholder="text('Optional', 'ไม่บังคับ')" :suggestions="autocompleteSuggestions" />
                                <VariableTextarea v-model="draft.footer!.icon_url" single-line :label="text('Footer icon URL', 'ลิงก์ไอคอนท้าย')" placeholder="https://" :suggestions="autocompleteSuggestions" />
                            </div>
                            <div :class="$style.grid2">
                                <DateField v-model="tsDate" :label="text('Timestamp date', 'วันที่ Timestamp')" />
                                <TextField v-model="tsTime" :label="text('Timestamp time', 'เวลา Timestamp')" type="time" />
                            </div>
                        </div>
                    </section>

                    <!-- ── Components-only workspace ── -->
                    <template v-if="mode === 'components'">
                        <section :class="$style.componentGuide">
                            <div>
                                <span :class="$style.componentEyebrow">{{ text("Editing", "กำลังแก้ไข") }}</span>
                                <h3>{{ componentSlotLabel(selected) }}</h3>
                                <p>{{ text("Add, remove, duplicate, or reorder blocks. The preview updates instantly.", "เพิ่ม ลบ ทำซ้ำ หรือเรียงบล็อกใหม่ได้ โดย Preview จะอัปเดตทันที") }}</p>
                            </div>
                            <div :class="$style.componentCount">
                                <strong>{{ componentLayout.length }}</strong>
                                <span>{{ text("blocks", "บล็อก") }}</span>
                            </div>
                        </section>

                        <details v-if="isWalletBuilder" :class="$style.variableGuide">
                            <summary>
                                <span>
                                    <strong>{{ text("Variables and Discord syntax", "ตัวแปรและรูปแบบ Discord") }}</strong>
                                    <small>{{ text("Type {{ in a text field to open suggestions.", "พิมพ์ {{ ในช่องข้อความเพื่อเปิดคำแนะนำ") }}</small>
                                </span>
                                <span>{{ variableCatalog.length }}</span>
                            </summary>
                            <div :class="$style.variableGuideBody">
                                <section>
                                    <h4>{{ text("Shop Wallet & Top-up variables", "ตัวแปร Shop Wallet & Top-up") }}</h4>
                                    <div :class="$style.variableReference">
                                        <div v-for="item in variableCatalog" :key="item.name" :class="selected.availableVars.includes(item.name) ? $style.variableAvailable : ''">
                                            <code>{{ varToken(item.name) }}</code>
                                            <span>{{ item.description }}</span>
                                            <small v-if="selected.availableVars.includes(item.name)">{{ text("Available here", "ใช้กับข้อความนี้ได้") }}</small>
                                        </div>
                                    </div>
                                </section>
                                <section>
                                    <h4>{{ text("Discord syntax", "รูปแบบ Discord") }}</h4>
                                    <div :class="$style.variableReference">
                                        <div v-for="item in discordSyntaxSuggestions" :key="item.token">
                                            <code>{{ item.token }}</code>
                                            <span>{{ item.description }}</span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </details>

                        <section v-if="isWalletBuilder" :class="$style.componentGroup">
                            <header :class="$style.componentGroupHead">
                                <div>
                                    <span :class="$style.componentStep">01</span>
                                    <div>
                                        <h3>Container</h3>
                                        <p>{{ text("Configure the main Components V2 container.", "ตั้งค่ากรอบหลักของ Components V2") }}</p>
                                    </div>
                                </div>
                            </header>
                            <div :class="$style.containerSettings">
                                <div :class="$style.componentColorPicker">
                                    <label for="component-sidebar-color">{{ text("Sidebar color", "สีแถบด้านข้าง") }}</label>
                                    <div>
                                        <input id="component-sidebar-color" v-model="containerColorPicker" type="color" :aria-label="text('Select sidebar color', 'เลือกสีแถบด้านข้าง')" />
                                        <TextField v-model="containerColorHex" label="HEX" placeholder="#000000" />
                                        <SecondaryButton v-if="containerColorHex" width-mode="hug" @click="containerColorHex = ''">{{ text("Clear", "ล้าง") }}</SecondaryButton>
                                    </div>
                                </div>
                                <label :class="$style.inlineToggle">
                                    <CheckboxInput v-model="componentContainer().spoiler" size="m" :aria-label="text('Mark container as spoiler', 'ทำ Container เป็นสปอยเลอร์')" />
                                    <span>{{ text("Mark as spoiler", "ทำเป็นสปอยเลอร์") }}</span>
                                </label>
                            </div>
                        </section>

                        <section v-if="isWalletBuilder" :class="$style.componentGroup">
                            <header :class="$style.componentGroupHead">
                                <div>
                                    <span :class="$style.componentStep">02</span>
                                    <div>
                                        <h3>{{ text("Component blocks", "บล็อก Component") }}</h3>
                                        <p>{{ text("Blocks are sent to Discord in this top-to-bottom order.", "บล็อกจะถูกส่งเข้า Discord ตามลำดับจากบนลงล่าง") }}</p>
                                    </div>
                                </div>
                            </header>
                            <div :class="$style.componentBlockList">
                                <article v-for="(block, blockIndex) in componentLayout" :key="block.id" :class="$style.componentEditCard">
                                    <header :class="$style.componentEditHead">
                                        <span :class="$style.blockNumber">{{ blockIndex + 1 }}</span>
                                        <div>
                                            <strong>{{ block.type === "row" ? rowLabel(block.rowKey) : block.type === "text" ? text("Content", "ข้อความ") : block.type === "section" ? text("Section", "Section") : block.type === "media" ? text("Media Gallery", "แกลเลอรีสื่อ") : text("Separator", "เส้นคั่น") }}</strong>
                                            <span>{{ isFixedRow(block) ? text("Structure and actions are locked to keep the feature working.", "โครงสร้างและ Action ถูกล็อกไว้เพื่อให้ฟีเจอร์ทำงานได้") : text("This block is fully editable.", "บล็อกนี้แก้ไขได้ทั้งหมด") }}</span>
                                        </div>
                                        <code>{{ block.type }}</code>
                                    </header>

                                    <VariableTextarea
                                        v-if="block.type === 'text'"
                                        v-model="block.content"
                                        :aria-label="text('Content', 'ข้อความ')"
                                        :rows="4"
                                        :placeholder="text('Content supports Markdown and variables', 'ข้อความรองรับ Markdown และตัวแปร')"
                                        :suggestions="autocompleteSuggestions"
                                    />
                                    <div v-if="block.type === 'text' && selected.availableVars.length" :class="$style.vars">
                                        <span :class="$style.varsLabel">{{ text("Insert variable:", "แทรกตัวแปร:") }}</span>
                                        <button v-for="variable in selected.availableVars" :key="variable" type="button" :class="$style.varChip" @click="insertBlockVar(block, variable)">
                                            {{ varToken(variable) }}
                                        </button>
                                    </div>

                                    <template v-else-if="block.type === 'section'">
                                        <VariableTextarea v-model="block.content" :label="text('Section content', 'ข้อความ Section')" :rows="3" :placeholder="text('Type {{ to browse variables', 'พิมพ์ {{ เพื่อเลือกตัวแปร')" :suggestions="autocompleteSuggestions" />
                                        <VariableTextarea v-model="block.accessoryUrl" compact :rows="1" :label="text('Thumbnail URL', 'ลิงก์รูปย่อ')" placeholder="https:// or {{avatar_url}}" :suggestions="autocompleteSuggestions" />
                                        <div v-if="selected.availableVars.length" :class="$style.vars">
                                            <span :class="$style.varsLabel">{{ text("Insert variable:", "แทรกตัวแปร:") }}</span>
                                            <button v-for="variable in selected.availableVars" :key="variable" type="button" :class="$style.varChip" @click="insertBlockVar(block, variable)">{{ varToken(variable) }}</button>
                                        </div>
                                    </template>

                                    <template v-else-if="block.type === 'separator'">
                                        <div :class="$style.segmentedControl">
                                            <button type="button" :class="block.spacing === 1 ? $style.segmentActive : ''" @click="block.spacing = 1">{{ text("Small", "เล็ก") }}</button>
                                            <button type="button" :class="block.spacing === 2 ? $style.segmentActive : ''" @click="block.spacing = 2">{{ text("Large", "ใหญ่") }}</button>
                                        </div>
                                        <label :class="$style.inlineToggle">
                                            <CheckboxInput v-model="block.divider" size="m" :aria-label="`Show divider for block ${blockIndex + 1}`" />
                                            <span>{{ text("Divider line", "เส้นคั่น") }}</span>
                                        </label>
                                    </template>

                                    <template v-else-if="block.type === 'media'">
                                        <VariableTextarea v-model="block.url" compact :rows="1" :label="text('Media URL', 'ลิงก์สื่อ')" placeholder="https:// or {{qr_image}}" :suggestions="autocompleteSuggestions" />
                                        <div :class="$style.grid2">
                                            <VariableTextarea v-model="block.description" single-line :label="text('Description', 'รายละเอียด')" :placeholder="text('Image description', 'คำอธิบายรูปภาพ')" :suggestions="autocompleteSuggestions" />
                                            <label :class="$style.inlineToggle">
                                                <CheckboxInput v-model="block.spoiler" size="m" :aria-label="`Mark media block ${blockIndex + 1} as spoiler`" />
                                                <span>{{ text("Spoiler", "สปอยเลอร์") }}</span>
                                            </label>
                                        </div>
                                    </template>

                                    <div v-else-if="block.type === 'row' && block.rowKey" :class="$style.lockedRow">
                                        <span :class="$style.lockedNotice">🔒 {{ text("Required row · only the button label, emoji, and color can be edited.", "Row ที่จำเป็น · แก้ไขได้เฉพาะข้อความปุ่ม emoji และสี") }}</span>
                                        <div v-for="role in rolesForRow(block.rowKey)" :key="role.key" :class="$style.rowControl">
                                            <div :class="$style.grid2">
                                                <VariableTextarea v-model="componentConfig(role.key).label" single-line :label="text('Button label', 'ข้อความปุ่ม')" :placeholder="role.fallback" :suggestions="autocompleteSuggestions" />
                                                <TextField v-model="componentConfig(role.key).emoji" label="Emoji" placeholder="😀 or <:name:id>" />
                                            </div>
                                            <SelectField
                                                v-if="role.type === 'button'"
                                                v-model="componentConfig(role.key).style"
                                                :label="text('Button color', 'สีปุ่ม')"
                                                :options="BUTTON_STYLES"
                                                :placeholder="text('Default', 'ค่าเริ่มต้น')"
                                            />
                                        </div>
                                    </div>

                                    <div v-if="block.type === 'row'" :class="$style.customRowEditor">
                                        <span v-if="block.rowKey" :class="$style.lockedNotice">{{ text("Optional link buttons can be added without changing the required actions above.", "เพิ่มปุ่มลิงก์เสริมได้โดยไม่กระทบ Action ที่จำเป็นด้านบน") }}</span>
                                        <div v-for="(button, buttonIndex) in block.buttons ?? []" :key="button.id" :class="$style.linkButtonEditor">
                                            <header>
                                                <strong>{{ text("Link button", "ปุ่มลิงก์") }} {{ buttonIndex + 1 }}</strong>
                                                <SecondaryButton width-mode="hug" :leading-icon="icons.delete" @click="removeLinkButton(block, buttonIndex)">{{ text("Delete", "ลบ") }}</SecondaryButton>
                                            </header>
                                            <div :class="$style.grid2">
                                                <VariableTextarea v-model="button.label" single-line :label="text('Button label', 'ข้อความปุ่ม')" :placeholder="text('Open link', 'เปิดลิงก์')" :suggestions="autocompleteSuggestions" />
                                                <TextField v-model="button.emoji" label="Emoji" placeholder="🔗 or <:name:id>" />
                                            </div>
                                            <VariableTextarea v-model="button.url" single-line :label="text('Link URL', 'ลิงก์ URL')" placeholder="https://example.com" :suggestions="autocompleteSuggestions" />
                                        </div>
                                        <SecondaryButton v-if="(block.buttons?.length ?? 0) < maxLinkButtons(block)" width-mode="hug" :leading-icon="icons.add" @click="addLinkButton(block)">{{ text("Add link button", "เพิ่มปุ่มลิงก์") }}</SecondaryButton>
                                        <span v-else :class="$style.lockedNotice">{{ text("This row has reached Discord's 5-button limit.", "Row นี้มีปุ่มครบขีดจำกัด 5 ปุ่มของ Discord แล้ว") }}</span>
                                    </div>

                                    <footer :class="$style.blockActions">
                                        <ActionButton action="scroll-top" :aria-label="`Move block ${blockIndex + 1} up`" :disabled="blockIndex === 0" @click="moveComponentBlock(blockIndex, -1)" />
                                        <ActionButton action="scroll-bottom" :aria-label="`Move block ${blockIndex + 1} down`" :disabled="blockIndex === componentLayout.length - 1" @click="moveComponentBlock(blockIndex, 1)" />
                                        <template v-if="!isFixedRow(block)">
                                            <SecondaryButton width-mode="hug" @click="duplicateComponentBlock(blockIndex)">{{ text("Duplicate", "ทำซ้ำ") }}</SecondaryButton>
                                            <SecondaryButton width-mode="hug" :leading-icon="icons.delete" @click="removeComponentBlock(blockIndex)">{{ text("Delete", "ลบ") }}</SecondaryButton>
                                        </template>
                                        <span v-else :class="$style.fixedTag">{{ text("Fixed Row", "Row แบบกำหนดไว้") }}</span>
                                    </footer>
                                </article>
                            </div>

                            <div :class="$style.addBlockBar">
                                <span>{{ text("Add component", "เพิ่ม Component") }}</span>
                                <div>
                                    <SecondaryButton width-mode="hug" :leading-icon="icons.add" @click="addComponentBlock('text')">{{ text("Content", "ข้อความ") }}</SecondaryButton>
                                    <SecondaryButton width-mode="hug" :leading-icon="icons.add" @click="addComponentBlock('section')">{{ text("Section", "Section") }}</SecondaryButton>
                                    <SecondaryButton width-mode="hug" :leading-icon="icons.add" @click="addComponentBlock('media')">{{ text("Media", "สื่อ") }}</SecondaryButton>
                                    <SecondaryButton width-mode="hug" :leading-icon="icons.add" @click="addComponentBlock('separator')">{{ text("Separator", "เส้นคั่น") }}</SecondaryButton>
                                    <SecondaryButton width-mode="hug" :leading-icon="icons.add" @click="addComponentBlock('row')">{{ text("Link row", "Row ปุ่มลิงก์") }}</SecondaryButton>
                                </div>
                            </div>
                        </section>

                        <section v-else :class="$style.componentGroup">
                            <header :class="$style.componentGroupHead">
                                <div>
                                    <span :class="$style.componentStep">01</span>
                                    <div>
                                        <h3>{{ text("Buttons and menus", "ปุ่มและเมนู") }}</h3>
                                        <p>{{ text("This feature still uses the legacy Row editor.", "ฟีเจอร์นี้ยังใช้ Row editor แบบเดิม") }}</p>
                                    </div>
                                </div>
                            </header>
                            <div :class="$style.componentBlockList">
                                <article v-for="role in roles" :key="role.key" :class="$style.componentEditCard">
                                    <header :class="$style.componentEditHead">
                                        <span :class="$style.controlType">{{ role.type }}</span>
                                        <div><strong>{{ role.label }}</strong><span>{{ text("Configure the text shown to users", "ตั้งค่าข้อความที่ผู้ใช้จะเห็น") }}</span></div>
                                        <code>{{ role.key }}</code>
                                    </header>
                                    <div :class="$style.grid2">
                                        <TextField
                                            v-if="role.type !== 'select'"
                                            v-model="componentConfig(role.key).label"
                                            :label="text('Text', 'ข้อความ')"
                                            :placeholder="role.fallback"
                                        />
                                        <TextField v-model="componentConfig(role.key).emoji" label="Emoji" placeholder="😀" />
                                    </div>
                                </article>
                            </div>
                        </section>
                    </template>

                    <div :class="$style.saveActions">
                        <SecondaryButton v-if="selected.overridden" width-mode="fill" :disabled="isSaving" @click="confirmResetToDefault">
                            {{ text("Restore latest template", "คืนค่า Template ล่าสุด") }}
                        </SecondaryButton>
                        <PrimaryButton width-mode="fill" :leading-icon="icons.save" :disabled="isSaving" @click="confirmSave">
                            {{ isSaving ? text("Saving…", "กำลังบันทึก…") : mode === "components" ? text("Save Components", "บันทึก Components") : text("Save Embed", "บันทึก Embed") }}
                        </PrimaryButton>
                    </div>
                </div>

                <div :class="$style.previewCol">
                    <div v-if="mode === 'components'" :class="$style.previewTitleRow">
                        <div>
                            <strong>{{ text("Discord Preview", "ตัวอย่าง Discord") }}</strong>
                            <span>{{ text("Updates instantly as you edit.", "อัปเดตทันทีเมื่อแก้ไข") }}</span>
                        </div>
                        <span :class="$style.liveBadge">{{ text("LIVE", "สด") }}</span>
                    </div>
                    <span v-else :class="$style.previewLabel" class="type-body-small-r">{{ text("Preview", "ตัวอย่าง") }}</span>
                    <DiscordComponentsV2Preview
                        v-if="mode === 'components'"
                        :slot-key="selectedKey"
                        :config="previewComponentsV2"
                        :components="draft.components"
                        :bot-name="botName"
                        :bot-avatar-url="botAvatarUrl"
                    />
                    <DiscordEmbedPreview v-else :embed="draft" :slot-key="selectedKey" :config-values="effectiveConfigValues" />
                    <p v-if="mode === 'embed'" :class="$style.previewHint" class="type-body-small-r">
                        {{ text("Paste a Discord server custom emoji as", "วาง custom emoji จากเซิร์ฟเวอร์ Discord ในรูปแบบ") }} <code>&lt;:name:id&gt;</code>
                    </p>
                </div>
            </div>
        </div>

        <ConfirmModal
            v-if="confirmation"
            :title="confirmation.title"
            :reason="confirmation.reason"
            :confirm-label="confirmation.confirmLabel"
            :variant="confirmation.variant"
            :disabled="confirmationBusy"
            @cancel="confirmation = null"
            @confirm="runConfirmedAction"
        />
    </div>
</template>

<style module>
.state { color: var(--color-text-primary); }
.statePanel { padding: var(--spacing-space-5); border: 1px solid var(--color-main-border); border-radius: var(--radius-lg); }
.stateText { color: var(--color-text-primary); margin: 0 0 var(--spacing-space-3); }
.retryButton { height: 38px; padding: 0 var(--spacing-space-4); border: 0; border-radius: var(--radius-full); background: var(--color-button-primary-btn-bg); color: var(--color-button-primary-btn-text-active); cursor: pointer; }

.layout { display: grid; grid-template-columns: 220px 1fr; gap: var(--spacing-space-5); align-items: start; }

.slotList { display: flex; flex-direction: column; gap: 4px; }
.slotStack { display: flex; flex-direction: column; gap: var(--spacing-space-2); }
.slotScroller { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-space-2); }
.slotScroller .slotItem { min-width: 0; }
.slotListHead { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-space-2); padding: 0 var(--spacing-space-1) var(--spacing-space-2); color: var(--color-text-primary); font-size: 12px; }
.slotListHead span { color: var(--color-text-secondary); font-size: 11px; white-space: nowrap; }
.slotNumber { display: inline-flex; width: 28px; height: 28px; flex: 0 0 28px; align-items: center; justify-content: center; border-radius: var(--radius-full); background: color-mix(in srgb, var(--color-text-primary) 10%, transparent); font-size: 11px; font-weight: 700; }
.slotItem { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border: 1px solid var(--color-main-divider); border-radius: var(--radius-lg); background: var(--color-main-background); color: var(--color-text-primary); font-size: 14px; cursor: pointer; text-align: left; }
.slotItem:hover { border-color: var(--color-input-border-hover); }
.slotActive { border-color: var(--color-text-primary); background: var(--color-main-background); color: var(--color-text-primary); box-shadow: inset 4px 0 0 var(--color-text-primary); }
.slotMeta { display: inline-flex; flex-shrink: 0; align-items: center; gap: var(--spacing-space-2); }
.slotLabel { min-width: 0; }
.slotCopy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.slotDescription { color: var(--color-text-secondary); font-size: 11px; font-weight: 400; }
.selectedState { color: var(--color-text-primary); font-size: 12px; font-weight: 600; white-space: nowrap; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-main-primary); flex-shrink: 0; }

.editor { display: grid; grid-template-columns: 1fr 460px; gap: var(--spacing-space-5); align-items: start; }
.formCol { display: flex; flex-direction: column; gap: var(--spacing-space-3); min-width: 0; }
.slotDesc { margin: 0 0 var(--spacing-space-1); color: var(--color-text-primary); }

.colorField { display: flex; flex-direction: column; gap: var(--spacing-space-2); }
.colorLabel { color: var(--color-text-primary); font-size: 14px; font-weight: 600; }
.colorControls { display: grid; grid-template-columns: minmax(0, 1fr) 48px; gap: var(--spacing-space-2); }
.hexInput { min-width: 0; min-height: 44px; box-sizing: border-box; padding: 0 var(--spacing-space-3); border: 1px solid var(--color-input-border); border-radius: var(--radius-lg); background: var(--color-input-bg); color: var(--color-text-input); font-family: monospace; font-size: 14px; text-transform: uppercase; }
.hexInput:focus { border-color: var(--color-input-border-focus); outline: 2px solid color-mix(in srgb, var(--color-input-border-focus) 24%, transparent); outline-offset: 1px; }
.swatchLabel { position: relative; display: block; min-height: 44px; overflow: hidden; border: 1px solid var(--color-input-border); border-radius: var(--radius-lg); cursor: pointer; }
.colorSwatch { position: absolute; inset: 4px; border-radius: var(--radius-md); }
.nativeColor { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.colorHint { color: var(--color-text-secondary); font-size: 12px; }

.fieldLabel { color: var(--color-text-primary); font-size: 14px; }
.vars { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.varsLabel { color: var(--color-text-primary); font-size: 13px; }
.varChip { padding: 3px 8px; border: 1px solid var(--color-main-border); border-radius: var(--radius-full); background: var(--color-main-background); color: var(--color-text-primary); font-size: 12px; font-family: monospace; cursor: pointer; }
.varChip:hover { border-color: var(--color-main-primary); color: var(--color-text-primary); }

.grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing-space-3); }

.grid2 > * { min-width: 0; }

/* Collapsible sections */
.section { border: 1px solid var(--color-main-divider); border-radius: var(--radius-lg); overflow: hidden; background: var(--color-main-background); }
.sectionHead { display: flex; align-items: center; gap: var(--spacing-space-2); width: 100%; padding: 10px 12px; border: 0; background: var(--color-main-background); color: var(--color-text-primary); font-size: 14px; font-weight: 600; cursor: pointer; text-align: left; }
.sectionHead:hover { background: color-mix(in srgb, var(--color-text-primary) 8%, var(--color-main-background)); }
.chevron { display: inline-block; transition: transform 0.15s ease; color: var(--color-text-primary); font-size: 16px; line-height: 1; }
.chevronOpen { transform: rotate(90deg); }
.sectionBody { display: flex; flex-direction: column; gap: var(--spacing-space-3); padding: var(--spacing-space-3); border-top: 1px solid var(--color-main-border); }

.fieldsHead { display: flex; align-items: center; justify-content: space-between; }
.helperText { color: var(--color-text-primary); font-size: 12px; margin-left: auto; }
.fieldRow { display: flex; flex-direction: column; gap: var(--spacing-space-2); padding: var(--spacing-space-2); border: 1px solid var(--color-main-border); border-radius: var(--radius-lg); }
.fieldInputs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing-space-2); }
.fieldInputs > * { min-width: 0; }
.fieldActions { display: flex; align-items: center; gap: var(--spacing-space-2); flex-wrap: wrap; }
.inlineToggle { display: inline-flex; align-items: center; gap: 4px; color: var(--color-text-primary); font-size: 12px; white-space: nowrap; margin-right: auto; }
.inlineToggle input { accent-color: var(--color-main-primary); }

.componentRow { display: flex; min-width: 0; flex-direction: column; gap: var(--spacing-space-2); padding: var(--spacing-space-3); border: 1px solid var(--color-main-divider); border-radius: var(--radius-lg); background: var(--color-main-background); color: var(--color-text-primary); }
.componentTitle { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-space-2); color: var(--color-text-primary); font-size: 14px; font-weight: 600; }
.componentTitle code { color: var(--color-text-primary); font-family: monospace; font-size: 12px; font-weight: 400; }
.optionalBar { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-space-2); }
.shownTag { font-size: 12px; color: var(--color-status-success); }
.hiddenTag { font-size: 12px; color: var(--color-text-primary); }

.componentsEditor {
    grid-template-columns: minmax(520px, 1fr) minmax(420px, 520px);
    gap: var(--spacing-space-5);
}

.componentsLayout {
    grid-template-columns: minmax(0, 1fr);
}

.componentsLayout .slotItem { min-height: 54px; padding: var(--spacing-space-2) var(--spacing-space-3); }
.componentsLayout .slotCopy { gap: 0; }
.componentsLayout .slotLabel { overflow: hidden; font-size: 13px; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.componentsLayout .slotDescription { display: none; }
.componentsLayout .slotActive { box-shadow: inset 0 -3px 0 var(--color-text-primary); }

.componentGuide {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: color-mix(in srgb, var(--color-main-primary) 5%, var(--color-main-background));
}

.componentGuide h3,
.componentGuide p,
.componentGroupHead h3,
.componentGroupHead p {
    margin: 0;
}

.componentGuide h3 {
    margin-top: var(--spacing-space-1);
    color: var(--color-text-primary);
    font-size: 18px;
}

.componentGuide p,
.componentGroupHead p {
    margin-top: var(--spacing-space-1);
    color: var(--color-text-secondary);
    font-size: 12px;
}

.componentEyebrow {
    color: var(--color-main-primary);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
}

.componentCount {
    display: flex;
    min-width: 60px;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-space-2);
    border-radius: var(--radius-lg);
    background: var(--color-main-background);
    color: var(--color-text-secondary);
    font-size: 11px;
}

.componentCount strong {
    color: var(--color-text-primary);
    font-size: 20px;
}

.componentGroup {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
}

.saveActions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--spacing-space-3);
}

.variableGuide {
    border-top: 1px solid var(--color-input-border);
    border-bottom: 1px solid var(--color-input-border);
}

.variableGuide summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-4) 0;
    color: var(--color-text-primary);
    cursor: pointer;
    list-style: none;
}

.variableGuide summary::-webkit-details-marker { display: none; }
.variableGuide summary > span:first-child { display: flex; min-width: 0; flex-direction: column; gap: 3px; }
.variableGuide summary small { color: var(--color-text-secondary); font-size: 11px; font-weight: 400; }
.variableGuide summary > span:last-child { display: inline-flex; min-width: 28px; height: 28px; align-items: center; justify-content: center; border-radius: var(--radius-full); background: var(--color-main-background); color: var(--color-text-secondary); font-size: 11px; }
.variableGuideBody { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(220px, .65fr); gap: var(--spacing-space-5); padding: 0 0 var(--spacing-space-4); }
.variableGuideBody h4 { margin: 0 0 var(--spacing-space-3); color: var(--color-text-primary); font-size: 13px; }
.variableReference { display: flex; flex-direction: column; gap: 2px; }
.variableReference > div { display: grid; grid-template-columns: minmax(140px, auto) 1fr auto; align-items: center; gap: var(--spacing-space-3); padding: 8px 10px; border-radius: var(--radius-md); color: var(--color-text-secondary); font-size: 11px; }
.variableReference > div:hover { background: rgb(127 127 127 / 8%); }
.variableReference code { color: var(--color-text-primary); font-size: 11px; font-weight: 700; }
.variableReference small { color: var(--color-status-success); font-size: 10px; }
.variableAvailable { background: rgb(52 199 89 / 7%); }

.componentGroupHead {
    padding: var(--spacing-space-2) 0;
}

.componentGroupHead > div {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-space-3);
}

.componentStep {
    display: inline-flex;
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-full);
    background: var(--color-text-primary);
    color: var(--color-main-background);
    font-size: 11px;
    font-weight: 700;
}

.componentGroupHead h3 {
    color: var(--color-text-primary);
    font-size: 16px;
}

.componentBlockList {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
}

.containerSettings {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.componentEditCard {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.componentEditCard:focus-within {
    border-color: var(--color-input-border-focus);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-input-border-focus) 14%, transparent);
}

.componentEditHead {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--spacing-space-3);
}

.componentEditHead > div {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
}

.componentEditHead strong {
    color: var(--color-text-primary);
    font-size: 14px;
}

.componentEditHead span:not(.blockNumber, .controlType) {
    color: var(--color-text-secondary);
    font-size: 11px;
}

.componentEditHead code {
    color: var(--color-text-secondary);
    font-size: 10px;
}

.blockNumber,
.controlType {
    display: inline-flex;
    min-width: 28px;
    min-height: 28px;
    box-sizing: border-box;
    align-items: center;
    justify-content: center;
    padding: 0 var(--spacing-space-2);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-text-primary) 10%, transparent);
    color: var(--color-text-primary);
    font-size: 11px;
    font-weight: 700;
}

.segmentedControl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 3px;
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-text-primary) 8%, var(--color-main-background));
}

.segmentedControl button {
    min-height: 34px;
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
}

.segmentedControl .segmentActive {
    background: var(--color-button-primary-btn-bg);
    color: var(--color-main-brand-primary);
}

.lockedRow {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-text-primary) 5%, var(--color-main-background));
}

.lockedNotice {
    color: var(--color-text-secondary);
    font-size: 11px;
}

.rowControl {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
    padding-top: var(--spacing-space-3);
    border-top: 1px solid var(--color-main-divider);
}

.blockActions {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-2);
    padding-top: var(--spacing-space-2);
    border-top: 1px solid var(--color-main-divider);
}

.fixedTag {
    margin-left: auto;
    padding: 3px 8px;
    border-radius: var(--radius-full);
    background: color-mix(in srgb, var(--color-status-info) 12%, transparent);
    color: var(--color-status-info);
    font-size: 10px;
    font-weight: 700;
}

.addBlockBar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-4);
    border: 1px dashed var(--color-input-border);
    border-radius: var(--radius-xl);
    color: var(--color-text-primary);
    font-size: 13px;
    font-weight: 600;
}

.addBlockBar > div {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-space-2);
}

@media (max-width: 700px) { .fieldInputs { grid-template-columns: 1fr; } }

.previewCol { position: sticky; top: var(--spacing-space-4); display: flex; flex-direction: column; gap: var(--spacing-space-2); }
.previewLabel { color: var(--color-text-primary); }
.previewTitleRow { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-space-3); padding-bottom: var(--spacing-space-2); }
.previewTitleRow > div { display: flex; flex-direction: column; gap: 2px; }
.previewTitleRow strong { color: var(--color-text-primary); font-size: 14px; }
.previewTitleRow span:not(.liveBadge) { color: var(--color-text-secondary); font-size: 11px; }
.liveBadge { padding: 3px 7px; border-radius: var(--radius-full); background: color-mix(in srgb, var(--color-status-success) 14%, transparent); color: var(--color-status-success); font-size: 10px; font-weight: 700; }
.previewHint { margin: 0; color: var(--color-text-primary); }
.previewHint code { background: color-mix(in srgb, var(--color-text-primary) 12%, transparent); padding: 0 4px; border-radius: 4px; }
.previewTabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing-space-2); }
.previewTab, .previewTabActive { min-height: 36px; border: 1px solid var(--color-input-border); border-radius: var(--radius-md); background: var(--color-main-background); color: var(--color-text-primary); font-weight: 600; }
.previewTabActive { border-color: var(--color-text-primary); box-shadow: inset 0 -2px 0 var(--color-text-primary); }

@media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
    .editor { grid-template-columns: 1fr; }
    .previewCol { position: static; }
    .variableGuideBody { grid-template-columns: 1fr; }
}

.state {
    margin: 0;
    color: var(--color-text-primary);
}

.statePanel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-5);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.stateText {
    color: var(--color-text-primary);
}

.layout {
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
}

.slotList {
    gap: var(--spacing-space-2);
}

.slotItem {
    min-height: 48px;
    border-color: var(--color-input-border);
    border-radius: var(--radius-xl);
    color: var(--color-text-primary);
    font-weight: 600;
}

.slotItem:hover {
    border-color: var(--color-main-divider);
}

.slotActive {
    border-color: var(--color-text-primary);
    background: var(--color-main-background);
    color: var(--color-text-primary);
    border-width: 2px;
    box-shadow: inset 4px 0 0 var(--color-text-primary);
}

.dot {
    background: var(--color-text-primary);
}

.editor {
    grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
}

.slotDesc {
    color: var(--color-text-primary);
}

.section,
.fieldRow,
.componentRow {
    border-color: var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.sectionHead {
    min-height: 46px;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    color: var(--color-text-primary);
}

.sectionHead:hover {
    background: color-mix(in srgb, var(--color-text-primary) 8%, var(--color-main-background));
}

.sectionBody {
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-4);
    border-top-color: var(--color-main-divider);
}

.fieldLabel,
.colorLabel,
.varsLabel,
.helperText,
.inlineToggle,
.previewLabel,
.previewHint,
.hiddenTag {
    color: var(--color-text-primary);
}

.varChip {
    border-color: var(--color-input-border);
    color: var(--color-text-primary);
}

.fieldRow {
    padding: var(--spacing-space-3);
}

.componentTitle code {
    color: var(--color-text-primary);
}

.previewCol {
    top: calc(73px + var(--spacing-space-4));
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
}

@media (max-width: 1080px) {
    .layout,
    .editor {
        grid-template-columns: 1fr;
    }

    .previewCol {
        position: static;
    }
}

@media (max-width: 700px) {
    .containerSettings {
        grid-template-columns: 1fr;
    }

    .addBlockBar,
    .blockActions {
        align-items: stretch;
        flex-direction: column;
    }

    .fixedTag {
        margin-left: 0;
    }
}

@media (max-width: 1320px) {
    .componentsEditor {
        grid-template-columns: 1fr;
    }

    .componentsEditor .previewCol {
        position: static;
    }
}

/* Component setting is a two-level workspace: event navigation spans the full
   row, followed by the builder and its preview. Keep this after the shared
   layout rules so the normal Embed editor's sidebar cannot override it. */
.layout.componentsLayout {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--spacing-space-6);
}

.componentsLayout .slotScroller {
    grid-template-columns: repeat(5, minmax(0, 1fr));
}

.componentsLayout .slotItem {
    border-color: transparent;
    background: color-mix(in srgb, var(--color-text-primary) 5%, var(--color-main-background));
    box-shadow: none;
}

.componentsLayout .slotItem:hover {
    border-color: var(--color-main-divider);
}

.componentsLayout .slotActive {
    border-color: var(--color-text-primary);
    background: var(--color-main-background);
    box-shadow: inset 0 -3px 0 var(--color-text-primary);
}

.componentsEditor .componentGuide {
    padding: 0 0 var(--spacing-space-5);
    border: 0;
    border-radius: 0;
    background: transparent;
}

.componentsEditor .containerSettings {
    padding: 0 0 var(--spacing-space-6);
    border: 0;
    border-bottom: 1px solid var(--color-main-divider);
    border-radius: 0;
    background: transparent;
}

.componentColorPicker {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.componentColorPicker > label {
    color: var(--color-text-primary);
    font-size: 14px;
    font-weight: 600;
}

.componentColorPicker > div {
    display: grid;
    grid-template-columns: 52px minmax(150px, 1fr) auto;
    align-items: end;
    gap: var(--spacing-space-2);
}

.componentColorPicker input[type="color"] {
    width: 52px;
    height: 44px;
    box-sizing: border-box;
    padding: 4px;
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    background: var(--color-input-bg);
    cursor: pointer;
}

.customRowEditor,
.linkButtonEditor {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
}

.linkButtonEditor {
    padding: var(--spacing-space-3);
    border-left: 3px solid var(--color-main-divider);
    background: color-mix(in srgb, var(--color-text-primary) 3%, transparent);
}

.linkButtonEditor > header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-space-3);
    color: var(--color-text-primary);
}

.componentsEditor .componentEditCard {
    border-color: transparent;
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-text-primary) 4%, var(--color-main-background));
    transition: border-color 120ms ease, background 120ms ease;
}

.componentsEditor .componentEditCard:hover {
    border-color: var(--color-main-divider);
}

.componentsEditor .componentEditCard:focus-within {
    border-color: var(--color-input-border-focus);
    background: var(--color-main-background);
}

.componentsEditor .addBlockBar {
    border: 0;
    background: color-mix(in srgb, var(--color-text-primary) 5%, var(--color-main-background));
}

.componentsEditor .previewCol {
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
}

@media (max-width: 1280px) {
    .componentsLayout .slotScroller {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 700px) {
    .componentsLayout .slotScroller {
        grid-template-columns: 1fr;
    }

    .componentColorPicker > div {
        grid-template-columns: 52px minmax(0, 1fr);
    }

    .componentColorPicker > div > :last-child {
        grid-column: 1 / -1;
    }
}
</style>
