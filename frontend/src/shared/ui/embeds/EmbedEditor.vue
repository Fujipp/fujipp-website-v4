<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import DiscordEmbedPreview, { SLOT_ROLES } from "./DiscordEmbedPreview.vue";
import DiscordComponentsV2Preview from "./DiscordComponentsV2Preview.vue";
import type { EmbedObject, ComponentConfig, PreviewRole } from "./DiscordEmbedPreview.vue";
import { VARIABLE_SUGGESTIONS, WALLET_COMPONENT_V2_FIELDS } from "./discordMessage";
import { DateField, SelectField, TextareaField, TextField } from "@/shared/ui/fields";
import { ActionButton, PrimaryButton, SecondaryButton } from "@/shared/ui/buttons";
import { CheckboxInput } from "@/shared/ui/inputs";
import { StatusToast } from "@/shared/ui/toasts";
import { ConfirmModal } from "@/shared/ui/modals";
import { API_BASE_URL, icons } from "@/config";
import { useUserStore } from "@/stores";
import { supabase } from "@/shared/lib/supabase";

/**
 * Reusable Discord embed editor. Drives the per-bot embed slots over a configurable
 * API base path so both the shop ("/api/bots") and admin ("/api/admin/bots") reuse it.
 */
const props = withDefaults(
    defineProps<{
        botId: string;
        basePath?: string;
        featureCode?: string;
        previewConfigValues?: Record<string, string>;
    }>(),
    { basePath: "/api/bots", featureCode: "", previewConfigValues: () => ({}) },
);

type ToastStatus = "info" | "success" | "warning" | "error";

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

const slots = ref<EmbedSlot[]>([]);
// The bot's saved config values — used to mock the preview realistically (e.g. how
// many Roblox groups / which packages to show), so editing reflects the real setup.
const configValues = ref<Record<string, string>>({});
const selectedKey = ref("");
const draft = ref<EmbedObject | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const loadError = ref("");
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);
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
const v2Fields = computed(() => WALLET_COMPONENT_V2_FIELDS[selectedKey.value] ?? []);
const isWalletSlot = computed(() => selected.value?.featureCode === "wallet-topup");
const previewMode = ref<"embed" | "components">("embed");

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
    toast.value = { status, title, description };
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
    }
    return embed;
}

function v2Text(key: string): string {
    if (!draft.value) return "";
    draft.value.componentsV2 = draft.value.componentsV2 ?? {};
    draft.value.componentsV2.texts = draft.value.componentsV2.texts ?? {};
    return draft.value.componentsV2.texts[key] ?? "";
}

function setV2Text(key: string, value: string): void {
    if (!draft.value) return;
    draft.value.componentsV2 = draft.value.componentsV2 ?? {};
    draft.value.componentsV2.texts = draft.value.componentsV2.texts ?? {};
    draft.value.componentsV2.texts[key] = value;
}

function variablesFor(fieldDescription: string): string[] {
    return Object.keys(VARIABLE_SUGGESTIONS).filter((key) => fieldDescription.includes(`{{${key}}}`));
}

function insertV2Var(fieldKey: string, variable: string): void {
    setV2Text(fieldKey, `${v2Text(fieldKey)}{{${variable}}}`);
}

function selectSlot(key: string): void {
    selectedKey.value = key;
    const slot = slots.value.find((s) => s.slotKey === key);
    draft.value = slot ? ensureComponentRoles(normalize(slot.embed), key) : null;
    previewMode.value = slot?.featureCode === "wallet-topup"
        && effectiveConfigValues.value.TOPUP_DISPLAY_MODE === "COMPONENTS_V2" ? "components" : "embed";
}

const colorHex = computed<string>({
    get: () => `#${((draft.value?.color ?? 0) & 0xffffff).toString(16).padStart(6, "0")}`,
    set: (hex) => { if (draft.value) draft.value.color = Number.parseInt(hex.slice(1), 16) || 0; },
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
    notify("success", "Field removed");
}

function confirmRemoveField(index: number): void {
    requestConfirmation(
        "Remove field?",
        `Field ${index + 1} will be removed from this Embed draft.`,
        "Remove",
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
    notify("success", "Button removed", "Save Embed to apply this change to the bot.");
}

function confirmRemoveComponent(roleKey: string, roleLabel: string): void {
    requestConfirmation(
        "Remove button?",
        `${roleLabel} will be hidden from this Embed.`,
        "Remove button",
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
        const first = slots.value[0];
        if (first) selectSlot(first.slotKey);
        else { selectedKey.value = ""; draft.value = null; }
    } catch (e) {
        slots.value = [];
        loadError.value = `โหลด Embed ไม่สำเร็จ: ${(e as Error).message || "กรุณาลองใหม่อีกครั้ง"}`;
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
        notify("success", "บันทึกรูปแบบข้อความแล้ว");
    } catch {
        notify("error", "บันทึกไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    } finally {
        isSaving.value = false;
    }
}

function confirmSave(): void {
    requestConfirmation(
        "บันทึกรูปแบบข้อความ?",
        `บันทึกทั้ง Embed และ Components ของ ${selected.value?.label || "รายการนี้"}?`,
        "บันทึก",
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
</script>

<template>
    <div>
        <p v-if="isLoading" :class="$style.state" class="type-body-small-r">กำลังโหลด…</p>
        <section v-else-if="loadError" :class="$style.statePanel">
            <p :class="$style.stateText">{{ loadError }}</p>
            <PrimaryButton width-mode="hug" :leading-icon="icons.restart" @click="loadSlots">Retry</PrimaryButton>
        </section>

        <div v-else :class="$style.layout">
            <!-- slot list -->
            <nav :class="$style.slotList">
                <button
                    v-for="slot in slots"
                    :key="slot.slotKey"
                    type="button"
                    :aria-pressed="slot.slotKey === selectedKey"
                    :class="[$style.slotItem, slot.slotKey === selectedKey ? $style.slotActive : '']"
                    @click="selectSlot(slot.slotKey)"
                >
                    <span :class="$style.slotLabel">{{ slot.label }}</span>
                    <span :class="$style.slotMeta">
                        <span v-if="slot.slotKey === selectedKey" :class="$style.selectedState" aria-hidden="true">✓ Selected</span>
                        <span v-if="slot.overridden" :class="$style.dot" title="Edited" />
                    </span>
                </button>
                <p v-if="slots.length === 0" :class="$style.state" class="type-body-small-r">ไม่มี embed slot</p>
            </nav>

            <!-- editor + preview -->
            <div v-if="draft && selected" :class="$style.editor">
                <div :class="$style.formCol">
                    <p :class="$style.slotDesc" class="type-body-small-r">{{ selected.description }}</p>

                    <!-- ── Body ── -->
                    <section :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('body')">
                            <span :class="[$style.chevron, openSections.body ? $style.chevronOpen : '']">›</span>
                            <span>Body</span>
                        </button>
                        <div v-show="openSections.body" :class="$style.sectionBody">
                            <template v-if="supportsContent">
                                <TextareaField
                                    v-model="draft.content"
                                    label="Content"
                                    :rows="2"
                                    placeholder="Text above the embed — use {{member}} to mention the member"
                                />
                            </template>

                            <label :class="$style.colorRow">
                                <span>สี</span>
                                <input v-model="colorHex" type="color" :class="$style.colorInput" />
                            </label>

                            <TextField v-model="draft.title" label="หัวข้อ (title)" placeholder="ใส่ข้อความ + emoji ได้" />
                            <TextField v-model="draft.url" label="ลิงก์หัวข้อ (title url)" placeholder="https:// (กดหัวข้อแล้วเปิดลิงก์)" />

                            <TextareaField
                                v-model="draft.description"
                                label="Description"
                                :rows="5"
                                placeholder="Supports Markdown, variables, and custom emoji"
                            />

                            <div v-if="selected.availableVars.length" :class="$style.vars">
                                <span :class="$style.varsLabel">ตัวแปร:</span>
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
                    <section :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('author')">
                            <span :class="[$style.chevron, openSections.author ? $style.chevronOpen : '']">›</span>
                            <span>Author</span>
                        </button>
                        <div v-show="openSections.author" :class="$style.sectionBody">
                            <TextField v-model="draft.author!.name" label="ชื่อผู้เขียน" placeholder="(ไม่บังคับ)" />
                            <div :class="$style.grid2">
                                <TextField v-model="draft.author!.url" label="ลิงก์ผู้เขียน (author url)" placeholder="https://" />
                                <TextField v-model="draft.author!.icon_url" label="ไอคอนผู้เขียน (icon url)" placeholder="https://" />
                            </div>
                        </div>
                    </section>

                    <!-- ── Images ── -->
                    <section :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('images')">
                            <span :class="[$style.chevron, openSections.images ? $style.chevronOpen : '']">›</span>
                            <span>Images</span>
                        </button>
                        <div v-show="openSections.images" :class="$style.sectionBody">
                            <div :class="$style.grid2">
                                <TextField v-model="draft.image!.url" label="รูปใหญ่ (image url)" placeholder="https://" />
                                <TextField v-model="draft.thumbnail!.url" label="รูปย่อ (thumbnail url)" placeholder="https://" />
                            </div>
                        </div>
                    </section>

                    <!-- ── Fields ── -->
                    <section :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('fields')">
                            <span :class="[$style.chevron, openSections.fields ? $style.chevronOpen : '']">›</span>
                            <span>Fields</span>
                        </button>
                        <div v-show="openSections.fields" :class="$style.sectionBody">
                            <div :class="$style.fieldsHead">
                                <span :class="$style.helperText">{{ (draft.fields ?? []).length }} ช่อง</span>
                                <PrimaryButton width-mode="hug" :leading-icon="icons.add" @click="addField">Add field</PrimaryButton>
                            </div>
                            <div v-for="(f, i) in draft.fields ?? []" :key="i" :class="$style.fieldRow">
                                <div :class="$style.fieldInputs">
                                    <TextField v-model="f.name" label="ชื่อช่อง" placeholder="ชื่อ + emoji" />
                                    <TextField v-model="f.value" label="ค่า" placeholder="รองรับ markdown + ตัวแปร" />
                                </div>
                                <div :class="$style.fieldActions">
                                    <label :class="$style.inlineToggle">
                                        <CheckboxInput v-model="f.inline" size="m" :aria-label="`Display field ${i + 1} inline`" />
                                        <span>Inline</span>
                                    </label>
                                    <ActionButton action="scroll-top" aria-label="Move field up" :disabled="i === 0" @click="moveField(i, -1)" />
                                    <ActionButton action="scroll-bottom" aria-label="Move field down" :disabled="i === (draft.fields?.length ?? 0) - 1" @click="moveField(i, 1)" />
                                    <SecondaryButton width-mode="hug" @click="duplicateField(i)">Duplicate</SecondaryButton>
                                    <SecondaryButton width-mode="hug" :leading-icon="icons.delete" @click="confirmRemoveField(i)">Remove</SecondaryButton>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- ── Footer ── -->
                    <section :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('footer')">
                            <span :class="[$style.chevron, openSections.footer ? $style.chevronOpen : '']">›</span>
                            <span>Footer</span>
                        </button>
                        <div v-show="openSections.footer" :class="$style.sectionBody">
                            <div :class="$style.grid2">
                                <TextField v-model="draft.footer!.text" label="ข้อความท้าย" placeholder="(ไม่บังคับ)" />
                                <TextField v-model="draft.footer!.icon_url" label="ไอคอนท้าย (icon url)" placeholder="https://" />
                            </div>
                            <div :class="$style.grid2">
                                <DateField v-model="tsDate" label="Timestamp date" />
                                <TextField v-model="tsTime" label="Timestamp time" type="time" />
                            </div>
                        </div>
                    </section>

                    <!-- ── Components ── -->
                    <section v-if="v2Fields.length" :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('components')">
                            <span :class="[$style.chevron, openSections.components ? $style.chevronOpen : '']">›</span>
                            <span>Components V2 Content</span>
                            <span :class="$style.helperText">ข้อความและตัวแปรที่ใช้จริง</span>
                        </button>
                        <div v-show="openSections.components" :class="$style.sectionBody">
                            <div v-for="field in v2Fields" :key="field.key" :class="$style.componentRow">
                                <TextareaField
                                    :model-value="v2Text(field.key)"
                                    :label="field.label"
                                    :support-text="field.description"
                                    :rows="field.rows ?? 2"
                                    :placeholder="field.fallback"
                                    @update:model-value="setV2Text(field.key, $event)"
                                />
                                <div v-if="variablesFor(field.description).length" :class="$style.vars">
                                    <span :class="$style.varsLabel">Suggestions:</span>
                                    <button
                                        v-for="variable in variablesFor(field.description)"
                                        :key="variable"
                                        type="button"
                                        :class="$style.varChip"
                                        :title="VARIABLE_SUGGESTIONS[variable]"
                                        @click="insertV2Var(field.key, variable)"
                                    >{{ varToken(variable) }}</button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section v-if="roles.length" :class="$style.section">
                        <button type="button" :class="$style.sectionHead" @click="toggleSection('components')">
                            <span :class="[$style.chevron, openSections.components ? $style.chevronOpen : '']">›</span>
                            <span>Buttons / Dropdown</span>
                            <span :class="$style.helperText">Appearance only · custom_id remains unchanged</span>
                        </button>
                        <div v-show="openSections.components" :class="$style.sectionBody">
                            <div v-for="role in roles" :key="role.key" :class="$style.componentRow">
                                <div :class="$style.componentTitle">
                                    <span>{{ role.label }}</span>
                                    <code>{{ role.key }}</code>
                                </div>
                                <div v-if="role.optional" :class="$style.optionalBar">
                                    <span v-if="roleInUse(role.key)" :class="$style.shownTag">● Visible</span>
                                    <span v-else :class="$style.hiddenTag">○ Hidden — enter a label to show this button</span>
                                    <SecondaryButton
                                        v-if="roleInUse(role.key)"
                                        width-mode="hug"
                                        :leading-icon="icons.delete"
                                        @click="confirmRemoveComponent(role.key, role.label)"
                                    >Remove button</SecondaryButton>
                                </div>

                                <div :class="$style.grid2">
                                    <TextField
                                        v-if="role.type !== 'select'"
                                        v-model="componentConfig(role.key).label"
                                        label="Label"
                                        placeholder="Button label"
                                    />
                                    <TextField v-model="componentConfig(role.key).emoji" label="Emoji" placeholder="😀 or <:name:id>" />
                                </div>

                                <SelectField
                                    v-if="role.type === 'button'"
                                    v-model="componentConfig(role.key).style"
                                    label="Style"
                                    :options="BUTTON_STYLES"
                                    placeholder="Default"
                                />

                                <TextField
                                    v-if="role.type === 'select'"
                                    v-model="componentConfig(role.key).placeholder"
                                    label="Placeholder"
                                    placeholder="Dropdown placeholder"
                                />

                                <template v-if="role.type === 'select'">
                                    <TextField
                                        v-model="componentConfig(role.key).option_label"
                                        label="Option label template"
                                        placeholder="เช่น {{name}} หรือ {{robux}} Robux"
                                        support-text="ค่าของ option และ custom_id ยังคงล็อกไว้"
                                    />
                                    <TextField
                                        v-model="componentConfig(role.key).option_description"
                                        label="Option description template"
                                        placeholder="เช่น คงเหลือ {{stock}}"
                                    />
                                    <div :class="$style.vars">
                                        <span :class="$style.varsLabel">Suggestions:</span>
                                        <span :class="$style.varChip">&#123;&#123;name&#125;&#125;</span>
                                        <span :class="$style.varChip">&#123;&#123;stock&#125;&#125;</span>
                                        <span :class="$style.varChip">&#123;&#123;robux&#125;&#125;</span>
                                        <span :class="$style.varChip">&#123;&#123;price&#125;&#125;</span>
                                    </div>
                                </template>

                                <TextField
                                    v-if="role.type === 'link'"
                                    v-model="componentConfig(role.key).url"
                                    label="URL"
                                    placeholder="https://"
                                />
                            </div>
                        </div>
                    </section>

                    <PrimaryButton width-mode="fill" :leading-icon="icons.save" :disabled="isSaving" @click="confirmSave">
                        {{ isSaving ? "Saving…" : "Save message design" }}
                    </PrimaryButton>
                </div>

                <div :class="$style.previewCol">
                    <span :class="$style.previewLabel" class="type-body-small-r">พรีวิว</span>
                    <div :class="$style.previewTabs" role="tablist" aria-label="Preview mode">
                        <button type="button" :class="previewMode === 'embed' ? $style.previewTabActive : $style.previewTab" @click="previewMode = 'embed'">Embed</button>
                        <button type="button" :disabled="!isWalletSlot" :class="previewMode === 'components' ? $style.previewTabActive : $style.previewTab" @click="previewMode = 'components'">Components V2</button>
                    </div>
                    <DiscordComponentsV2Preview
                        v-if="previewMode === 'components'"
                        :slot-key="selectedKey"
                        :config="draft.componentsV2"
                        :components="draft.components"
                    />
                    <DiscordEmbedPreview v-else :embed="draft" :slot-key="selectedKey" :config-values="effectiveConfigValues" />
                    <p :class="$style.previewHint" class="type-body-small-r">
                        custom emoji วาง <code>&lt;:name:id&gt;</code> จากเซิร์ฟเวอร์ Discord ได้
                    </p>
                </div>
            </div>
        </div>

        <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
            <StatusToast :status="toast.status" :title="toast.title" :description="toast.description" @close="toast = null" />
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
.slotItem { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border: 1px solid var(--color-main-divider); border-radius: var(--radius-lg); background: var(--color-main-background); color: var(--color-text-primary); font-size: 14px; cursor: pointer; text-align: left; }
.slotItem:hover { border-color: var(--color-input-border-hover); }
.slotActive { border-color: var(--color-text-primary); background: var(--color-main-background); color: var(--color-text-primary); box-shadow: inset 4px 0 0 var(--color-text-primary); }
.slotMeta { display: inline-flex; flex-shrink: 0; align-items: center; gap: var(--spacing-space-2); }
.slotLabel { min-width: 0; }
.selectedState { color: var(--color-text-primary); font-size: 12px; font-weight: 600; white-space: nowrap; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-main-primary); flex-shrink: 0; }

.editor { display: grid; grid-template-columns: 1fr 460px; gap: var(--spacing-space-5); align-items: start; }
.formCol { display: flex; flex-direction: column; gap: var(--spacing-space-3); min-width: 0; }
.slotDesc { margin: 0 0 var(--spacing-space-1); color: var(--color-text-primary); }

.colorRow { display: flex; align-items: center; gap: var(--spacing-space-3); color: var(--color-text-primary); font-size: 14px; }
.colorInput { width: 48px; height: 32px; padding: 0; border: 1px solid var(--color-main-border); border-radius: 6px; background: none; cursor: pointer; }

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

@media (max-width: 700px) { .fieldInputs { grid-template-columns: 1fr; } }

.previewCol { position: sticky; top: var(--spacing-space-4); display: flex; flex-direction: column; gap: var(--spacing-space-2); }
.previewLabel { color: var(--color-text-primary); }
.previewHint { margin: 0; color: var(--color-text-primary); }
.previewHint code { background: color-mix(in srgb, var(--color-text-primary) 12%, transparent); padding: 0 4px; border-radius: 4px; }
.previewTabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--spacing-space-2); }
.previewTab, .previewTabActive { min-height: 36px; border: 1px solid var(--color-input-border); border-radius: var(--radius-md); background: var(--color-main-background); color: var(--color-text-primary); font-weight: 600; }
.previewTabActive { border-color: var(--color-text-primary); box-shadow: inset 0 -2px 0 var(--color-text-primary); }

.toastRegion { position: fixed; right: var(--spacing-space-5); bottom: var(--spacing-space-5); z-index: 1000; }

@media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
    .editor { grid-template-columns: 1fr; }
    .previewCol { position: static; }
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
.colorRow,
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
</style>
