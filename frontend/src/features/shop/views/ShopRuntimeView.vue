<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ShopSidebar } from "@/features/shop/components";
import { StatusToast } from "@/shared/ui";
import { API_BASE_URL } from "@/config";
import { useUserStore } from "@/stores";
import type { RuntimePlan } from "@/features/shop/config/catalog";

type ToastStatus = "info" | "success" | "warning" | "error";

interface VpsSlot {
    id: string;
    slotIndex: number;
    occupancy: "FREE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
    mine: boolean;
    runtimeId: string | null;
    assignedBotId: string | null;
    expiresAt: string | null;
}

interface VpsNode {
    id: string;
    name: string;
    label: string | null;
    region: string | null;
    status: string;
    maxSlots: number;
    freeSlots: number;
    slots: VpsSlot[];
}

interface BotLite {
    id: string;
    name: string;
}

const router = useRouter();
const userStore = useUserStore();

const isSidebarOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);
const isLoading = ref(false);
const loadError = ref("");
const isBusy = ref(false);
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);
let toastTimeout: ReturnType<typeof setTimeout> | undefined;

const nodes = ref<VpsNode[]>([]);
const bots = ref<BotLite[]>([]);
const plans = ref<RuntimePlan[]>([]);

// Buy dialog state
const buySlot = ref<VpsSlot | null>(null);
const buyPlanId = ref("");
const buyBotId = ref("");

// Manage dialog state (a seat the user owns)
const manageSlot = ref<VpsSlot | null>(null);
const manageBotId = ref("");

const botName = computed(() => new Map(bots.value.map((b) => [b.id, b.name])));
const sortedPlans = computed(() => [...plans.value].sort((a, b) => a.durationMonths - b.durationMonths));

function clearToast(): void {
    if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = undefined; }
    toast.value = null;
}

function notify(status: ToastStatus, title: string, description = ""): void {
    clearToast();
    toast.value = { status, title, description };
    toastTimeout = setTimeout(clearToast, status === "success" ? 2600 : 5200);
}

async function authHeaders(): Promise<Record<string, string> | null> {
    await userStore.initAuth();
    if (!userStore.accessToken) return null;
    return { Authorization: `Bearer ${userStore.accessToken}` };
}

function formatMoney(satang: number): string {
    return (satang / 100).toLocaleString("th-TH", { minimumFractionDigits: 0 });
}

function formatExpiry(date: string | null): string {
    if (!date) return "-";
    const end = new Date(`${date}T00:00:00`);
    if (Number.isNaN(end.getTime())) return date;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
    if (days < 0) return "หมดอายุแล้ว";
    if (days === 0) return "หมดอายุวันนี้";
    return `เหลือ ${days.toLocaleString("th-TH")} วัน`;
}

function seatLabel(slot: VpsSlot): string {
    if (slot.occupancy === "FREE") return "ว่าง";
    if (slot.occupancy === "RESERVED") return "ระบบ";
    if (slot.occupancy === "MAINTENANCE") return "ปิดซ่อม";
    if (slot.mine) return slot.assignedBotId ? (botName.value.get(slot.assignedBotId) ?? "บอทของฉัน") : "ยังไม่ assign";
    return "ถูกใช้แล้ว";
}

async function parseError(res: Response): Promise<string> {
    try {
        const body = await res.json();
        let reason = String(body.message ?? body.error ?? "");
        const m = reason.match(/"(?:error|message)"\s*:\s*"([^"]+)"/);
        if (m?.[1]) reason = m[1];
        return reason;
    } catch { return ""; }
}

async function load(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        const headers = await authHeaders();
        if (!headers) { await router.push({ name: "login", query: { redirect: "/shop/runtime" } }); return; }
        const [vpsRes, botsRes, plansRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/runtime/vps`, { headers }),
            fetch(`${API_BASE_URL}/api/bots`, { headers }),
            fetch(`${API_BASE_URL}/api/catalog/runtime-plans`, { headers }),
        ]);
        if (!vpsRes.ok || !botsRes.ok || !plansRes.ok) throw new Error("runtime page unavailable");
        nodes.value = await vpsRes.json() as VpsNode[];
        bots.value = await botsRes.json() as BotLite[];
        plans.value = await plansRes.json() as RuntimePlan[];
    } catch {
        nodes.value = []; bots.value = []; plans.value = [];
        loadError.value = "โหลดหน้า Runtime ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
    } finally {
        isLoading.value = false;
    }
}

function openSeat(slot: VpsSlot): void {
    if (slot.occupancy === "FREE") {
        buySlot.value = slot;
        buyPlanId.value = sortedPlans.value[0]?.id ?? "";
        buyBotId.value = "";
    } else if (slot.occupancy === "OCCUPIED" && slot.mine) {
        manageSlot.value = slot;
        manageBotId.value = slot.assignedBotId ?? "";
    }
}

async function confirmBuy(): Promise<void> {
    const slot = buySlot.value;
    if (!slot || !buyPlanId.value) { notify("warning", "เลือกแพ็กก่อน"); return; }
    const headers = await authHeaders();
    if (!headers) { await router.push({ name: "login", query: { redirect: "/shop/runtime" } }); return; }
    isBusy.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/runtime/slots/${slot.id}/purchase`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                runtimePlanId: buyPlanId.value,
                externalSubjectId: buyBotId.value || null,
                idempotencyKey: crypto.randomUUID(),
            }),
        });
        if (!res.ok) throw new Error(await parseError(res) || `HTTP ${res.status}`);
        buySlot.value = null;
        notify("success", "ซื้อ Runtime แล้ว", buyBotId.value ? "บอทออนไลน์แล้ว" : "ซื้อช่องไว้แล้ว — assign ให้บอทได้เลย");
        await load();
    } catch (e) {
        notify("error", "ซื้อ Runtime ไม่สำเร็จ", (e as Error).message || "เครดิตอาจไม่พอ — เติมเงินแล้วลองใหม่");
    } finally {
        isBusy.value = false;
    }
}

async function confirmAssign(unassign = false): Promise<void> {
    const slot = manageSlot.value;
    if (!slot?.runtimeId) return;
    const headers = await authHeaders();
    if (!headers) { await router.push({ name: "login", query: { redirect: "/shop/runtime" } }); return; }
    isBusy.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/runtime/${slot.runtimeId}/assign`, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ externalSubjectId: unassign ? null : (manageBotId.value || null) }),
        });
        if (!res.ok) throw new Error(await parseError(res) || `HTTP ${res.status}`);
        manageSlot.value = null;
        notify("success", unassign ? "ปลด runtime ออกจากบอทแล้ว" : "ย้าย runtime แล้ว", "ตัวที่ใช้ runtime อยู่จะอัปเดตทันที");
        await load();
    } catch (e) {
        notify("error", "อัปเดตไม่สำเร็จ", (e as Error).message || "กรุณาลองใหม่อีกครั้ง");
    } finally {
        isBusy.value = false;
    }
}

async function confirmRenew(): Promise<void> {
    const slot = manageSlot.value;
    if (!slot?.runtimeId) return;
    const headers = await authHeaders();
    if (!headers) { await router.push({ name: "login", query: { redirect: "/shop/runtime" } }); return; }
    isBusy.value = true;
    try {
        const res = await fetch(`${API_BASE_URL}/api/subscriptions/runtime/${slot.runtimeId}/renew`, {
            method: "POST",
            headers,
        });
        if (!res.ok) throw new Error(await parseError(res) || `HTTP ${res.status}`);
        manageSlot.value = null;
        notify("success", "ต่ออายุ Runtime แล้ว");
        await load();
    } catch (e) {
        notify("error", "ต่ออายุไม่สำเร็จ", (e as Error).message || "เครดิตอาจไม่พอ — เติมเงินแล้วลองใหม่");
    } finally {
        isBusy.value = false;
    }
}

onMounted(load);
onUnmounted(clearToast);
</script>

<template>
    <div :class="$style.page">
        <ShopSidebar v-model="isSidebarOpen" />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.head">
                <h1 :class="$style.title">Runtime</h1>
                <div :class="$style.divider" aria-hidden="true" />
                <p :class="$style.lead">เลือกช่องว่างในตู้ VPS เพื่อซื้อ Runtime ให้บอทออนไลน์ — ย้าย runtime ไปบอทอื่นได้ตลอด</p>
            </section>

            <section v-if="loadError" :class="$style.statePanel" aria-live="polite">
                <h2 :class="$style.stateTitle">โหลดข้อมูลไม่สำเร็จ</h2>
                <p :class="$style.stateText">{{ loadError }}</p>
                <button type="button" :class="$style.retry" @click="load">ลองใหม่</button>
            </section>

            <p v-else-if="isLoading" :class="$style.stateText">กำลังโหลดตู้ VPS…</p>

            <template v-else>
                <section v-for="node in nodes" :key="node.id" :class="$style.cabinet">
                    <header :class="$style.cabinetHead">
                        <div>
                            <h2 :class="$style.cabinetName">{{ node.label || node.name }}</h2>
                            <span :class="$style.cabinetMeta">{{ node.region || "—" }} · {{ node.status }}</span>
                        </div>
                        <span :class="$style.cabinetCount">{{ node.freeSlots }} / {{ node.maxSlots }} ว่าง</span>
                    </header>

                    <div :class="$style.seatGrid">
                        <button
                            v-for="slot in node.slots"
                            :key="slot.id"
                            type="button"
                            :class="[
                                $style.seat,
                                slot.occupancy === 'FREE' ? $style.seatFree : '',
                                slot.occupancy === 'OCCUPIED' && slot.mine ? $style.seatMine : '',
                                slot.occupancy === 'OCCUPIED' && !slot.mine ? $style.seatTaken : '',
                                slot.occupancy === 'RESERVED' ? $style.seatReserved : '',
                                slot.occupancy === 'MAINTENANCE' ? $style.seatMaint : '',
                            ]"
                            :disabled="slot.occupancy === 'RESERVED' || slot.occupancy === 'MAINTENANCE' || (slot.occupancy === 'OCCUPIED' && !slot.mine)"
                            @click="openSeat(slot)"
                        >
                            <span :class="$style.seatIndex">#{{ slot.slotIndex }}</span>
                            <span :class="$style.seatLabel">{{ seatLabel(slot) }}</span>
                            <span v-if="slot.occupancy === 'OCCUPIED' && slot.mine" :class="$style.seatExpiry">{{ formatExpiry(slot.expiresAt) }}</span>
                        </button>
                    </div>
                </section>

                <section v-if="nodes.length === 0" :class="$style.statePanel">
                    <h2 :class="$style.stateTitle">ยังไม่มีตู้ VPS</h2>
                    <p :class="$style.stateText">ผู้ดูแลระบบยังไม่ได้เปิดตู้ให้ซื้อ Runtime</p>
                </section>
            </template>

            <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
                <StatusToast :status="toast.status" :title="toast.title" :description="toast.description" @close="clearToast" />
            </div>
        </main>

        <!-- Buy a free seat -->
        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="buySlot" :class="$style.backdrop" @click.self="buySlot = null">
                    <section :class="$style.modal" role="dialog" aria-modal="true">
                        <h2 :class="$style.modalTitle">ซื้อ Runtime — ช่อง #{{ buySlot.slotIndex }}</h2>
                        <fieldset :class="$style.group">
                            <legend :class="$style.groupLabel">เลือกแพ็ก</legend>
                            <label v-for="plan in sortedPlans" :key="plan.id" :class="[$style.option, buyPlanId === plan.id && $style.optionActive]">
                                <input v-model="buyPlanId" type="radio" name="plan" :value="plan.id" :class="$style.radio">
                                <span>{{ plan.durationMonths }} เดือน</span>
                                <span :class="$style.optionPrice">฿{{ formatMoney(plan.effectivePriceSatang) }}</span>
                            </label>
                        </fieldset>
                        <label :class="$style.group">
                            <span :class="$style.groupLabel">Assign ให้บอท (ไม่บังคับ)</span>
                            <select v-model="buyBotId" :class="$style.select">
                                <option value="">— ซื้อไว้ก่อน ยังไม่ assign —</option>
                                <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
                            </select>
                        </label>
                        <div :class="$style.modalActions">
                            <button type="button" :class="$style.cancel" @click="buySlot = null">ยกเลิก</button>
                            <button type="button" :class="$style.confirm" :disabled="isBusy" @click="confirmBuy">{{ isBusy ? "กำลังซื้อ…" : "ซื้อ" }}</button>
                        </div>
                    </section>
                </div>
            </Transition>
        </Teleport>

        <!-- Manage an owned seat -->
        <Teleport to="body">
            <Transition name="dialog">
                <div v-if="manageSlot" :class="$style.backdrop" @click.self="manageSlot = null">
                    <section :class="$style.modal" role="dialog" aria-modal="true">
                        <h2 :class="$style.modalTitle">จัดการ Runtime — ช่อง #{{ manageSlot.slotIndex }}</h2>
                        <p :class="$style.stateText">{{ formatExpiry(manageSlot.expiresAt) }}</p>
                        <label :class="$style.group">
                            <span :class="$style.groupLabel">บอทที่ใช้ runtime นี้</span>
                            <select v-model="manageBotId" :class="$style.select">
                                <option value="">— ไม่ assign —</option>
                                <option v-for="b in bots" :key="b.id" :value="b.id">{{ b.name }}</option>
                            </select>
                        </label>
                        <div :class="$style.modalActions">
                            <button type="button" :class="$style.cancel" @click="manageSlot = null">ปิด</button>
                            <button type="button" :class="$style.ghost" :disabled="isBusy" @click="confirmRenew">ต่ออายุ</button>
                            <button type="button" :class="$style.confirm" :disabled="isBusy" @click="confirmAssign(false)">{{ isBusy ? "กำลังบันทึก…" : "ย้าย/บันทึก" }}</button>
                        </div>
                    </section>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<style module>
.page {
    /* Page-scoped card theme (mirrors Dashboard/Package) so cabinets read light in
       light mode instead of always-dark. Elements consume var(--shop-*, <fallback>). */
    --shop-card-bg: var(--color-neutral-50);
    --shop-card-border: var(--color-input-border);
    --shop-card-text: var(--color-text-primary);
    --shop-card-muted: var(--color-neutral-600);

    display: flex;
    min-height: 100vh;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

:global(.dark) .page,
:global([data-theme="dark"]) .page {
    --shop-card-bg: var(--color-main-surface);
    --shop-card-border: var(--color-main-border);
    --shop-card-text: var(--color-text-secondary);
    --shop-card-muted: var(--color-text-secondary);
}

.content {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    box-sizing: border-box;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-6);
    transition: margin-left 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sidebarOpen { margin-left: 194px; }
.sidebarClosed { margin-left: 44px; }

.head { display: flex; flex-direction: column; gap: var(--spacing-space-3); }
.title { margin: 0; font-size: 32px; font-weight: 600; line-height: 1; }
.divider { height: 1px; background-color: var(--color-main-divider); }
.lead { margin: 0; color: var(--shop-card-muted, var(--color-text-secondary)); font-size: 16px; }

.cabinet {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-5);
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
    transition: background-color 300ms ease, border-color 300ms ease, color 300ms ease;
}

.cabinetHead { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-space-3); }
.cabinetName { margin: 0; color: var(--shop-card-text, var(--color-text-primary)); font-size: 22px; font-weight: 700; }
.cabinetMeta { color: var(--shop-card-muted, var(--color-text-secondary)); font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; }
.cabinetCount { color: var(--color-main-primary); font-weight: 700; }

.seatGrid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--spacing-space-3);
}

.seat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-height: 84px;
    padding: var(--spacing-space-3);
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-md);
    background-color: color-mix(in srgb, var(--shop-card-text, #000) 5%, var(--shop-card-bg, var(--color-main-surface)));
    color: var(--shop-card-text, var(--color-text-primary));
    text-align: left;
    cursor: pointer;
    transition: border-color 160ms ease, transform 160ms ease;
}

.seat:disabled { cursor: not-allowed; opacity: 0.55; }
.seat:not(:disabled):hover { transform: translateY(-2px); border-color: var(--color-main-primary); }

.seatIndex { font-size: 12px; color: var(--shop-card-muted, var(--color-text-secondary)); }
.seatLabel { font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.seatExpiry { font-size: 12px; color: var(--shop-card-muted, var(--color-text-secondary)); }

.seatFree { border-style: dashed; border-color: var(--color-status-success); }
.seatMine { border-color: var(--color-main-primary); background-color: color-mix(in srgb, var(--color-main-primary) 12%, transparent); }
.seatTaken { opacity: 0.7; }
.seatReserved { opacity: 0.7; }
.seatMaint { background-color: color-mix(in srgb, var(--color-status-warning) 16%, transparent); }

.statePanel {
    display: flex;
    max-width: 680px;
    flex-direction: column;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-6);
    border: 1px solid var(--shop-card-border, var(--color-main-border));
    border-radius: var(--radius-xl);
    background-color: var(--shop-card-bg, var(--color-main-surface));
    color: var(--shop-card-text, var(--color-text-secondary));
}

.stateTitle { margin: 0; font-size: 22px; font-weight: 600; }
.stateText { margin: 0; color: var(--shop-card-muted, var(--color-text-secondary)); font-size: 16px; line-height: 1.5; }

.retry {
    align-self: flex-start;
    min-height: 40px;
    padding: 0 var(--spacing-space-5);
    border: 0;
    border-radius: var(--radius-md);
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
    font-weight: 600;
    cursor: pointer;
}

.backdrop {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-space-5);
    background: color-mix(in srgb, #000 55%, transparent);
    backdrop-filter: blur(4px);
}

.modal {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    width: min(440px, 100%);
    padding: var(--spacing-space-6);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-primary);
}

.modalTitle { margin: 0; font-size: 22px; font-weight: 700; }

.group { display: flex; flex-direction: column; gap: var(--spacing-space-2); border: 0; padding: 0; margin: 0; }
.groupLabel { color: var(--color-text-secondary); font-size: 14px; font-weight: 600; }

.option {
    display: flex;
    align-items: center;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-3);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-md);
    cursor: pointer;
}

.optionActive { border-color: var(--color-main-primary); background-color: color-mix(in srgb, var(--color-main-primary) 10%, transparent); }
.optionPrice { margin-left: auto; font-weight: 700; }
.radio { accent-color: var(--color-main-primary); }

.select {
    min-height: 42px;
    padding: 0 var(--spacing-space-3);
    border: 1px solid var(--color-input-border);
    border-radius: var(--radius-md);
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
}

.modalActions { display: flex; justify-content: flex-end; gap: var(--spacing-space-3); flex-wrap: wrap; }

.cancel, .confirm, .ghost {
    min-height: 42px;
    padding: 0 var(--spacing-space-5);
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
}

.cancel { border: 1px solid var(--color-main-border); background: transparent; color: var(--color-text-primary); }
.ghost { border: 1px solid var(--color-main-primary); background: transparent; color: var(--color-main-primary); }
.confirm { border: 0; background-color: var(--color-button-primary-btn-bg); color: var(--color-button-primary-btn-text-active); }
.confirm:hover { background-color: var(--color-button-primary-btn-hover); }
.confirm:disabled, .ghost:disabled { opacity: 0.6; cursor: not-allowed; }

.toastRegion {
    position: fixed;
    right: var(--spacing-space-5);
    bottom: var(--spacing-space-5);
    z-index: 60;
    width: min(360px, calc(100vw - var(--spacing-space-10)));
}

@media (max-width: 760px) {
    .sidebarOpen, .sidebarClosed { margin-left: 44px; }
}
</style>
