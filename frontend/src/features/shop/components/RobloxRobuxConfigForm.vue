<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { PrimaryButton, SelectField, TextField, type SelectFieldOption } from "@/shared/ui";
import type { FeatureDefinition } from "@/features/shop/config/featureConfig";

// Custom config renderer for the `roblox-robux-payout` feature. Replaces the
// generic, one-field-per-template form with a purpose-built layout: up to three
// Roblox groups (id + cookie + 2FA secret + display name) plus payout/countdown
// settings. Saves the same flat ROBLOX_*_1/_2/_3 + ROBUX_* + PAYMENT_* keys the
// central-bot runtime reads, so no JSON editing is required.

interface Props {
    feature: FeatureDefinition;
    modelValue?: Record<string, string>;
    channelOptions?: readonly SelectFieldOption[];
    saving?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: () => ({}),
    channelOptions: () => [],
    saving: false,
});

const emit = defineEmits<{ submit: [values: Record<string, string>] }>();

const GROUPS = [1, 2, 3] as const;
type GroupIndex = (typeof GROUPS)[number];

const idKey = (i: GroupIndex) => `ROBLOX_GROUP_ID_${i}`;
const cookieKey = (i: GroupIndex) => `ROBLOX_SECURITY_COOKIE_${i}`;
const totpKey = (i: GroupIndex) => `ROBLOX_TOTP_SECRET_${i}`;
const nameKey = (i: GroupIndex) => `ROBLOX_GROUP_NAME_${i}`;

// Flat working copy. Secrets come back blank from the API (never returned), so a
// blank cookie/totp on save means "keep the stored secret".
const form = reactive<Record<string, string>>({});
const errors = reactive<Record<string, string>>({});

// Snapshot of which groups already had a Group ID saved on load. For those we let
// the secrets stay blank (= keep existing) instead of forcing re-entry.
const configured = reactive<Record<GroupIndex, boolean>>({ 1: false, 2: false, 3: false });

const RATE_OPTIONS: SelectFieldOption[] = [
    { label: "1 บาท = 3 Robux", value: "3" },
    { label: "1 บาท = 3.5 Robux", value: "3.5" },
    { label: "1 บาท = 4 Robux", value: "4" },
];
const ON_OFF_OPTIONS: SelectFieldOption[] = [
    { label: "เปิด", value: "true" },
    { label: "ปิด", value: "false" },
];

function val(key: string): string {
    return props.modelValue[key] ?? "";
}

// Indexed reads of the reactive Record are `string | undefined` under
// noUncheckedIndexedAccess — normalize to "" for all logic below.
function fv(key: string): string {
    return form[key] ?? "";
}

function seed(): void {
    for (const key of Object.keys(form)) delete form[key];
    for (const key of Object.keys(errors)) delete errors[key];

    for (const i of GROUPS) {
        form[idKey(i)] = val(idKey(i));
        form[cookieKey(i)] = ""; // secret — always blank in the form
        form[totpKey(i)] = ""; // secret — always blank in the form
        form[nameKey(i)] = val(nameKey(i));
        configured[i] = Boolean(val(idKey(i)).trim());
    }

    form.ROBUX_RATE = val("ROBUX_RATE") || "4";
    form.ROBUX_ENABLED = val("ROBUX_ENABLED") || "true";
    form.ROBUX_PAYOUT_COOLDOWN = val("ROBUX_PAYOUT_COOLDOWN") || "5";
    form.ROBUX_NOTIFY_CHANNEL = val("ROBUX_NOTIFY_CHANNEL");
    form.PAYMENT_COUNTDOWN_ENABLED = val("PAYMENT_COUNTDOWN_ENABLED") || "false";
    form.PAYMENT_COUNTDOWN_TARGET = val("PAYMENT_COUNTDOWN_TARGET");
}
watch(() => props.modelValue, seed, { immediate: true, deep: true });

const useChannelSelect = computed(() => props.channelOptions.length > 0);

// Human helper: countdown seconds → minutes.
const countdownMinutes = computed(() => {
    const seconds = Number(fv("PAYMENT_COUNTDOWN_TARGET"));
    if (!Number.isFinite(seconds) || seconds <= 0) return "";
    const mins = seconds / 60;
    return `≈ ${Number.isInteger(mins) ? mins : mins.toFixed(1)} นาที`;
});

function groupHasAnyInput(i: GroupIndex): boolean {
    return Boolean(
        fv(idKey(i)).trim() ||
        fv(cookieKey(i)).trim() ||
        fv(totpKey(i)).trim() ||
        fv(nameKey(i)).trim(),
    );
}

function validateGroup(i: GroupIndex): boolean {
    errors[idKey(i)] = "";
    errors[cookieKey(i)] = "";
    errors[totpKey(i)] = "";

    const required = i === 1 || groupHasAnyInput(i);
    if (!required) return true;

    let ok = true;
    if (!fv(idKey(i)).trim()) {
        errors[idKey(i)] = "ต้องกรอก Group ID";
        ok = false;
    }
    // For a never-configured group the secrets must be provided up-front.
    if (!configured[i]) {
        if (!fv(cookieKey(i)).trim()) {
            errors[cookieKey(i)] = "ต้องกรอก Cookie สำหรับกลุ่มใหม่";
            ok = false;
        }
        if (!fv(totpKey(i)).trim()) {
            errors[totpKey(i)] = "ต้องกรอก TOTP Secret สำหรับกลุ่มใหม่";
            ok = false;
        }
    }
    return ok;
}

function validate(): boolean {
    let ok = true;
    for (const i of GROUPS) ok = validateGroup(i) && ok;

    errors.ROBUX_PAYOUT_COOLDOWN = "";
    const cooldown = Number(fv("ROBUX_PAYOUT_COOLDOWN"));
    if (fv("ROBUX_PAYOUT_COOLDOWN").trim() && (!Number.isFinite(cooldown) || cooldown < 0)) {
        errors.ROBUX_PAYOUT_COOLDOWN = "ต้องเป็นจำนวนวินาที 0 ขึ้นไป";
        ok = false;
    }

    errors.PAYMENT_COUNTDOWN_TARGET = "";
    const countdown = Number(fv("PAYMENT_COUNTDOWN_TARGET"));
    if (fv("PAYMENT_COUNTDOWN_TARGET").trim() && (!Number.isFinite(countdown) || countdown < 0)) {
        errors.PAYMENT_COUNTDOWN_TARGET = "ต้องเป็นจำนวนวินาที 0 ขึ้นไป";
        ok = false;
    }
    return ok;
}

function buildPayload(): Record<string, string> {
    const payload: Record<string, string> = {};
    for (const i of GROUPS) {
        payload[idKey(i)] = fv(idKey(i)).trim();
        payload[nameKey(i)] = fv(nameKey(i)).trim();
        // Only send secrets when the user typed one — blank keeps the stored value.
        if (fv(cookieKey(i)).trim()) payload[cookieKey(i)] = fv(cookieKey(i)).trim();
        if (fv(totpKey(i)).trim()) payload[totpKey(i)] = fv(totpKey(i)).trim();
    }
    payload.ROBUX_RATE = fv("ROBUX_RATE");
    payload.ROBUX_ENABLED = fv("ROBUX_ENABLED");
    payload.ROBUX_PAYOUT_COOLDOWN = fv("ROBUX_PAYOUT_COOLDOWN").trim() || "0";
    payload.ROBUX_NOTIFY_CHANNEL = fv("ROBUX_NOTIFY_CHANNEL").trim();
    payload.PAYMENT_COUNTDOWN_ENABLED = fv("PAYMENT_COUNTDOWN_ENABLED");
    payload.PAYMENT_COUNTDOWN_TARGET = fv("PAYMENT_COUNTDOWN_TARGET").trim();
    return payload;
}

function onSubmit(): void {
    if (!validate()) return;
    emit("submit", buildPayload());
}
</script>

<template>
    <form :class="$style.form" @submit.prevent="onSubmit">
        <header :class="$style.header">
            <h2 :class="$style.title" class="type-subtitle-sb">{{ feature.name }}</h2>
            <code :class="$style.code" class="type-overline-r">{{ feature.code }}</code>
        </header>

        <!-- Roblox groups -->
        <div :class="$style.groups">
            <fieldset
                v-for="i in GROUPS"
                :key="i"
                :class="$style.group"
            >
                <legend :class="$style.groupTitle" class="type-overline-r">
                    กลุ่ม {{ i }}<span v-if="i === 1"> · จำเป็น</span><span v-else> · ไม่บังคับ</span>
                </legend>
                <div :class="$style.groupFields">
                    <TextField
                        :label="i === 1 ? 'Roblox Group ID *' : 'Roblox Group ID'"
                        :model-value="form[idKey(i)]"
                        type="text"
                        placeholder="เช่น 1234567"
                        :error="errors[idKey(i)]"
                        :disabled="saving"
                        @update:model-value="(v: string) => (form[idKey(i)] = v)"
                    />
                    <TextField
                        label="ชื่อกลุ่ม (แสดงผล)"
                        :model-value="form[nameKey(i)]"
                        type="text"
                        placeholder="ชื่อที่โชว์ใน embed"
                        :disabled="saving"
                        @update:model-value="(v: string) => (form[nameKey(i)] = v)"
                    />
                    <TextField
                        :label="configured[i] ? '.ROBLOSECURITY Cookie (เว้นว่าง = คงเดิม)' : '.ROBLOSECURITY Cookie *'"
                        :model-value="form[cookieKey(i)]"
                        type="password"
                        placeholder="••••••••"
                        :error="errors[cookieKey(i)]"
                        :disabled="saving"
                        @update:model-value="(v: string) => (form[cookieKey(i)] = v)"
                    />
                    <TextField
                        :label="configured[i] ? '2FA TOTP Secret (เว้นว่าง = คงเดิม)' : '2FA TOTP Secret *'"
                        :model-value="form[totpKey(i)]"
                        type="password"
                        placeholder="••••••••"
                        :error="errors[totpKey(i)]"
                        :disabled="saving"
                        @update:model-value="(v: string) => (form[totpKey(i)] = v)"
                    />
                </div>
            </fieldset>
        </div>

        <!-- Payout settings -->
        <div :class="$style.settings">
            <SelectField
                label="เรท Robux (1 บาท ได้กี่ Robux)"
                :model-value="form.ROBUX_RATE"
                :options="RATE_OPTIONS"
                :disabled="saving"
                @update:model-value="(v: string) => (form.ROBUX_RATE = v)"
            />
            <SelectField
                label="เปิดระบบจ่าย Robux"
                :model-value="form.ROBUX_ENABLED"
                :options="ON_OFF_OPTIONS"
                :disabled="saving"
                @update:model-value="(v: string) => (form.ROBUX_ENABLED = v)"
            />
            <TextField
                label="คูลดาวน์การจ่าย (วินาที)"
                :model-value="form.ROBUX_PAYOUT_COOLDOWN"
                type="number"
                placeholder="5"
                :error="errors.ROBUX_PAYOUT_COOLDOWN"
                :disabled="saving"
                @update:model-value="(v: string) => (form.ROBUX_PAYOUT_COOLDOWN = v)"
            />
            <SelectField
                v-if="useChannelSelect"
                label="ช่องแจ้งเตือนการจ่าย Robux"
                :model-value="form.ROBUX_NOTIFY_CHANNEL"
                :options="channelOptions"
                placeholder="เลือกห้อง…"
                :disabled="saving"
                @update:model-value="(v: string) => (form.ROBUX_NOTIFY_CHANNEL = v)"
            />
            <TextField
                v-else
                label="ช่องแจ้งเตือนการจ่าย Robux (Channel ID)"
                :model-value="form.ROBUX_NOTIFY_CHANNEL"
                type="text"
                placeholder="วาง Channel ID หรือเชิญบอทเข้ากลุ่มก่อน"
                :disabled="saving"
                @update:model-value="(v: string) => (form.ROBUX_NOTIFY_CHANNEL = v)"
            />
        </div>

        <!-- Countdown -->
        <div :class="$style.settings">
            <SelectField
                label="เปิดนับถอยหลังโปรโมชัน"
                :model-value="form.PAYMENT_COUNTDOWN_ENABLED"
                :options="ON_OFF_OPTIONS"
                :disabled="saving"
                @update:model-value="(v: string) => (form.PAYMENT_COUNTDOWN_ENABLED = v)"
            />
            <div :class="$style.countdownField">
                <TextField
                    label="เวลานับถอยหลัง (วินาที)"
                    :model-value="form.PAYMENT_COUNTDOWN_TARGET"
                    type="number"
                    placeholder="เช่น 60 หรือ 300"
                    :error="errors.PAYMENT_COUNTDOWN_TARGET"
                    :disabled="saving"
                    @update:model-value="(v: string) => (form.PAYMENT_COUNTDOWN_TARGET = v)"
                />
                <span v-if="countdownMinutes" :class="$style.hint" class="type-overline-r">{{ countdownMinutes }}</span>
            </div>
        </div>

        <div :class="$style.actions">
            <PrimaryButton type="submit" :disabled="saving">
                {{ saving ? "กำลังบันทึก…" : "บันทึกการตั้งค่า" }}
            </PrimaryButton>
        </div>
    </form>
</template>

<style module>
.form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-5);
    width: 100%;
    color: var(--color-text-primary);
}

.header {
    display: none;
}

.title {
    margin: 0;
}

.code {
    color: var(--color-text-secondary);
}

.groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--spacing-space-4);
}

.group {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
    margin: 0;
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    background: var(--color-main-background);
}

.groupTitle {
    padding: 0;
    color: var(--color-text-secondary);
}

.groupFields {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
}

.settings {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: var(--spacing-space-5);
    align-items: start;
    padding-top: var(--spacing-space-1);
}

.countdownField {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-1);
}

.hint {
    color: var(--color-text-secondary);
    margin: 0;
}

.actions {
    display: flex;
    justify-content: flex-end;
    padding-top: var(--spacing-space-1);
}

@media (max-width: 760px) {
    .groups,
    .settings {
        grid-template-columns: 1fr;
    }
}
</style>
