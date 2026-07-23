<script setup lang="ts">
import { computed, ref } from "vue";
import { useUserStore } from "@/stores";
import type { ComponentV2Block, ComponentsV2Config } from "./discordMessage";
import { createWalletComponentLayout } from "./discordMessage";
import { SLOT_ROLES } from "./DiscordEmbedPreview.vue";

const userStore = useUserStore();

const props = defineProps<{
    slotKey: string;
    botName?: string;
    botAvatarUrl?: string;
    config?: ComponentsV2Config;
    components?: Record<string, {
        label?: string;
        emoji?: string;
        style?: string;
        placeholder?: string;
        option_label?: string;
        option_description?: string;
        option_ok?: string;
        option_insufficient?: string;
    }>;
}>();

const samples: Record<string, string> = {
    amount: "58.00 THB", account_name: "อนวัตร กรุดธูป", countdown: "4 นาที 59 วินาที",
    fee_text: "หักค่าธรรมเนียม 5 บาทต่อซอง", member: "1108816021915176962",
    total_balance: "158.00 THB", method: "QR (SlipOK)", datetime: "21/7/2569 11:28:59",
    reason: "สลิปซ้ำ — เคยส่งมาแล้ว",
    minimum: "58",
    balance: "58.00 THB",
    fee: "5.00 THB",
    gross: "63.00 THB",
};

const memberAvatarUrl = computed(() => (
    userStore.profile?.avatarUrl
    || "/brand/avatar-default.svg"
));
const memberDisplayName = computed(() => (
    userStore.profile?.displayName
    || userStore.profile?.username
    || userStore.user?.user_metadata?.full_name
    || userStore.user?.user_metadata?.name
    || "Member"
));
const discordSamples = computed<Record<string, string>>(() => ({
    member_id: samples.member ?? "",
    member_mention: `<@${samples.member ?? ""}>`,
    member_username: userStore.profile?.username || "member",
    member_display_name: memberDisplayName.value,
    member_avatar_url: memberAvatarUrl.value,
    guild_id: "1075695911495274576",
    guild_name: "Fujipp Community",
    channel_id: "1528753427679809537",
    channel_mention: "<#1528753427679809537>",
    bot_id: "1528753427679809538",
    bot_name: props.botName || "Discord Bot",
    bot_avatar_url: props.botAvatarUrl || "/brand/avatar-default.svg",
}));

const blocks = computed<ComponentV2Block[]>(() => {
    const configured = props.config?.layout?.length
        ? props.config.layout
        : createWalletComponentLayout(props.slotKey, props.config);
    if (configured.length) return configured;
    return [{ id: `${props.slotKey}-controls`, type: "row", rowKey: "all_controls" }];
});

function substitute(value: string): string {
    return value.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
        if (key === "qr_image") return "https://promptpay.io/0835891753/58.00.png";
        if (key === "avatar_url") return memberAvatarUrl.value;
        if (discordSamples.value[key] != null) return discordSamples.value[key];
        return samples[key] ?? `{{${key}}}`;
    });
}

function mediaUrl(value: string): string {
    const resolved = substitute(value).trim();
    const isRemoteUrl = /^https?:\/\/.+/i.test(resolved) && resolved !== "https://";
    const isLocalUrl = resolved.startsWith("/") && !resolved.startsWith("//");
    return isRemoteUrl || isLocalUrl ? resolved : "";
}

function renderText(value: string): string {
    let safe = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    safe = safe.replace(/^#\s+/gm, "");
    safe = safe.replace(/^-#\s+/gm, "");
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(
        /&lt;@(\d+)&gt;/g,
        `<span class="mention">@${memberDisplayName.value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</span>`,
    );
    return safe.replace(/\n/g, "<br>");
}

function textClass(value: string): string {
    if (value.trimStart().startsWith("# ")) return "heading";
    if (value.trimStart().startsWith("-#")) return "subtext";
    return "text";
}

const previewControls = computed(() => (SLOT_ROLES[props.slotKey] ?? [])
    .filter((role) => !role.optional || Boolean(props.components?.[role.key]?.label?.trim()))
    .map((role) => {
        const configured = props.components?.[role.key] ?? {};
        return [role.key, {
            ...configured,
            type: role.type,
            label: configured.label || role.fallback,
            placeholder: configured.placeholder || (role.type === "select" ? role.fallback : undefined),
            emoji: configured.emoji || role.emoji,
            style: configured.style || role.style || "secondary",
        }] as const;
    }));
const ROW_ROLE_KEYS: Record<string, string[]> = {
    topup_panel_actions: ["btn_topup", "btn_balance"],
    topup_method_actions: ["btn_promptpay", "btn_truemoney"],
    close_action: ["btn_close"],
    slip_action: ["btn_slip"],
    timeout_actions: ["btn_retry", "btn_close"],
};

function controlsForRow(rowKey = "") {
    const keys = ROW_ROLE_KEYS[rowKey];
    return keys ? previewControls.value.filter(([key]) => keys.includes(key)) : previewControls.value;
}
const lastInteraction = ref("");
const openSelect = ref("");
const selectedOption = ref<Record<string, string>>({});

function optionsFor(select: NonNullable<typeof props.components>[string]): string[] {
    if (props.slotKey === "buy_eligible") {
        return [
            select.option_ok || "100 Robux · 25 THB · พร้อมซื้อ",
            select.option_insufficient || "500 Robux · ยอดเงินไม่เพียงพอ",
        ];
    }
    const template = select.option_label || "{{name}}";
    return ["Robux กลุ่มหลัก", "Robux กลุ่มสำรอง"].map((name, index) => template
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{stock\}\}/g, index ? "85,000" : "120,000")
        .replace(/\{\{robux\}\}/g, index ? "500" : "100")
        .replace(/\{\{price\}\}/g, index ? "125" : "25"));
}

function pressButton(label: string): void {
    lastInteraction.value = `Previewed “${label}” · no command was sent.`;
}

function buttonClass(_key: string, style: string): string {
    return style || "secondary";
}

function toggleSelect(key: string): void {
    openSelect.value = openSelect.value === key ? "" : key;
}

function chooseOption(key: string, option: string): void {
    selectedOption.value[key] = option;
    openSelect.value = "";
    lastInteraction.value = `Selected “${option}” in the preview.`;
}

const containerStyle = computed(() => {
    const color = props.config?.container?.accentColor;
    return color == null ? {} : { borderLeftColor: `#${(color & 0xffffff).toString(16).padStart(6, "0")}`, borderLeftWidth: "4px" };
});
</script>

<template>
    <div :class="$style.discord">
        <div :class="$style.messageRow">
            <img :class="$style.avatar" :src="botAvatarUrl || '/brand/avatar-default.svg'" :alt="botName ? `${botName} avatar` : ''" />
            <div :class="$style.message">
                <div :class="$style.messageHeader">
                    <strong>{{ botName || "Discord Bot" }}</strong>
                    <span :class="$style.appBadge">APP</span>
                    <span :class="$style.timestamp">Today at 15:28</span>
                </div>
                <div :class="[$style.container, config?.container?.spoiler ? $style.spoiler : '']" :style="containerStyle">
                    <template v-for="block in blocks" :key="block.id">
                        <p
                            v-if="block.type === 'text'"
                            :class="$style[textClass(block.content)]"
                            v-html="renderText(substitute(block.content))"
                        />
                        <div v-else-if="block.type === 'section'" :class="$style.section">
                            <p :class="$style[textClass(block.content)]" v-html="renderText(substitute(block.content))" />
                            <img v-if="mediaUrl(block.accessoryUrl)" :src="mediaUrl(block.accessoryUrl)" alt="Member avatar" />
                        </div>
                        <div
                            v-else-if="block.type === 'separator'"
                            :class="[
                                block.divider ? $style.separator : $style.softSeparator,
                                block.spacing === 1 ? $style.spacingSmall : $style.spacingLarge,
                            ]"
                        />
                        <button v-else-if="block.type === 'media'" type="button" :class="$style.media" @click="pressButton(block.description || 'Media')">
                            <img v-if="mediaUrl(block.url)" :src="mediaUrl(block.url)" :alt="block.description || 'Media preview'" />
                            <span v-else :class="$style.mediaPlaceholder">🖼️ Enter a media URL to preview it</span>
                        </button>
                        <div v-else-if="block.type === 'row'" :class="$style.actions">
                            <template v-for="([key, control]) in block.rowKey ? controlsForRow(block.rowKey) : []" :key="key">
                                <button
                                    v-if="control.type !== 'select'"
                                    type="button"
                                    :class="[$style.button, $style[buttonClass(key, control.style)]]"
                                    @click="pressButton(control.label || key)"
                                >
                                    <span v-if="control.emoji" :class="$style.buttonEmoji">{{ control.emoji }}</span>
                                    <span>{{ control.label }}</span>
                                    <span v-if="control.type === 'link'" :class="$style.externalIcon" aria-hidden="true">↗</span>
                                </button>
                                <div v-else :class="$style.selectWrap">
                        <button
                            type="button"
                            :class="[$style.select, openSelect === key ? $style.selectOpen : '']"
                            :aria-expanded="openSelect === key"
                            @click="toggleSelect(key)"
                        >
                            <span>{{ selectedOption[key] || control.placeholder }}</span>
                            <span :class="$style.selectArrow" aria-hidden="true">⌄</span>
                        </button>
                        <div v-if="openSelect === key" :class="$style.menu" role="listbox">
                            <button
                                v-for="option in optionsFor(control)"
                                :key="option"
                                type="button"
                                :class="$style.option"
                                @click="chooseOption(key, option)"
                            >
                                <span :class="$style.optionEmoji" aria-hidden="true">🎮</span>
                                <span :class="$style.optionCopy">
                                    <strong>{{ option }}</strong>
                                    <span>{{ control.option_description || "Preview option from the bot configuration" }}</span>
                                </span>
                                <span v-if="selectedOption[key] === option" :class="$style.optionCheck" aria-hidden="true">✓</span>
                            </button>
                        </div>
                                </div>
                            </template>
                            <button
                                v-for="button in block.buttons ?? []"
                                :key="button.id"
                                type="button"
                                :class="[$style.button, $style.secondary]"
                                @click="pressButton(button.label || 'Link')"
                            >
                                <span v-if="button.emoji" :class="$style.buttonEmoji">{{ button.emoji }}</span>
                                <span>{{ button.label || "Link" }}</span>
                                <span :class="$style.externalIcon" aria-hidden="true">↗</span>
                            </button>
                        </div>
                    </template>
                </div>
                <p v-if="lastInteraction" :class="$style.feedback" role="status">{{ lastInteraction }}</p>
            </div>
        </div>
    </div>
</template>

<style module>
.discord { min-height: 260px; padding: var(--spacing-space-5); border-radius: var(--radius-xl); background: #313338; color: #dbdee1; font-family: Inter, Arial, sans-serif; }
.messageRow { display: flex; align-items: flex-start; gap: var(--spacing-space-3); }
.avatar { width: 40px; height: 40px; flex: 0 0 40px; border-radius: 50%; background: #f2f3f5; object-fit: contain; }
.message { min-width: 0; flex: 1; }
.messageHeader { display: flex; align-items: baseline; gap: 5px; min-height: 22px; color: #f2f3f5; font-size: 16px; }
.appBadge { padding: 1px 4px; border-radius: 3px; background: #5865f2; color: #fff; font-size: 10px; font-weight: 700; line-height: 14px; }
.timestamp { color: #949ba4; font-size: 11px; font-weight: 400; }
.container { display: flex; width: fit-content; min-width: min(360px, 100%); max-width: min(520px, 100%); box-sizing: border-box; flex-direction: column; gap: 6px; margin-top: 2px; padding: 16px; border: 1px solid #434349; border-radius: 8px; background: #2b2d31; }
.heading, .text, .subtext { margin: 0; overflow-wrap: anywhere; line-height: 1.375; }
.heading { color: #f2f3f5; font-size: 21px; font-weight: 700; }
.text { color: #dbdee1; font-size: 14px; font-weight: 400; }
.subtext { color: #b5bac1; font-size: 12px; }
.text :global(.mention), .subtext :global(.mention) { padding: 0 2px; border-radius: 3px; background: rgb(88 101 242 / 30%); color: #c9cdfb; }
.separator { height: 1px; margin: 8px 0; background: #4e5058; }
.section { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 16px; }
.section img { width: 48px; height: 48px; flex: 0 0 48px; border-radius: 8px; object-fit: cover; }
.softSeparator { height: 4px; }
.spacingSmall { margin-top: 2px; margin-bottom: 2px; }
.spacingLarge { margin-top: 8px; margin-bottom: 8px; }
.spoiler > * { filter: blur(5px); transition: filter 120ms ease; }
.spoiler:hover > * { filter: none; }
.media { display: block; overflow: hidden; max-width: 320px; padding: 0; border: 0; border-radius: 8px; background: transparent; cursor: pointer; }
.media img { display: block; width: 100%; max-height: 300px; object-fit: contain; }
.mediaPlaceholder { display: flex; min-height: 120px; align-items: center; justify-content: center; padding: 16px; border: 1px dashed #4e5058; border-radius: 8px; color: #949ba4; font-size: 12px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.button { display: inline-flex; min-width: 60px; max-width: 100%; height: 32px; align-items: center; justify-content: center; gap: 6px; padding: 0 16px; border: 1px solid rgb(255 255 255 / 8%); border-radius: 8px; color: #fff; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 120ms ease, transform 80ms ease; }
.button:hover { filter: brightness(.9); }
.button:active { transform: translateY(1px); filter: brightness(.8); }
.button:focus-visible, .select:focus-visible, .option:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
.buttonEmoji { font-size: 17px; line-height: 1; }
.externalIcon { font-size: 13px; }
.primary { background: #5865f2; }
.secondary { border-color: rgb(151 151 159 / 4%); background: rgb(151 151 159 / 20%); color: #ebebed; }
.success { background: #248046; }
.danger { background: #d22d39; }
.selectWrap { position: relative; width: 100%; }
.select { display: flex; width: 100%; min-height: 40px; align-items: center; justify-content: space-between; gap: 12px; padding: 0 12px; border: 1px solid #1e1f22; border-radius: 4px; background: #1e1f22; color: #dbdee1; font-size: 14px; cursor: pointer; text-align: left; }
.selectOpen { border-color: #00a8fc; }
.selectArrow { color: #b5bac1; font-size: 18px; }
.menu { position: absolute; z-index: 3; top: calc(100% + 4px); right: 0; left: 0; display: flex; overflow: hidden; flex-direction: column; padding: 6px; border: 1px solid #111214; border-radius: 4px; background: #111214; box-shadow: 0 8px 24px rgb(0 0 0 / 45%); }
.option { display: grid; grid-template-columns: 24px minmax(0, 1fr) 20px; align-items: center; gap: 8px; padding: 8px; border: 0; border-radius: 3px; background: transparent; color: #f2f3f5; cursor: pointer; text-align: left; }
.option:hover { background: #404249; }
.optionEmoji { font-size: 18px; }
.optionCopy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.optionCopy strong { overflow: hidden; color: #f2f3f5; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.optionCopy span { overflow: hidden; color: #b5bac1; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.optionCheck { color: #b5bac1; }
.feedback { margin: 6px 0 0; color: #949ba4; font-size: 11px; }

@media (max-width: 560px) {
    .discord { padding: 12px; }
    .avatar { width: 32px; height: 32px; flex-basis: 32px; }
    .container { min-width: 0; width: 100%; }
}
</style>
