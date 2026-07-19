<script lang="ts">
// Shared types + the slot→component map. Declared in a plain <script> block (not
// <script setup>) so they can be exported as real module bindings and imported by
// EmbedEditor — keeping the editor form and this preview perfectly in sync.
export interface EmbedField {
    name?: string;
    value?: string;
    inline?: boolean;
}
export interface ComponentConfig {
    label?: string;
    emoji?: string;
    style?: string;
    placeholder?: string;
    url?: string;
}
export interface EmbedObject {
    content?: string; // message text shown ABOVE the embed (e.g. a tag line)
    color?: number;
    title?: string;
    description?: string;
    url?: string;
    image?: { url?: string };
    thumbnail?: { url?: string };
    footer?: { text?: string; icon_url?: string };
    author?: { name?: string; icon_url?: string; url?: string };
    timestamp?: string;
    fields?: EmbedField[];
    components?: Record<string, ComponentConfig>;
}

export interface PreviewRole {
    key: string;
    label: string;
    type: "button" | "select" | "link";
    fallback: string;
    emoji?: string; // default emoji the bot uses when none is configured
    style?: string; // default button style the bot uses when none is configured
    // Optional roles can be removed by the user (e.g. Price Board category buttons):
    // the bot hides them when they have no configured label, and so does the preview.
    optional?: boolean;
}

/**
 * Editable component roles per embed slot — mirrors the bot's real components 1:1
 * (custom_id / behaviour stay fixed in the bot; only label/emoji/style are editable).
 */
export const SLOT_ROLES: Record<string, PreviewRole[]> = {
    shop_panel: [
        { key: "group_select", label: "Group selector", type: "select", fallback: "เลือกกลุ่มที่ต้องการซื้อ" },
        { key: "btn_topup", label: "Top-up button", type: "button", fallback: "เติมเงิน", style: "primary" },
        { key: "btn_balance", label: "Balance button", type: "button", fallback: "เช็คยอดคงเหลือ", style: "secondary" },
        { key: "btn_link", label: "Group link button", type: "link", fallback: "ลิงก์กลุ่ม" },
    ],
    topup_method: [
        { key: "btn_promptpay", label: "PromptPay button", type: "button", fallback: "พร้อมเพย์ธนาคาร", emoji: "🏧", style: "primary" },
        { key: "btn_truemoney", label: "TrueMoney button", type: "button", fallback: "ซองอั่งเปาทรูมันนี่", emoji: "🧧", style: "success" },
    ],
    topup_panel: [
        { key: "btn_topup", label: "Top-up button", type: "button", fallback: "เติมเงิน", emoji: "💰", style: "primary" },
    ],
    buy_eligible: [
        { key: "pkg_select", label: "Package selector", type: "select", fallback: "🎮 เลือก Robux Package" },
    ],
    // Price Board: the parent board exposes one editable button per category
    // (btn_cat1..8); a category stays hidden until its button has a label.
    price_board: Array.from({ length: 8 }, (_, i) => ({
        key: `btn_cat${i + 1}`,
        label: `Category ${i + 1} button`,
        type: "button",
        fallback: `หมวด ${i + 1}`,
        style: "primary",
        optional: true,
    })) as PreviewRole[],
    // Each per-category price embed (price_cat1..8) exposes its order-room link button.
    ...Object.fromEntries(
        Array.from({ length: 8 }, (_, i) => [
            `price_cat${i + 1}`,
            [{ key: "btn_buy", label: "Order channel button", type: "link", fallback: "ห้องสั่งซื้อสินค้า" }] as PreviewRole[],
        ]),
    ),
};

// Buttons the bot renders with FIXED labels (not configurable) — shown so the preview
// looks like the real message, but they aren't exposed in the editor.
const STATIC_ROLES: Record<string, { label: string; style: string }[]> = {
    buy_confirm: [
        { label: "ยืนยัน", style: "success" },
        { label: "ยกเลิก", style: "danger" },
    ],
};
</script>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
    embed: EmbedObject;
    slotKey?: string;
    configValues?: Record<string, string>;
}>();

function cfg(key: string): string {
    return (props.configValues?.[key] ?? "").trim();
}

// Groups configured for the Roblox feature (ROBLOX_GROUP_ID_1..3 / _NAME_1..3, plus
// the legacy single-group keys). The COUNT drives how many stock fields + select
// options the preview shows — so 2 configured groups render as 2, not a fixed 3.
function configuredGroups(): { name: string }[] {
    const out: { name: string }[] = [];
    for (let i = 1; i <= 3; i++) {
        const id = cfg(`ROBLOX_GROUP_ID_${i}`);
        const name = cfg(`ROBLOX_GROUP_NAME_${i}`);
        if (id || name) out.push({ name: name || `Robux กลุ่ม ${i}` });
    }
    if (out.length === 0) {
        const id = cfg("ROBLOX_GROUP_ID");
        const name = cfg("ROBLOX_GROUP_NAME");
        if (id || name) out.push({ name: name || "Robux กลุ่ม 1" });
    }
    // Always show at least one so the panel doesn't look broken before setup.
    if (out.length === 0) out.push({ name: "Robux กลุ่ม 1" });
    return out;
}

// Packages from ROBUX_PACKAGES (JSON [{robux, price}]), else derived from ROBUX_RATE.
function configuredPackages(): { robux: number; price: number }[] {
    const raw = cfg("ROBUX_PACKAGES");
    if (raw) {
        try {
            const arr = JSON.parse(raw) as { robux?: number; price?: number }[];
            const valid = (Array.isArray(arr) ? arr : [])
                .filter((p) => p && typeof p.robux === "number" && typeof p.price === "number")
                .map((p) => ({ robux: p.robux as number, price: p.price as number }));
            if (valid.length) return valid.slice(0, 25);
        } catch { /* fall through to rate-derived sample */ }
    }
    const rate = Number(cfg("ROBUX_RATE")) || 4;
    return [100, 500, 1000].map((robux) => ({ robux, price: Math.max(1, Math.round(robux / rate)) }));
}

// Sample values for {{vars}} so embeds render filled-in instead of showing blanks.
// Config-derived where it matters (group name / package / rate).
const mockVars = computed<Record<string, string>>(() => {
    const groups = configuredGroups();
    const pkgs = configuredPackages();
    const now = new Date().toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    return {
        member: "@ลูกค้า",
        balance: "฿100.00",
        balance_after: "฿65.00",
        robux: (pkgs[0]?.robux ?? 1000).toLocaleString(),
        price: String(pkgs[0]?.price ?? 250),
        roblox_id: "1234567890",
        username: "RobloxPlayer",
        datetime: now,
        time: now,
        detail: "กำลังประมวลผล…",
        reason: "ตัวอย่างข้อความแจ้งเตือน",
        error: "ตัวอย่างข้อผิดพลาด",
        message: "พร้อมซื้อ Robux",
        rate: cfg("ROBUX_RATE") || "4",
        group_robux: "120,000",
        group_name: groups[0]?.name ?? "Robux กลุ่ม 1",
        queue: "1",
        avatar: "",
    };
});

function subst(text: string | undefined): string {
    return (text ?? "").replace(/\{\{(\w+)\}\}/g, (_m, k: string) =>
        (mockVars.value[k] != null ? mockVars.value[k] : ""));
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Render a subset of Discord markdown to safe HTML. Input is escaped first, so only
// the controlled tags we add below are ever emitted (no raw user HTML).
function renderText(raw: string | undefined): string {
    let s = escapeHtml(subst(raw));
    s = s.replace(/```([\s\S]*?)```/g, (_m, c) => `<code class="block">${c}</code>`);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    // custom emoji <a:name:id> / <:name:id>  (angle brackets are now &lt; &gt;)
    s = s.replace(/&lt;(a)?:(\w+):(\d+)&gt;/g, (_m, anim, name, id) =>
        `<img class="emoji" src="https://cdn.discordapp.com/emojis/${id}.${anim ? "gif" : "png"}" alt=":${name}:" />`);
    s = s.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention">@role</span>');
    s = s.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@user</span>');
    s = s.replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#channel</span>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    s = s.replace(/__([^_]+)__/g, "<u>$1</u>");
    s = s.replace(/\*([^*]+)\*/g, "<i>$1</i>");
    s = s.replace(/~~([^~]+)~~/g, "<s>$1</s>");
    s = s.replace(/^&gt; ?(.*)$/gm, '<span class="quote">$1</span>');
    s = s.replace(/\n/g, "<br/>");
    return s;
}

function safeUrl(u: string | undefined): string {
    return u && /^https?:\/\//i.test(u) ? u : "";
}

const barColor = computed(() => {
    const c = props.embed.color;
    return typeof c === "number" ? `#${(c & 0xffffff).toString(16).padStart(6, "0")}` : "#4f545c";
});
const titleHtml = computed(() => renderText(props.embed.title));
const descHtml = computed(() => renderText(props.embed.description));
const authorName = computed(() => subst(props.embed.author?.name));
const footerText = computed(() => subst(props.embed.footer?.text));

// Fields the bot appends at runtime (config-driven). shop_panel shows one stock field
// per configured group; other slots add nothing here.
const dynamicFields = computed<EmbedField[]>(() => {
    if (props.slotKey !== "shop_panel") return [];
    const stock = [120_000, 85_000, 64_000, 40_000, 25_000];
    return configuredGroups().map((g, i) => ({
        name: `Robux ${g.name}`,
        value: "```" + (stock[i % stock.length] ?? 0).toLocaleString() + "```",
        inline: true,
    }));
});
const fields = computed<EmbedField[]>(() => [
    ...(props.embed.fields ?? []).filter((f) => f.name || f.value),
    ...dynamicFields.value,
]);

const image = computed(() => safeUrl(props.embed.image?.url));
const thumbnail = computed(() => safeUrl(props.embed.thumbnail?.url));
const authorIcon = computed(() => safeUrl(props.embed.author?.icon_url));
const authorUrl = computed(() => safeUrl(props.embed.author?.url));
const titleUrl = computed(() => safeUrl(props.embed.url));
const footerIcon = computed(() => safeUrl(props.embed.footer?.icon_url));
// Footer timestamp like Discord's "DD/MM/YYYY HH:MM". Empty/invalid → no text.
const timestampText = computed(() => {
    const raw = props.embed.timestamp;
    if (!raw) return "";
    const d = new Date(raw);
    return Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
});

const previewRoles = computed(() => (props.slotKey ? SLOT_ROLES[props.slotKey] ?? [] : []));
const selectRoles = computed(() => previewRoles.value.filter((r) => r.type === "select"));
// Optional buttons (e.g. Price Board categories) stay hidden until they have a label —
// exactly how the bot renders them, so the preview reflects what the channel will show.
const buttonRoles = computed(() => previewRoles.value.filter(
    (r) => r.type !== "select" && !(r.optional && !component(r).label?.trim()),
));
const staticButtons = computed(() => (props.slotKey ? STATIC_ROLES[props.slotKey] ?? [] : []));
const hasComponents = computed(() => previewRoles.value.length > 0 || staticButtons.value.length > 0);

// Message text shown above the embed; {{member}} mocks the clicker's mention.
const contentText = computed(() => (props.embed.content ?? "").replace(/\{\{member\}\}/g, "@สมาชิก").trim());

function component(role: PreviewRole): ComponentConfig {
    return props.embed.components?.[role.key] ?? {};
}

function componentText(role: PreviewRole): string {
    const c = component(role);
    return role.type === "select" ? (c.placeholder || role.fallback) : (c.label || role.fallback);
}

function componentEmoji(role: PreviewRole): string {
    return component(role).emoji || role.emoji || "";
}

// The collapsed select only shows a placeholder in Discord, so list the resolved
// options below it as muted chips — that's how the user verifies group/package count.
function selectOptions(role: PreviewRole): string[] {
    if (role.key === "group_select") return configuredGroups().map((g) => g.name);
    if (role.key === "pkg_select") {
        return configuredPackages().map((p) => `${p.robux.toLocaleString()} Robux — ฿${p.price.toLocaleString()}`);
    }
    return [];
}

function styleClass(style: string | undefined, fallback = "secondary"): string {
    if (style === "primary") return "primary";
    if (style === "success") return "success";
    if (style === "danger") return "danger";
    if (style === "link") return "link";
    if (style === "secondary") return "secondary";
    return fallback;
}

function buttonClass(role: PreviewRole): string {
    if (role.type === "link") return "link";
    return styleClass(component(role).style || role.style);
}
</script>

<template>
    <div :class="$style.wrap">
        <p v-if="contentText" :class="$style.content">{{ contentText }}</p>
        <div :class="$style.embed" :style="{ borderColor: barColor }">
            <div :class="$style.body">
                <div v-if="authorName" :class="$style.author">
                    <img v-if="authorIcon" :class="$style.authorIcon" :src="authorIcon" alt="" />
                    <a v-if="authorUrl" :href="authorUrl" target="_blank" rel="noopener noreferrer" :class="$style.authorLink">{{ authorName }}</a>
                    <span v-else>{{ authorName }}</span>
                </div>
                <a
                    v-if="embed.title && titleUrl"
                    :href="titleUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    :class="[$style.title, $style.titleLink]"
                    v-html="titleHtml"
                />
                <div v-else-if="embed.title" :class="$style.title" v-html="titleHtml" />
                <div v-if="embed.description" :class="$style.desc" v-html="descHtml" />

                <div v-if="fields.length" :class="$style.fields">
                    <div
                        v-for="(f, i) in fields"
                        :key="i"
                        :class="[$style.field, f.inline ? $style.inline : '']"
                    >
                        <div :class="$style.fieldName" v-html="renderText(f.name)" />
                        <div :class="$style.fieldValue" v-html="renderText(f.value)" />
                    </div>
                </div>

                <img v-if="image" :class="$style.image" :src="image" alt="" />

                <div v-if="footerText || timestampText" :class="$style.footer">
                    <img v-if="footerIcon" :class="$style.footerIcon" :src="footerIcon" alt="" />
                    <span v-if="footerText">{{ footerText }}</span>
                    <span v-if="footerText && timestampText" :class="$style.footerSep">•</span>
                    <span v-if="timestampText">{{ timestampText }}</span>
                </div>
            </div>
            <img v-if="thumbnail" :class="$style.thumb" :src="thumbnail" alt="" />
        </div>

        <div v-if="hasComponents" :class="$style.components">
            <div v-for="role in selectRoles" :key="role.key" :class="$style.selectBlock">
                <div :class="$style.selectPreview">
                    <span v-if="componentEmoji(role)" v-html="renderText(componentEmoji(role))" />
                    <span>{{ componentText(role) }}</span>
                    <span :class="$style.chevron">⌄</span>
                </div>
                <div v-if="selectOptions(role).length" :class="$style.optionList">
                    <span v-for="(opt, i) in selectOptions(role)" :key="i" :class="$style.optionChip">{{ opt }}</span>
                </div>
            </div>

            <div v-if="buttonRoles.length || staticButtons.length" :class="$style.buttonRow">
                <button
                    v-for="role in buttonRoles"
                    :key="role.key"
                    type="button"
                    :class="[$style.previewButton, $style[buttonClass(role)]]"
                >
                    <span v-if="componentEmoji(role)" v-html="renderText(componentEmoji(role))" />
                    <span>{{ componentText(role) }}</span>
                </button>
                <button
                    v-for="(btn, i) in staticButtons"
                    :key="`static-${i}`"
                    type="button"
                    :class="[$style.previewButton, $style[styleClass(btn.style)]]"
                >
                    <span>{{ btn.label }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

<style module>
.wrap {
    background: #313338;
    padding: 16px;
    border-radius: var(--radius-lg);
}

.embed {
    display: flex;
    gap: 12px;
    max-width: 432px;
    background: #2b2d31;
    border-left: 4px solid #4f545c;
    border-radius: 4px;
    padding: 12px 16px 12px 12px;
    color: #dbdee1;
    font-family: "gg sans", var(--font-sans), sans-serif;
    font-size: 14px;
    line-height: 1.4;
}

.body { flex: 1; min-width: 0; }

.author { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-weight: 600; font-size: 13px; color: #f2f3f5; }
.authorIcon { width: 24px; height: 24px; border-radius: 50%; }
.authorLink { color: #f2f3f5; text-decoration: none; }
.authorLink:hover { text-decoration: underline; }

.title { font-weight: 600; color: #f2f3f5; margin-bottom: 6px; }
.titleLink { display: block; color: #00a8fc; text-decoration: none; }
.titleLink:hover { text-decoration: underline; }
.desc { white-space: normal; word-break: break-word; }

.fields { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.field { flex: 1 1 100%; min-width: 0; }
.inline { flex: 1 1 30%; }
.fieldName { font-weight: 600; color: #f2f3f5; font-size: 13px; margin-bottom: 2px; }
.fieldValue { font-size: 14px; word-break: break-word; }

.image { max-width: 100%; border-radius: 6px; margin-top: 10px; }
.thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }

.footer { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12px; color: #b5bac1; }
.footerIcon { width: 20px; height: 20px; border-radius: 50%; }
.footerSep { color: #b5bac1; }

.embed :global(.emoji) { display: inline-block; width: 1.375em; height: 1.375em; vertical-align: -0.2em; object-fit: contain; }
.embed :global(.mention) { background: rgba(88,101,242,0.3); color: #c9cdfb; border-radius: 3px; padding: 0 2px; }
.embed :global(code) { background: #1e1f22; border-radius: 3px; padding: 0 3px; font-family: monospace; font-size: 13px; }
.embed :global(code.block) { display: block; padding: 6px 8px; margin: 2px 0; white-space: pre-wrap; }
.embed :global(.quote) { display: inline-block; border-left: 3px solid #4e5058; padding-left: 8px; }

.content { color: #dbdee1; white-space: pre-wrap; word-break: break-word; margin: 0 0 4px; font-size: 14px; line-height: 1.4; }
.components { display: flex; flex-direction: column; gap: 8px; max-width: 432px; margin-top: 8px; }
.selectBlock { display: flex; flex-direction: column; gap: 4px; }
.selectPreview { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 0 12px; border: 1px solid #3f4147; border-radius: 4px; background: #2b2d31; color: #b5bac1; font-size: 14px; }
.chevron { margin-left: auto; color: #949ba4; font-size: 18px; line-height: 1; }
.optionList { display: flex; flex-wrap: wrap; gap: 4px; padding-left: 4px; }
.optionChip { padding: 2px 8px; border: 1px solid #3f4147; border-radius: 10px; background: #232428; color: #b5bac1; font-size: 12px; }
.buttonRow { display: flex; flex-wrap: wrap; gap: 8px; }
.previewButton { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 38px; padding: 0 14px; border: 0; border-radius: 4px; color: #fff; font-weight: 600; font-size: 14px; cursor: default; }
.primary { background: #5865f2; }
.secondary { background: #4e5058; }
.success { background: #248046; }
.danger { background: #da373c; }
.link { background: #4e5058; }
.components :global(.emoji) { width: 1.25em; height: 1.25em; vertical-align: bottom; object-fit: contain; }
</style>
