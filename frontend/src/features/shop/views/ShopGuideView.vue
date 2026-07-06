<script setup lang="ts">
import { ref } from "vue";

const isSidebarOpen = ref(typeof window === "undefined" ? true : window.innerWidth > 760);

const guideSteps = [
    {
        label: "01",
        title: "Create bot",
        detail: "สร้างบอทจาก Dashboard ใส่ Discord token และเลือก runtime เริ่มต้นถ้ามี plan พร้อมขาย",
        action: "เปิด Dashboard",
        to: "shop-dashboard",
    },
    {
        label: "02",
        title: "Prepare wallet",
        detail: "เติมเครดิตก่อนซื้อ runtime หรือ feature ระบบใช้ QR + สลิปเพื่อยืนยันยอด",
        action: "เติม Wallet",
        to: "shop-wallet",
    },
    {
        label: "03",
        title: "Buy package",
        detail: "Runtime คือเวลาออนไลน์ ส่วน feature คือความสามารถของบอท รายการที่ผูกบอทต้องเลือกบอทตอนซื้อ",
        action: "เลือก Package",
        to: "shop-package",
    },
    {
        label: "04",
        title: "Configure",
        detail: "ตั้งค่า channel, role, wallet, Roblox, review, embed และข้อมูลที่ feature แต่ละตัวต้องใช้",
        action: "กลับ Dashboard",
        to: "shop-dashboard",
    },
    {
        label: "05",
        title: "Start and monitor",
        detail: "หลัง config พร้อมค่อย start บอท แล้วดู runtime/subscription เพื่อรู้ว่าต้องต่ออายุหรือเติมเครดิตเมื่อไร",
        action: "ดูสถานะ",
        to: "shop-dashboard",
    },
] as const;

const checklist = [
    "บอทมี token และ Discord application/guild ที่ถูกต้อง",
    "บอทมี runtime active ก่อน start",
    "feature ที่ต้องผูกบอทถูกซื้อให้บอทตัวนั้นแล้ว",
    "config สำคัญไม่ว่าง เช่น channel, role, wallet address หรือ webhook",
    "wallet มีเครดิตเผื่อ renewal หรือซื้อ feature เพิ่ม",
] as const;

const troubleshooting = [
    {
        title: "ซื้อไม่ได้",
        detail: "เช็ก wallet balance และดูว่ารายการนั้นต้องเลือกบอทหรือไม่ ถ้ายังไม่มีบอทให้สร้างจาก Dashboard ก่อน",
    },
    {
        title: "Start แล้วไม่ขึ้น online",
        detail: "เปิด config ของบอท เช็ก token, guild, channel/role และ restart หลังแก้ config",
    },
    {
        title: "เติมเงินไม่เข้า",
        detail: "ใช้สลิปจากแอปธนาคารตัวจริง ยอดต้องตรงกับ QR และสลิปหนึ่งใบใช้ยืนยันได้ครั้งเดียว",
    },
] as const;
</script>

<template>
    <div :class="$style.shopGuide">

        <main :class="[$style.content, isSidebarOpen ? $style.sidebarOpen : $style.sidebarClosed]">
            <section :class="$style.titleSection" aria-labelledby="shop-guide-title">
                <div>
                    <h1 id="shop-guide-title" :class="$style.pageTitle">SHOP GUIDE</h1>
                    <p :class="$style.pageLead">
                        คู่มือใช้งานร้านสำหรับสร้างบอท ซื้อบริการ ตั้งค่า และดูแล runtime แบบไม่ต้องเดาทางเอง
                    </p>
                </div>
                <div :class="$style.quickActions">
                    <RouterLink :class="$style.primaryLink" :to="{ name: 'shop-dashboard' }">Dashboard</RouterLink>
                    <RouterLink :class="$style.secondaryLink" :to="{ name: 'shop-package' }">Package</RouterLink>
                </div>
            </section>

            <section :class="$style.guidePanel" aria-labelledby="guide-flow-title">
                <div :class="$style.panelHeader">
                    <h2 id="guide-flow-title" :class="$style.sectionTitle">Service flow</h2>
                    <p :class="$style.sectionLead">ลำดับที่ควรทำจริงเวลาจะเปิดบอทให้ลูกค้าใช้งาน</p>
                </div>

                <ol :class="$style.stepGrid">
                    <li v-for="step in guideSteps" :key="step.label" :class="$style.stepCard">
                        <span :class="$style.stepLabel">{{ step.label }}</span>
                        <strong :class="$style.stepTitle">{{ step.title }}</strong>
                        <span :class="$style.stepDetail">{{ step.detail }}</span>
                        <RouterLink :class="$style.stepAction" :to="{ name: step.to }">{{ step.action }}</RouterLink>
                    </li>
                </ol>
            </section>

            <section :class="$style.twoColumn">
                <article :class="$style.guidePanel" aria-labelledby="guide-checklist-title">
                    <div :class="$style.panelHeader">
                        <h2 id="guide-checklist-title" :class="$style.sectionTitle">Before start</h2>
                        <p :class="$style.sectionLead">เช็กก่อนกด start เพื่อลด error จาก Discord หรือ config ที่ยังไม่ครบ</p>
                    </div>
                    <ul :class="$style.checkList">
                        <li v-for="item in checklist" :key="item" :class="$style.checkItem">{{ item }}</li>
                    </ul>
                </article>

                <article :class="$style.guidePanel" aria-labelledby="guide-trouble-title">
                    <div :class="$style.panelHeader">
                        <h2 id="guide-trouble-title" :class="$style.sectionTitle">Troubleshooting</h2>
                        <p :class="$style.sectionLead">เคสที่ผู้ใช้เจอบ่อยและควรเช็กก่อนส่งต่อให้ admin</p>
                    </div>
                    <div :class="$style.troubleList">
                        <section v-for="item in troubleshooting" :key="item.title" :class="$style.troubleItem">
                            <strong :class="$style.troubleTitle">{{ item.title }}</strong>
                            <p :class="$style.troubleDetail">{{ item.detail }}</p>
                        </section>
                    </div>
                </article>
            </section>
        </main>
    </div>
</template>

<style module>
.shopGuide {
    display: flex;
    min-height: 100vh;
    background-color: var(--color-main-background);
    color: var(--color-text-primary);
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

.sidebarOpen {
    margin-left: 194px;
}

.sidebarClosed {
    margin-left: 44px;
}

.titleSection {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--spacing-space-5);
    padding-bottom: var(--spacing-space-4);
    border-bottom: 1px solid var(--color-main-divider);
}

.pageTitle,
.pageLead,
.sectionTitle,
.sectionLead,
.troubleDetail {
    margin: 0;
}

.pageTitle {
    color: var(--color-text-primary);
    font-size: 32px;
    font-weight: 600;
    line-height: 1;
}

.pageLead {
    max-width: 760px;
    margin-top: var(--spacing-space-2);
    color: var(--color-text-disabled);
    font-size: 16px;
    line-height: 1.5;
}

.quickActions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-space-3);
}

.primaryLink,
.secondaryLink,
.stepAction {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 var(--spacing-space-4);
    border-radius: var(--radius-lg);
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
}

.primaryLink,
.stepAction {
    border: 0;
    background-color: var(--color-button-primary-btn-bg);
    color: var(--color-button-primary-btn-text-active);
}

.secondaryLink {
    border: 1px solid var(--color-main-divider);
    color: var(--color-text-secondary);
}

.primaryLink:hover,
.stepAction:hover {
    background-color: var(--color-button-primary-btn-hover);
}

.secondaryLink:hover {
    border-color: var(--color-main-primary);
}

.primaryLink:focus-visible,
.secondaryLink:focus-visible,
.stepAction:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.guidePanel {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-4);
    padding: var(--spacing-space-5);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
}

.panelHeader {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-2);
}

.sectionTitle {
    color: var(--color-text-secondary);
    font-size: 24px;
    font-weight: 700;
    line-height: 1.15;
}

.sectionLead {
    color: color-mix(in srgb, var(--color-text-secondary) 74%, transparent);
    font-size: 15px;
    line-height: 1.55;
}

.stepGrid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: var(--spacing-space-3);
    margin: 0;
    padding: 0;
    list-style: none;
}

.stepCard {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: var(--spacing-space-3);
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-xl);
    background-color: color-mix(in srgb, var(--color-main-background) 70%, var(--color-main-surface) 30%);
}

.stepLabel {
    color: var(--color-main-primary);
    font-size: 13px;
    font-weight: 800;
}

.stepTitle {
    color: var(--color-text-secondary);
    font-size: 18px;
    line-height: 1.2;
}

.stepDetail {
    flex: 1;
    color: color-mix(in srgb, var(--color-text-secondary) 72%, transparent);
    font-size: 13px;
    line-height: 1.45;
}

.twoColumn {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--spacing-space-5);
}

.checkList {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
    margin: 0;
    padding: 0;
    list-style: none;
}

.checkItem {
    padding: var(--spacing-space-3) var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
    color: var(--color-text-secondary);
    font-size: 14px;
    line-height: 1.45;
}

.troubleList {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-space-3);
}

.troubleItem {
    padding: var(--spacing-space-4);
    border: 1px solid var(--color-main-divider);
    border-radius: var(--radius-lg);
}

.troubleTitle {
    color: var(--color-text-secondary);
    font-size: 16px;
}

.troubleDetail {
    margin-top: var(--spacing-space-2);
    color: color-mix(in srgb, var(--color-text-secondary) 72%, transparent);
    font-size: 14px;
    line-height: 1.5;
}

@media (max-width: 1180px) {
    .stepGrid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}

@media (max-width: 920px) {
    .titleSection {
        align-items: flex-start;
        flex-direction: column;
    }

    .stepGrid,
    .twoColumn {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 760px) {
    .content {
        padding: var(--spacing-space-5) var(--spacing-space-3) var(--spacing-space-10);
    }

    .sidebarOpen,
    .sidebarClosed {
        margin-left: 44px;
    }
}
</style>
