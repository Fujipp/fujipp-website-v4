<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ShopSidebar, DiscordEmbedPreview } from "@/features/shop/components";
import type { EmbedObject, ComponentConfig } from "@/features/shop/components";
import { TextField, StatusToast } from "@/shared/ui";
import { API_BASE_URL } from "@/config";
import { useUserStore } from "@/stores";
import { supabase } from "@/shared/lib/supabase";

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

const botId = computed(() => String(route.params.botId ?? ""));
const isSidebarOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);

const slots = ref<EmbedSlot[]>([]);
const selectedKey = ref("");
const draft = ref<EmbedObject | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const loadError = ref("");
const toast = ref<{ status: ToastStatus; title: string; description?: string } | null>(null);

const selected = computed(() => slots.value.find((s) => s.slotKey === selectedKey.value) ?? null);

// Editable component roles per slot (custom_id/behavior stay fixed in the bot).
type RoleType = "button" | "select" | "link";
interface Role { key: string; label: string; type: RoleType }
const COMPONENT_ROLES: Record<string, Role[]> = {
    shop_panel: [
        { key: "group_select", label: "เมนูเลือกกลุ่ม", type: "select" },
        { key: "btn_topup", label: "ปุ่ม เติมเงิน", type: "button" },
        { key: "btn_buy", label: "ปุ่ม ซื้อสินค้า", type: "button" },
        { key: "btn_balance", label: "ปุ่ม เช็คยอด", type: "button" },
        { key: "btn_link", label: "ปุ่ม ลิงก์กลุ่ม", type: "link" },
    ],
    topup_method: [
        { key: "method_select", label: "เมนูช่องทางเติมเงิน", type: "select" },
    ],
};
const BUTTON_STYLES = [
    { value: "primary", label: "น้ำเงิน (primary)" },
    { value: "secondary", label: "เทา (secondary)" },
    { value: "success", label: "เขียว (success)" },
    { value: "danger", label: "แดง (danger)" },
];
const roles = computed<Role[]>(() => COMPONENT_ROLES[selectedKey.value] ?? []);

function notify(status: ToastStatus, title: string, description?: string): void {
    toast.value = { status, title, description };
}

// Authenticated fetch that self-heals a stale token: if the first try is 401
// (e.g. the access token expired while the page sat open / on a hard reload before
// the background refresh landed), refresh the session once and retry. Returns null
// only when there is no session at all (then we send the user to login).
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
    if (res.status === 401) {
        // Token rejected — try a refresh once. If the session can't be recovered
        // (refresh token also expired), send the user to login instead of failing.
        const { data } = await supabase.auth.refreshSession();
        token = data.session?.access_token ?? null;
        if (token) res = await send(token);
        if (!token || res.status === 401) {
            await router.push({ name: "login", query: { redirect: route.fullPath } });
            return null;
        }
    }
    return res;
}

// Deep clone via JSON — embeds are pure JSON, and JSON.parse(stringify) also strips
// Vue's reactive Proxy wrapper (which structuredClone refuses to clone).
function cloneEmbed(embed: EmbedObject): EmbedObject {
    return JSON.parse(JSON.stringify(embed ?? {}));
}

// Ensure the nested objects the editor binds to exist.
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
    if (!editableRoles.length) return embed;
    embed.components = embed.components ?? {};
    for (const role of editableRoles) {
        embed.components[role.key] = embed.components[role.key] ?? {};
    }
    return embed;
}

function selectSlot(key: string): void {
    selectedKey.value = key;
    const slot = slots.value.find((s) => s.slotKey === key);
    draft.value = slot ? ensureComponentRoles(normalize(slot.embed), key) : null;
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

function addField(): void {
    if (!draft.value) return;
    if (!draft.value.fields) draft.value.fields = [];
    draft.value.fields.push({ name: "", value: "", inline: false });
}

function removeField(index: number): void {
    draft.value?.fields?.splice(index, 1);
}

function componentConfig(roleKey: string): ComponentConfig {
    if (!draft.value) return {};
    draft.value.components = draft.value.components ?? {};
    draft.value.components[roleKey] = draft.value.components[roleKey] ?? {};
    return draft.value.components[roleKey];
}

function cleanComponent(role: Role, cfg: ComponentConfig): ComponentConfig | null {
    const out: ComponentConfig = {};
    const label = cfg.label?.trim();
    const emoji = cfg.emoji?.trim();
    const style = cfg.style?.trim();
    const placeholder = cfg.placeholder?.trim();
    const url = cfg.url?.trim();

    if (role.type !== "select" && label) out.label = label;
    if (emoji) out.emoji = emoji;
    if (role.type === "button" && style) out.style = style;
    if (role.type === "select" && placeholder) out.placeholder = placeholder;
    if (role.type === "link" && url) out.url = url;
    return Object.keys(out).length ? out : null;
}

// Strip the editor's helper-empty nested objects so we don't persist blank fields.
function clean(embed: EmbedObject): EmbedObject {
    const e: EmbedObject = cloneEmbed(embed);
    if (!e.image?.url) delete e.image;
    if (!e.thumbnail?.url) delete e.thumbnail;
    if (!e.footer?.text) delete e.footer;
    if (!e.author?.name) delete e.author;
    if (e.fields) {
        e.fields = e.fields.filter((f) => (f.name && f.name.trim()) || (f.value && f.value.trim()));
        if (e.fields.length === 0) delete e.fields;
    }
    const editableRoles = COMPONENT_ROLES[selectedKey.value] ?? [];
    if (e.components && editableRoles.length) {
        const kept: Record<string, ComponentConfig> = {};
        for (const role of editableRoles) {
            const cfg = e.components[role.key];
            if (!cfg) continue;
            const cleaned = cleanComponent(role, cfg);
            if (cleaned) kept[role.key] = cleaned;
        }
        if (Object.keys(kept).length) e.components = kept;
        else delete e.components;
    }
    return e;
}

async function loadSlots(): Promise<void> {
    isLoading.value = true;
    loadError.value = "";
    try {
        const res = await authedFetch(`${API_BASE_URL}/api/bots/${botId.value}/embeds`);
        if (!res) return;
        if (!res.ok) {
            let body = "";
            try { body = (await res.text()).slice(0, 300); } catch { /* ignore */ }
            throw new Error(`HTTP ${res.status}${body ? ` — ${body}` : ""}`);
        }
        slots.value = (await res.json()) as EmbedSlot[];
        const first = slots.value[0];
        if (first) selectSlot(first.slotKey);
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
        const res = await authedFetch(`${API_BASE_URL}/api/bots/${botId.value}/embeds/${selected.value.slotKey}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(clean(draft.value)),
        });
        if (!res) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const slot = slots.value.find((s) => s.slotKey === selectedKey.value);
        if (slot) { slot.embed = clean(draft.value); slot.overridden = true; }
        notify("success", "บันทึก Embed แล้ว");
    } catch {
        notify("error", "บันทึกไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
    } finally {
        isSaving.value = false;
    }
}

onMounted(loadSlots);
</script>

<template>
    <div :class="$style.page">
        <ShopSidebar v-model="isSidebarOpen" />

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.titleSection">
                <div>
                    <h1 :class="$style.pageTitle" class="type-h1-page-title-sb">EMBED DESIGNER</h1>
                    <p :class="$style.subtitle" class="type-body-small-r">ปรับแต่งหน้าตา embed ของบอท · {{ botId || "—" }}</p>
                </div>
                <button type="button" :class="$style.backButton" @click="router.push({ name: 'shop-bot-config', params: { botId } })">
                    ← กลับไป Config
                </button>
            </section>
            <div :class="$style.divider" aria-hidden="true" />

            <p v-if="isLoading" :class="$style.state" class="type-body-small-r">กำลังโหลด…</p>
            <section v-else-if="loadError" :class="$style.statePanel">
                <p :class="$style.stateText">{{ loadError }}</p>
                <button type="button" :class="$style.retryButton" @click="loadSlots">ลองใหม่</button>
            </section>

            <div v-else :class="$style.layout">
                <!-- slot list -->
                <nav :class="$style.slotList">
                    <button
                        v-for="slot in slots"
                        :key="slot.slotKey"
                        type="button"
                        :class="[$style.slotItem, slot.slotKey === selectedKey ? $style.slotActive : '']"
                        @click="selectSlot(slot.slotKey)"
                    >
                        <span>{{ slot.label }}</span>
                        <span v-if="slot.overridden" :class="$style.dot" title="แก้ไขแล้ว" />
                    </button>
                </nav>

                <!-- editor + preview -->
                <div v-if="draft && selected" :class="$style.editor">
                    <div :class="$style.formCol">
                        <p :class="$style.slotDesc" class="type-body-small-r">{{ selected.description }}</p>

                        <label :class="$style.colorRow">
                            <span>สี</span>
                            <input v-model="colorHex" type="color" :class="$style.colorInput" />
                        </label>

                        <TextField v-model="draft.title" label="หัวข้อ (title)" placeholder="ใส่ข้อความ + emoji ได้" />

                        <label :class="$style.fieldLabel">รายละเอียด (description)</label>
                        <textarea v-model="draft.description" :class="$style.textarea" rows="5" placeholder="รองรับ markdown + ตัวแปร + custom emoji" />

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

                        <div :class="$style.grid2">
                            <TextField v-model="draft.image!.url" label="รูปใหญ่ (image url)" placeholder="https://" />
                            <TextField v-model="draft.thumbnail!.url" label="รูปย่อ (thumbnail url)" placeholder="https://" />
                        </div>
                        <div :class="$style.grid2">
                            <TextField v-model="draft.author!.name" label="ผู้เขียน (author)" placeholder="(ไม่บังคับ)" />
                            <TextField v-model="draft.footer!.text" label="ท้าย (footer)" placeholder="(ไม่บังคับ)" />
                        </div>

                        <div :class="$style.fieldsEditor">
                            <div :class="$style.fieldsHead">
                                <span :class="$style.fieldLabel">ช่อง (fields)</span>
                                <button type="button" :class="$style.addBtn" @click="addField">+ เพิ่มช่อง</button>
                            </div>
                            <div v-for="(f, i) in draft.fields ?? []" :key="i" :class="$style.fieldRow">
                                <TextField v-model="f.name" label="ชื่อช่อง" placeholder="ชื่อ + emoji" />
                                <TextField v-model="f.value" label="ค่า" placeholder="รองรับ markdown + ตัวแปร" />
                                <label :class="$style.inlineToggle"><input type="checkbox" v-model="f.inline" /> inline</label>
                                <button type="button" :class="$style.removeBtn" @click="removeField(i)">ลบ</button>
                            </div>
                        </div>

                        <div v-if="roles.length" :class="$style.componentsEditor">
                            <div :class="$style.fieldsHead">
                                <span :class="$style.fieldLabel">ปุ่ม / Dropdown</span>
                                <span :class="$style.helperText">แก้เฉพาะหน้าตา · custom_id คงที่</span>
                            </div>

                            <div v-for="role in roles" :key="role.key" :class="$style.componentRow">
                                <div :class="$style.componentTitle">
                                    <span>{{ role.label }}</span>
                                    <code>{{ role.key }}</code>
                                </div>

                                <div :class="$style.grid2">
                                    <TextField
                                        v-if="role.type !== 'select'"
                                        v-model="componentConfig(role.key).label"
                                        label="Label"
                                        placeholder="ข้อความบนปุ่ม"
                                    />
                                    <TextField v-model="componentConfig(role.key).emoji" label="Emoji" placeholder="😀 หรือ <:name:id>" />
                                </div>

                                <div v-if="role.type === 'button'" :class="$style.selectField">
                                    <label :class="$style.fieldLabel">Style</label>
                                    <select v-model="componentConfig(role.key).style" :class="$style.nativeSelect">
                                        <option value="">ค่าเริ่มต้น</option>
                                        <option v-for="style in BUTTON_STYLES" :key="style.value" :value="style.value">
                                            {{ style.label }}
                                        </option>
                                    </select>
                                </div>

                                <TextField
                                    v-if="role.type === 'select'"
                                    v-model="componentConfig(role.key).placeholder"
                                    label="Placeholder"
                                    placeholder="ข้อความใน dropdown"
                                />

                                <TextField
                                    v-if="role.type === 'link'"
                                    v-model="componentConfig(role.key).url"
                                    label="URL"
                                    placeholder="https://"
                                />
                            </div>
                        </div>

                        <button type="button" :class="$style.saveButton" :disabled="isSaving" @click="save">
                            {{ isSaving ? "กำลังบันทึก…" : "บันทึก Embed" }}
                        </button>
                    </div>

                    <div :class="$style.previewCol">
                        <span :class="$style.previewLabel" class="type-body-small-r">พรีวิว</span>
                        <DiscordEmbedPreview :embed="draft" :slot-key="selectedKey" />
                        <p :class="$style.previewHint" class="type-body-small-r">
                            custom emoji วาง <code>&lt;:name:id&gt;</code> จากเซิร์ฟเวอร์ Discord ได้
                        </p>
                    </div>
                </div>
            </div>
        </main>

        <div v-if="toast" :class="$style.toastRegion" aria-live="polite">
            <StatusToast :status="toast.status" :title="toast.title" :description="toast.description" @close="toast = null" />
        </div>
    </div>
</template>

<style module>
.page { display: flex; min-height: 100vh; background: var(--color-main-background); color: var(--color-text-primary); }
.content { display: flex; min-width: 0; flex: 1; flex-direction: column; box-sizing: border-box; padding: var(--spacing-space-6); gap: var(--spacing-space-6); transition: margin-left 180ms ease; }
.sidebarOpen { margin-left: 194px; }
.sidebarClosed { margin-left: 44px; }

.titleSection { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--spacing-space-4); }
.pageTitle { margin: 0; color: var(--color-text-primary); }
.subtitle { margin: 4px 0 0; color: var(--color-text-secondary); }
.divider { height: 1px; background-color: var(--color-main-divider); }
.backButton { height: 38px; padding: 0 var(--spacing-space-4); border: 1px solid var(--color-main-border); border-radius: var(--radius-full); background: var(--color-main-surface); color: var(--color-text-secondary); cursor: pointer; white-space: nowrap; }

.state { color: var(--color-text-secondary); }
.statePanel { padding: var(--spacing-space-5); border: 1px solid var(--color-main-border); border-radius: var(--radius-lg); }
.stateText { color: var(--color-text-secondary); margin: 0 0 var(--spacing-space-3); }
.retryButton { height: 38px; padding: 0 var(--spacing-space-4); border: 0; border-radius: var(--radius-full); background: var(--color-button-primary-btn-bg); color: var(--color-button-primary-btn-text-active); cursor: pointer; }

.layout { display: grid; grid-template-columns: 220px 1fr; gap: var(--spacing-space-5); align-items: start; }

.slotList { display: flex; flex-direction: column; gap: 4px; }
.slotItem { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 12px; border: 1px solid transparent; border-radius: var(--radius-lg); background: var(--color-main-surface); color: var(--color-text-secondary); font-size: 14px; cursor: pointer; text-align: left; }
.slotActive { border-color: var(--color-main-primary); color: var(--color-text-secondary); }
.dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-main-primary); flex-shrink: 0; }

.editor { display: grid; grid-template-columns: 1fr 460px; gap: var(--spacing-space-5); align-items: start; }
.formCol { display: flex; flex-direction: column; gap: var(--spacing-space-3); min-width: 0; }
.slotDesc { margin: 0 0 var(--spacing-space-1); color: var(--color-text-secondary); }

.colorRow { display: flex; align-items: center; gap: var(--spacing-space-3); color: var(--color-text-secondary); font-size: 14px; }
.colorInput { width: 48px; height: 32px; padding: 0; border: 1px solid var(--color-main-border); border-radius: 6px; background: none; cursor: pointer; }

.fieldLabel { color: var(--color-text-secondary); font-size: 14px; }
.textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--color-main-border); border-radius: var(--radius-lg); background: var(--color-main-surface); color: var(--color-text-secondary); font-family: var(--font-sans); font-size: 14px; resize: vertical; }

.vars { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.varsLabel { color: var(--color-text-secondary); font-size: 13px; }
.varChip { padding: 3px 8px; border: 1px solid var(--color-main-border); border-radius: var(--radius-full); background: var(--color-main-surface); color: var(--color-text-secondary); font-size: 12px; font-family: monospace; cursor: pointer; }
.varChip:hover { border-color: var(--color-main-primary); color: var(--color-text-secondary); }

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-space-3); }

.fieldsEditor { display: flex; flex-direction: column; gap: var(--spacing-space-2); }
.fieldsHead { display: flex; align-items: center; justify-content: space-between; }
.helperText { color: var(--color-text-secondary); font-size: 12px; }
.addBtn { padding: 4px 10px; border: 1px solid var(--color-main-border); border-radius: var(--radius-full); background: var(--color-main-surface); color: var(--color-text-secondary); font-size: 13px; cursor: pointer; }
.addBtn:hover { border-color: var(--color-main-primary); color: var(--color-text-secondary); }
.fieldRow { display: grid; grid-template-columns: 1fr 1fr auto auto; align-items: end; gap: var(--spacing-space-2); padding: var(--spacing-space-2); border: 1px solid var(--color-main-divider); border-radius: var(--radius-lg); }
.inlineToggle { display: inline-flex; align-items: center; gap: 4px; color: var(--color-text-secondary); font-size: 12px; white-space: nowrap; padding-bottom: 10px; }
.inlineToggle input { accent-color: var(--color-main-primary); }
.removeBtn { height: 34px; padding: 0 10px; border: 0; border-radius: var(--radius-lg); background: var(--color-status-error); color: #fff; font-size: 13px; cursor: pointer; }

.componentsEditor { display: flex; flex-direction: column; gap: var(--spacing-space-2); margin-top: var(--spacing-space-2); }
.componentRow { display: flex; flex-direction: column; gap: var(--spacing-space-2); padding: var(--spacing-space-3); border: 1px solid var(--color-main-divider); border-radius: var(--radius-lg); background: var(--color-main-surface); }
.componentTitle { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-space-2); color: var(--color-text-secondary); font-size: 14px; font-weight: 600; }
.componentTitle code { color: var(--color-text-secondary); font-family: monospace; font-size: 12px; font-weight: 400; }
.selectField { display: flex; flex-direction: column; gap: 6px; }
.nativeSelect { width: 100%; height: 40px; padding: 0 12px; border: 1px solid var(--color-main-border); border-radius: var(--radius-lg); background: var(--color-main-background); color: var(--color-text-primary); font-family: var(--font-sans); font-size: 14px; }

@media (max-width: 700px) { .fieldRow { grid-template-columns: 1fr 1fr; } }

.saveButton { margin-top: var(--spacing-space-2); height: 44px; border: 0; border-radius: var(--radius-xl); background: var(--color-button-primary-btn-bg); color: var(--color-button-primary-btn-text-active); font-weight: 600; font-size: 15px; cursor: pointer; }
.saveButton:disabled { opacity: 0.55; cursor: not-allowed; }

.previewCol { position: sticky; top: var(--spacing-space-4); display: flex; flex-direction: column; gap: var(--spacing-space-2); }
.previewLabel { color: var(--color-text-secondary); }
.previewHint { margin: 0; color: var(--color-text-secondary); }
.previewHint code { background: var(--color-main-surface); padding: 0 4px; border-radius: 4px; }

.toastRegion { position: fixed; right: var(--spacing-space-5); bottom: var(--spacing-space-5); z-index: 1000; }

@media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
    .editor { grid-template-columns: 1fr; }
    .previewCol { position: static; }
}

@media (max-width: 760px) {
    .sidebarOpen, .sidebarClosed { margin-left: 44px; }
    .content { padding: var(--spacing-space-5); }
    .titleSection { flex-direction: column; }
}
</style>
