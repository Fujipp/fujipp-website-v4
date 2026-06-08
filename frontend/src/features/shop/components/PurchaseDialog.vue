<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { PrimaryButton, SecondaryButton, SelectField, type SelectFieldOption } from "@/shared/ui";
import { thb, type BotOption } from "@/features/shop/config/catalog";

interface Props {
    open?: boolean;
    title: string;
    optionLabel: string;
    priceSatang: number;
    requiresSubject?: boolean;
    bots?: readonly BotOption[];
    balanceSatang?: number;
    submitting?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    open: false,
    requiresSubject: false,
    bots: () => [],
    balanceSatang: 0,
    submitting: false,
});

const emit = defineEmits<{ confirm: [botId: string | null]; cancel: [] }>();

const selectedBotId = ref("");
const error = ref("");

watch(
    () => props.open,
    (open) => {
        if (open) {
            selectedBotId.value = props.bots.length === 1 ? (props.bots[0]?.id ?? "") : "";
            error.value = "";
        }
    },
);

const botOptions = computed<SelectFieldOption[]>(() => props.bots.map((b) => ({ label: b.name, value: b.id })));
const insufficient = computed(() => props.balanceSatang < props.priceSatang);

function confirm(): void {
    if (props.requiresSubject && !selectedBotId.value) {
        error.value = "กรุณาเลือกบอทปลายทาง";
        return;
    }
    if (insufficient.value) {
        error.value = "ยอดเครดิตไม่พอ กรุณาเติมเงินก่อน";
        return;
    }
    emit("confirm", props.requiresSubject ? selectedBotId.value : null);
}
</script>

<template>
    <Teleport to="body">
        <div v-if="open" :class="$style.backdrop" @click.self="emit('cancel')">
            <section :class="$style.modal" role="dialog" aria-modal="true" aria-labelledby="purchase-title">
                <h2 id="purchase-title" :class="$style.title" class="type-subtitle-sb">ยืนยันการสั่งซื้อ</h2>

                <dl :class="$style.summary">
                    <div :class="$style.row">
                        <dt class="type-body-small-r">รายการ</dt>
                        <dd class="type-body-small-sb">{{ title }}</dd>
                    </div>
                    <div :class="$style.row">
                        <dt class="type-body-small-r">แบบ</dt>
                        <dd class="type-body-small-sb">{{ optionLabel }}</dd>
                    </div>
                    <div :class="$style.row">
                        <dt class="type-body-small-r">ราคา</dt>
                        <dd class="type-body-main-sb">{{ thb(priceSatang) }}</dd>
                    </div>
                    <div :class="$style.row">
                        <dt class="type-body-small-r">เครดิตคงเหลือ</dt>
                        <dd class="type-body-small-sb" :class="insufficient ? $style.insufficient : ''">{{ thb(balanceSatang) }}</dd>
                    </div>
                </dl>

                <SelectField
                    v-if="requiresSubject"
                    v-model="selectedBotId"
                    label="เลือกบอทปลายทาง"
                    placeholder="เลือกบอท…"
                    :options="botOptions"
                />

                <p v-if="error" :class="$style.error" class="type-overline-r">{{ error }}</p>

                <div :class="$style.actions">
                    <SecondaryButton type="button" @click="emit('cancel')">ยกเลิก</SecondaryButton>
                    <PrimaryButton type="button" :disabled="submitting" @click="confirm">
                        {{ submitting ? "กำลังสั่งซื้อ…" : "ยืนยันซื้อ" }}
                    </PrimaryButton>
                </div>
            </section>
        </div>
    </Teleport>
</template>

<style module>
.backdrop {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    background: rgba(0, 0, 0, 0.55);
    z-index: 1000;
}

.modal {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
    max-width: 420px;
    padding: 24px;
    border-radius: 16px;
    background: var(--color-main-primary);
    color: var(--color-text-primary);
}

.title {
    margin: 0;
}

.summary {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
}

.row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.row dd {
    margin: 0;
}

.insufficient {
    color: var(--color-status-error);
}

.error {
    margin: 0;
    color: var(--color-status-error);
}

.actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}
</style>
