<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { AdminLayout } from "@/features/admin/components";
import { SecondaryButton, SelectField, StatusToast, type SelectFieldOption } from "@/shared/ui";
import { useAdminStore } from "@/features/admin/stores";
import type { AdminBot, AdminSeat, AdminUnseatedRuntime, AdminVpsNode } from "@/features/admin/config";

type ToastStatus = "info" | "success" | "warning" | "error";

const admin = useAdminStore();

const nodes = ref<AdminVpsNode[]>([]);
const seats = ref<AdminSeat[]>([]);
const unseated = ref<AdminUnseatedRuntime[]>([]);
const bots = ref<AdminBot[]>([]);
const isLoading = ref(false);
const loadError = ref("");
const busyKey = ref("");
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;

// Per-node draft of the editable fields (keyed by node id).
const drafts = reactive<Record<string, { label: string; maxSlots: number; reservedSlots: number; status: string }>>({});

// Move/assign dialog — driven by a runtime id so it serves both seated seats and
// unseated (orphan) runtimes.
const moveRuntimeId = ref("");
const moveTitle = ref("");
const moveTarget = ref("");

const botName = computed(() => new Map(bots.value.map((b) => [b.id, b])));
const seatsByNode = computed(() => {
    const map = new Map<string, AdminSeat[]>();
    for (const seat of seats.value) {
        const list = map.get(seat.nodeId) ?? [];
        list.push(seat);
        map.set(seat.nodeId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.slotIndex - b.slotIndex);
    return map;
});
const freeSeats = computed(() => seats.value.filter((s) => s.occupancy === "FREE"));
const nodeStatusOptions: SelectFieldOption[] = [
    { label: "ACTIVE", value: "ACTIVE" },
    { label: "DRAINING", value: "DRAINING" },
    { label: "OFFLINE", value: "OFFLINE" },
];
const freeSeatOptions = computed<SelectFieldOption[]>(() => [
    { label: "— เลือกช่อง —", value: "" },
    ...freeSeats.value.map((seat) => ({
        label: `${seat.nodeName} · ช่อง #${seat.slotIndex}`,
        value: seat.slotId,
    })),
]);

function clearToast(): void {
    if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = undefined; }
    toast.value = null;
}
function notify(status: ToastStatus, title: string, description = ""): void {
    clearToast();
    toast.value = { status, title, description };
    toastTimeout = setTimeout(clearToast, status === "success" ? 2400 : 5000);
}

function formatExpiry(date: string | null): string {
    if (!date) return "—";
    const end = new Date(`${date}T00:00:00`);
    if (Number.isNaN(end.getTime())) return date;
    const days = Math.ceil((end.getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000);
    if (days < 0) return "หมดอายุแล้ว";
    return `${date} (${days} วัน)`;
}

function seatBotLabel(seat: AdminSeat): string {
    if (seat.occupancy !== "OCCUPIED") return "—";
    if (!seat.assignedBotId) return "ซื้อไว้ ยังไม่ assign";
    return botName.value.get(seat.assignedBotId)?.name ?? seat.assignedBotId.slice(0, 8);
}

function seatOwnerLabel(seat: AdminSeat): string {
    if (!seat.assignedBotId) return "—";
    const b = botName.value.get(seat.assignedBotId);
    return b?.ownerName ?? b?.ownerEmail ?? (seat.ownerUserId ? seat.ownerUserId.slice(0, 8) : "—");
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        const [n, c, u, b] = await Promise.all([
            admin.fetchVpsNodes(),
            admin.fetchRuntimeCabinet(),
            admin.fetchUnseatedRuntimes(),
            admin.fetchBots(),
        ]);
        nodes.value = n;
        seats.value = c;
        unseated.value = u;
        bots.value = b;
        for (const node of n) {
            drafts[node.id] = {
                label: node.label ?? "",
                maxSlots: node.maxSlots,
                reservedSlots: node.reservedSlots,
                status: node.status,
            };
        }
    } catch (e) {
        loadError.value = (e as Error).message || "โหลดข้อมูล VPS ไม่สำเร็จ";
    } finally {
        isLoading.value = false;
    }
}

async function saveNode(node: AdminVpsNode): Promise<void> {
    const d = drafts[node.id];
    if (!d) return;
    busyKey.value = `node-${node.id}`;
    try {
        await admin.updateVpsNode(node.id, {
            label: d.label.trim(),
            maxSlots: d.maxSlots,
            reservedSlots: d.reservedSlots,
            status: d.status,
        });
        notify("success", "บันทึก VPS แล้ว");
        await load();
    } catch (e) {
        notify("error", "บันทึกไม่สำเร็จ", (e as Error).message);
    } finally {
        busyKey.value = "";
    }
}

async function toggleMaintenance(seat: AdminSeat): Promise<void> {
    const next = seat.occupancy === "MAINTENANCE" ? "FREE" : "MAINTENANCE";
    busyKey.value = `slot-${seat.slotId}`;
    try {
        await admin.setSlotStatus(seat.nodeId, seat.slotId, next);
        notify("success", next === "MAINTENANCE" ? "ปิดช่องเป็น maintenance แล้ว" : "เปิดช่องกลับมาแล้ว");
        await load();
    } catch (e) {
        notify("error", "เปลี่ยนสถานะช่องไม่สำเร็จ", (e as Error).message);
    } finally {
        busyKey.value = "";
    }
}

function unseatedBotLabel(u: AdminUnseatedRuntime): string {
    if (!u.externalSubjectId) return "ยังไม่ assign บอท";
    return botName.value.get(u.externalSubjectId)?.name ?? u.externalSubjectId.slice(0, 8);
}

function openMove(seat: AdminSeat): void {
    if (!seat.runtimeId) return;
    moveRuntimeId.value = seat.runtimeId;
    moveTitle.value = `ย้าย runtime ของ ${seatBotLabel(seat)}`;
    moveTarget.value = "";
}

function openAssign(u: AdminUnseatedRuntime): void {
    moveRuntimeId.value = u.runtimeId;
    moveTitle.value = `ลงที่นั่งให้ runtime ของ ${unseatedBotLabel(u)}`;
    moveTarget.value = "";
}

async function confirmMove(): Promise<void> {
    if (!moveRuntimeId.value || !moveTarget.value) return;
    busyKey.value = "move";
    try {
        await admin.moveRuntimeSeat(moveRuntimeId.value, moveTarget.value);
        moveRuntimeId.value = "";
        notify("success", "อัปเดตที่นั่ง runtime แล้ว");
        await load();
    } catch (e) {
        notify("error", "ทำรายการไม่สำเร็จ", (e as Error).message);
    } finally {
        busyKey.value = "";
    }
}

onMounted(load);
</script>

<template>
    <AdminLayout title="VPS & Runtime">
        <template #actions>
            <SecondaryButton type="button" width-mode="hug" :disabled="isLoading" @click="load">
                {{ isLoading ? "กำลังโหลด…" : "รีเฟรช" }}
            </SecondaryButton>
        </template>

        <p v-if="loadError" :class="$style.errorBar">{{ loadError }}</p>

        <section v-for="node in nodes" :key="node.id" :class="$style.card">
            <header :class="$style.cardHead">
                <div>
                    <h2 :class="$style.nodeName">{{ node.label || node.name }}</h2>
                    <span :class="$style.nodeMeta">{{ node.region || "—" }} · {{ node.name }}</span>
                </div>
                <div :class="$style.counts">
                    <span :class="$style.count"><strong>{{ node.usedSlots }}</strong> ใช้</span>
                    <span :class="$style.count"><strong>{{ node.freeSlots }}</strong> ว่าง</span>
                    <span :class="$style.count"><strong>{{ node.reservedSlots }}</strong> กันไว้</span>
                    <span :class="$style.count"><strong>{{ node.maxSlots }}</strong> ทั้งหมด</span>
                </div>
            </header>

            <div v-if="drafts[node.id]" :class="$style.editRow">
                <label :class="[$style.field, $style.fieldWide]">
                    <span :class="$style.fieldLabel">ชื่อ VPS (แสดงผล)</span>
                    <input v-model="drafts[node.id]!.label" type="text" :placeholder="node.name" :class="$style.input">
                </label>
                <label :class="$style.field">
                    <span :class="$style.fieldLabel">Max slots</span>
                    <input v-model.number="drafts[node.id]!.maxSlots" type="number" min="0" :class="$style.input">
                </label>
                <label :class="$style.field">
                    <span :class="$style.fieldLabel">Reserved</span>
                    <input v-model.number="drafts[node.id]!.reservedSlots" type="number" min="0" :class="$style.input">
                </label>
                <div :class="$style.field">
                    <SelectField v-model="drafts[node.id]!.status" :class="$style.statusSelect" label="Status" :options="nodeStatusOptions" />
                </div>
                <SecondaryButton
                    :class="$style.rowButton"
                    type="button"
                    width-mode="hug"
                    :disabled="busyKey === `node-${node.id}`"
                    @click="saveNode(node)"
                >
                    {{ busyKey === `node-${node.id}` ? "กำลังบันทึก…" : "บันทึก" }}
                </SecondaryButton>
            </div>

            <div :class="$style.tableWrap">
                <table :class="$style.table">
                    <thead>
                        <tr>
                            <th>ช่อง</th>
                            <th>สถานะ</th>
                            <th>บอท</th>
                            <th>เจ้าของ</th>
                            <th>หมดอายุ</th>
                            <th>จัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="seat in seatsByNode.get(node.id) ?? []" :key="seat.slotId">
                            <td>#{{ seat.slotIndex }}</td>
                            <td>
                                <span :class="[$style.badge, $style[`badge${seat.occupancy}`]]">{{ seat.occupancy }}</span>
                            </td>
                            <td>{{ seatBotLabel(seat) }}</td>
                            <td>{{ seatOwnerLabel(seat) }}</td>
                            <td>{{ formatExpiry(seat.expiresAt) }}</td>
                            <td :class="$style.actionsCell">
                                <SecondaryButton
                                    v-if="seat.occupancy === 'FREE' || seat.occupancy === 'MAINTENANCE'"
                                    type="button"
                                    width-mode="hug"
                                    :disabled="busyKey === `slot-${seat.slotId}`"
                                    @click="toggleMaintenance(seat)"
                                >
                                    {{ seat.occupancy === 'MAINTENANCE' ? "เปิดใช้" : "ปิดซ่อม" }}
                                </SecondaryButton>
                                <SecondaryButton
                                    v-if="seat.occupancy === 'OCCUPIED'"
                                    type="button"
                                    width-mode="hug"
                                    @click="openMove(seat)"
                                >
                                    ย้ายช่อง
                                </SecondaryButton>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <section v-if="unseated.length > 0" :class="$style.card">
            <header :class="$style.cardHead">
                <div>
                    <h2 :class="$style.nodeName">Runtime ที่ยังไม่มีที่นั่ง</h2>
                    <span :class="$style.nodeMeta">active อยู่แต่ไม่ได้ลงช่อง VPS (ข้อมูลเก่า) — กดลงที่นั่งให้นับเป็น slot ที่ใช้</span>
                </div>
                <span :class="$style.count"><strong>{{ unseated.length }}</strong> รายการ</span>
            </header>
            <div :class="$style.tableWrap">
                <table :class="$style.table">
                    <thead>
                        <tr><th>บอท</th><th>หมดอายุ</th><th>จัดการ</th></tr>
                    </thead>
                    <tbody>
                        <tr v-for="u in unseated" :key="u.runtimeId">
                            <td>{{ unseatedBotLabel(u) }}</td>
                            <td>{{ formatExpiry(u.expiresAt) }}</td>
                            <td>
                                <SecondaryButton type="button" width-mode="hug" :disabled="freeSeats.length === 0" @click="openAssign(u)">
                                    ลงที่นั่ง
                                </SecondaryButton>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <p v-if="!isLoading && nodes.length === 0 && !loadError" :class="$style.empty">ยังไม่มี VPS ในระบบ</p>

        <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
            <StatusToast :status="toast.status" :title="toast.title" :description="toast.description" @close="clearToast" />
        </div>

        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="moveRuntimeId" :class="$style.backdrop" @click.self="moveRuntimeId = ''">
                    <section :class="$style.modal" role="dialog" aria-modal="true" tabindex="-1" @keydown.esc.stop="moveRuntimeId = ''">
                        <h2 :class="$style.modalTitle">{{ moveTitle }}</h2>
                        <SelectField v-model="moveTarget" label="ช่องปลายทาง (ว่าง)" :options="freeSeatOptions" />
                        <div :class="$style.modalActions">
                            <SecondaryButton type="button" width-mode="hug" @click="moveRuntimeId = ''">ยกเลิก</SecondaryButton>
                            <SecondaryButton type="button" width-mode="hug" :disabled="!moveTarget || busyKey === 'move'" @click="confirmMove">
                                {{ busyKey === 'move' ? "กำลังบันทึก…" : "ยืนยัน" }}
                            </SecondaryButton>
                        </div>
                    </section>
                </div>
            </Transition>
        </Teleport>
    </AdminLayout>
</template>

<style module>
/* Page-scoped admin card palette — light default + dark override, smooth on toggle. */
.card,
.editRow,
.input,
.select,
.table th,
.table td,
.badge {
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.errorBar,
.empty {
    color: var(--color-text-primary);
}

.errorBar {
    margin: 0;
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--color-status-error);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-status-error) 12%, transparent);
}

.card {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-5);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-2xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
}

.cardHead { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: var(--spacing-space-3); }
.nodeName { margin: 0; font-size: 22px; font-weight: 700; }
.nodeMeta { color: var(--shop-card-muted, var(--color-text-secondary)); font-size: 13px; }

.counts { display: flex; flex-wrap: wrap; gap: var(--spacing-space-3); }
.count { color: var(--shop-card-muted, var(--color-text-secondary)); font-size: 14px; }
.count strong { color: var(--color-text-primary); font-size: 18px; }

.editRow {
    display: grid;
    grid-template-columns: minmax(var(--spacing-space-48), 1.5fr) repeat(3, minmax(var(--spacing-space-32), 1fr)) auto;
    align-items: flex-end;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
}

.field { display: flex; flex-direction: column; gap: var(--spacing-space-2); }
.fieldLabel { color: var(--color-text-secondary); font-size: var(--type-size-input-label); font-weight: 600; text-transform: uppercase; letter-spacing: 0; }

.input,
.select {
    box-sizing: border-box;
    height: var(--spacing-space-12);
    min-height: var(--spacing-space-12);
    padding: 0 var(--spacing-space-4);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-lg);
    background: var(--color-input-bg);
    color: var(--color-text-primary);
    font-size: var(--type-size-body-small);
}

.input,
.statusSelect {
    width: 100%;
}

.fieldWide .input {
    max-width: 100%;
}

.input:focus-visible,
.select:focus-visible { outline: 2px solid var(--color-main-primary); outline-offset: 1px; }

.rowButton {
    height: var(--spacing-space-12);
    min-height: var(--spacing-space-12);
    padding-inline: var(--spacing-space-4);
}

.tableWrap { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: var(--type-size-caption); }
.table th, .table td {
    padding: var(--spacing-space-3);
    text-align: left;
    border-bottom: 1px solid var(--shop-card-border, var(--color-main-divider));
}
.table th { color: var(--color-text-primary); font-size: var(--type-size-caption); text-transform: none; letter-spacing: 0; }
.table tbody tr:hover { background: var(--shop-row-hover); }

.badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: var(--radius-full);
    font-size: 12px;
    font-weight: 700;
}
.badgeFREE { background: color-mix(in srgb, var(--color-text-primary) 10%, transparent); color: var(--color-text-primary); }
.badgeOCCUPIED { background: color-mix(in srgb, var(--color-text-secondary) 10%, transparent); color: var(--color-text-secondary); }
.badgeRESERVED { background: color-mix(in srgb, var(--color-text-secondary) 10%, transparent); color: var(--color-text-secondary); }
.badgeMAINTENANCE { background: color-mix(in srgb, var(--color-text-primary) 10%, transparent); color: var(--color-text-primary); }

.actionsCell { display: flex; flex-wrap: wrap; gap: var(--spacing-space-2); }

.empty { color: var(--shop-card-muted, var(--color-text-secondary)); }

.toastRegion {
    position: fixed;
    right: var(--spacing-space-5);
    bottom: var(--spacing-space-5);
    z-index: 60;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
}

.backdrop {
    position: fixed; inset: 0; z-index: 70;
    display: flex; align-items: center; justify-content: center;
    padding: var(--spacing-space-5);
    background: color-mix(in srgb, var(--color-text-primary) 55%, transparent);
    backdrop-filter: blur(4px);
}
.modal {
    display: flex; flex-direction: column; gap: var(--spacing-space-4);
    width: min(440px, 100%);
    padding: var(--spacing-space-6);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-xl);
    background: var(--color-main-background);
    color: var(--color-text-primary);
}
.modalTitle { margin: 0; font-size: 20px; font-weight: 700; }
.modalActions { display: flex; justify-content: flex-end; gap: var(--spacing-space-3); }

@media (max-width: 1040px) {
    .editRow {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 680px) {
    .editRow {
        grid-template-columns: 1fr;
    }
}
</style>
