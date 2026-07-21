<script setup lang="ts">
import { computed } from "vue";
import type { ComponentsV2Config } from "./discordMessage";
import { WALLET_COMPONENT_V2_FIELDS } from "./discordMessage";

const props = defineProps<{
    slotKey: string;
    config?: ComponentsV2Config;
    components?: Record<string, { label?: string; emoji?: string; style?: string; placeholder?: string }>;
}>();

const samples: Record<string, string> = {
    amount: "58.00 THB", account_name: "อนวัตร กรุดธูป", countdown: "4 นาที 59 วินาที",
    fee_text: "หักค่าธรรมเนียม 5 บาทต่อซอง", member: "1108816021915176962",
    total_balance: "158.00 THB", method: "QR (SlipOK)", datetime: "21/7/2569 11:28:59",
    reason: "สลิปซ้ำ — เคยส่งมาแล้ว",
    minimum: "58",
};

const lines = computed(() => (WALLET_COMPONENT_V2_FIELDS[props.slotKey] ?? []).map((field) => {
    const raw = props.config?.texts?.[field.key] || field.fallback;
    return raw.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => samples[key] ?? `{{${key}}}`);
}));

const buttons = computed(() => Object.entries(props.components ?? {}).filter(([, value]) => value.label));
</script>

<template>
    <div :class="$style.discord">
        <div :class="$style.message">
            <div :class="$style.container">
                <template v-for="(line, index) in lines" :key="index">
                    <div v-if="index" :class="$style.separator" />
                    <p :class="index === 0 ? $style.heading : $style.text">{{ line }}</p>
                </template>
                <div v-if="buttons.length" :class="$style.separator" />
                <div v-if="buttons.length" :class="$style.actions">
                    <button
                        v-for="([key, button]) in buttons"
                        :key="key"
                        type="button"
                        :class="[$style.button, $style[button.style || 'secondary']]"
                    >{{ button.emoji }} {{ button.label }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style module>
.discord { padding: var(--spacing-space-5); border-radius: var(--radius-xl); background: #313338; color: #f2f3f5; }
.message { max-width: 100%; font-family: Inter, sans-serif; }
.container { display: flex; flex-direction: column; gap: var(--spacing-space-3); padding: var(--spacing-space-4); border: 1px solid #4e5058; border-radius: var(--radius-md); background: #2b2d31; }
.heading, .text { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.45; }
.heading { font-size: 18px; font-weight: 700; }
.text { font-size: 14px; }
.separator { height: 1px; background: #4e5058; }
.actions { display: flex; flex-wrap: wrap; gap: var(--spacing-space-2); }
.button { min-height: 32px; padding: 0 var(--spacing-space-3); border: 0; border-radius: var(--radius-sm); color: #fff; font-weight: 600; }
.primary { background: #5865f2; }
.secondary { background: #4e5058; }
.success { background: #248046; }
.danger { background: #da373c; }
</style>
