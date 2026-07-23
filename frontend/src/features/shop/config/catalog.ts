// Shop catalog model — frontend mirror of billing CatalogController DTOs
// (FeatureResponse / FeaturePriceResponse / RuntimePlanResponse) and the
// PurchaseRequest shape consumed by the order endpoint.

export type PriceKind = "RENT_MONTHLY" | "RENT_PERMANENT" | "SOURCE_CODE";

export interface CatalogPrice {
    // priceId (UUID) — required to purchase.
    id: string;
    kind: PriceKind;
    priceSatang: number;
    effectivePriceSatang: number;
    onPromotion: boolean;
    promotionLabel?: string;
    durationMonths?: number | null;
}

export interface CatalogFeature {
    id: string;
    code: string;
    name: string;
    description: string;
    iconKey: string;
    category: string;
    featured: boolean;
    prices: CatalogPrice[];
}

export interface RuntimePlan {
    id: string;
    code: string;
    name: string;
    durationMonths: number;
    priceSatang: number;
    effectivePriceSatang: number;
    onPromotion: boolean;
    promotionLabel?: string;
    featured: boolean;
}

export interface BotOption {
    id: string;
    name: string;
}

type CatalogLocale = "en" | "th";

const featureCopy: Record<string, Record<CatalogLocale, { name: string; description: string }>> = {
    "roblox-robux-payout": {
        en: { name: "Roblox Robux Payout", description: "Automatically pay Robux from Roblox groups with 2FA support, eligibility checks, and group balance tracking. Requires Shop Wallet & Top-up for member wallet deductions." },
        th: { name: "ระบบจ่าย Roblox Robux", description: "จ่าย Robux ออกจากกลุ่ม Roblox อัตโนมัติ รองรับ 2FA ตรวจสอบสิทธิ์รับ Robux และดูยอดกลุ่ม ต้องใช้คู่กับ Shop Wallet & Top-up เพื่อหักยอดจากกระเป๋าสมาชิก" },
    },
    "wallet-topup": {
        en: { name: "Shop Wallet & Top-up", description: "A Discord shop wallet with SlipOK and TrueMoney Wallet top-ups, member balances, and server top-up history." },
        th: { name: "กระเป๋าร้านและระบบเติมเงิน", description: "กระเป๋าเงินร้านในบอท เติมเงินผ่าน SlipOK และ TrueMoney Wallet พร้อมเก็บยอดและประวัติการเติมเงินของสมาชิกในเซิร์ฟเวอร์" },
    },
    "wallet-history": {
        en: { name: "Wallet History", description: "View member top-up history from the ledger and let administrators review or adjust balances. Works with Shop Wallet & Top-up." },
        th: { name: "ประวัติกระเป๋าเงิน", description: "ดูประวัติการเติมเงินจากบัญชีรายการ และให้แอดมินตรวจสอบหรือตั้งยอดเงิน ใช้คู่กับ Shop Wallet & Top-up" },
    },
    "top-spender-rank": {
        en: { name: "Top Spender Rank", description: "Rank members by lifetime top-ups and automatically award Top 1, Top 10, and spending milestone roles." },
        th: { name: "อันดับผู้เติมสูงสุด", description: "จัดอันดับยอดเติมสะสม พร้อมแจกยศ Top 1, Top 10 และยศตามยอดสะสมโดยอัตโนมัติ" },
    },
    "review-credit": {
        en: { name: "Review Credit", description: "Automatically count member reviews, add reactions, send thank-you replies, rename the review channel, and optionally award customer roles." },
        th: { name: "ระบบนับเครดิตรีวิว", description: "นับรีวิวของสมาชิกอัตโนมัติ กดรีแอคชัน ส่งข้อความขอบคุณ เปลี่ยนชื่อห้องตามจำนวนรีวิว และเลือกแจกยศลูกค้าได้" },
    },
    "voice-keeper": {
        en: { name: "Voice Keeper", description: "Keep your bot connected to a voice channel around the clock, automatically reconnecting after disconnects, moves, or restarts." },
        th: { name: "บอทอยู่ห้องเสียง", description: "ให้บอทอยู่ในห้องเสียงตลอด 24 ชั่วโมง และเชื่อมต่อกลับอัตโนมัติเมื่อหลุด ถูกย้าย หรือรีสตาร์ต" },
    },
    "server-log": {
        en: { name: "Server Log", description: "Record message, member, moderation, channel, and voice events to configurable Discord webhook embeds." },
        th: { name: "บันทึกเหตุการณ์เซิร์ฟเวอร์", description: "บันทึกเหตุการณ์ข้อความ สมาชิก การดูแล ห้อง และห้องเสียง แล้วส่งเป็น Discord webhook embed ที่ปรับแต่งได้" },
    },
    "price-board": {
        en: { name: "Price Board", description: "Post a Roblox price board with category buttons, up to eight configurable price categories, and optional automatic reposting." },
        th: { name: "บอร์ดราคา", description: "โพสต์บอร์ดราคา Roblox พร้อมปุ่มหมวดหมู่ รองรับราคาที่ปรับแต่งได้สูงสุด 8 หมวด และตั้งเวลาโพสต์ซ้ำอัตโนมัติได้" },
    },
    "order-management": {
        en: { name: "Order Management", description: "Record orders, publish configurable order summaries, and maintain per-channel order counters using the built-in or your own database." },
        th: { name: "จัดการออเดอร์", description: "บันทึกออเดอร์ โพสต์สรุปรายการที่ปรับแต่งได้ และนับลำดับออเดอร์แยกตามห้องด้วยฐานข้อมูลของระบบหรือของร้าน" },
    },
    "member-spending": {
        en: { name: "Member Spending Card", description: "Track manually entered customer spending, publish membership cards, award milestone roles, and maintain Top 1 and Top 5 rankings." },
        th: { name: "บัตรยอดใช้จ่ายสมาชิก", description: "บันทึกยอดใช้จ่ายของลูกค้า โพสต์บัตรสมาชิก แจกยศตามยอดสะสม และจัดอันดับ Top 1 กับ Top 5 โดยอัตโนมัติ" },
    },
    "admin-message-tools": {
        en: { name: "Admin Message Tools", description: "Send DMs, channel messages, and files through the bot, and edit messages previously sent by the bot with Discord permission controls." },
        th: { name: "เครื่องมือข้อความแอดมิน", description: "ส่ง DM ข้อความ และไฟล์ผ่านบอท รวมถึงแก้ไขข้อความที่บอทเคยส่ง โดยควบคุมสิทธิ์ผ่าน Discord" },
    },
    "shop-status": {
        en: { name: "Shop Status", description: "Publish open, closed, or busy shop announcements and keep a selected Discord channel name synchronized with the current status." },
        th: { name: "สถานะร้าน", description: "ประกาศสถานะร้านเปิด ปิด หรือไม่ว่าง และอัปเดตชื่อห้อง Discord ที่เลือกให้ตรงกับสถานะปัจจุบัน" },
    },
    "app-premium-shop": {
        en: { name: "App Premium Shop", description: "Sell premium app accounts through a supplier API with server wallet payments, automatic delivery by DM, configurable margins, and refunds on failed orders." },
        th: { name: "ร้านแอปพรีเมียม", description: "ขายบัญชีแอปพรีเมียมผ่าน API ร้านต้นทาง ชำระด้วยกระเป๋าเงินในเซิร์ฟเวอร์ ส่งสินค้าทาง DM ตั้งกำไรได้ และคืนเงินเมื่อสั่งซื้อไม่สำเร็จ" },
    },
    "runtime-expiry-alert": {
        en: { name: "Runtime Expiry Alert", description: "Notify customers before Runtime expires through DM, a Discord channel, or both, with configurable reminder times." },
        th: { name: "แจ้งเตือน Runtime ใกล้หมดอายุ", description: "แจ้งเตือนก่อน Runtime หมดอายุผ่าน DM ห้อง Discord หรือทั้งสองช่องทาง พร้อมกำหนดช่วงเวลาแจ้งเตือนได้" },
    },
    "bot-presence": {
        en: { name: "Bot Presence", description: "Configure the bot status, activity type, and activity message shown in Discord." },
        th: { name: "สถานะบอท", description: "กำหนดสถานะ ประเภทกิจกรรม และข้อความกิจกรรมที่บอทแสดงบน Discord" },
    },
};

export function localizeCatalogFeature(feature: CatalogFeature, locale: string): CatalogFeature {
    const copy = featureCopy[feature.code]?.[locale === "th" ? "th" : "en"];
    return copy ? { ...feature, ...copy } : feature;
}

/** One basket line sent to POST /api/orders (exactly one id set). */
export interface PurchasePayload {
    priceId?: string;
    runtimePlanId?: string;
}

// ── presentation helpers ──────────────────────────────────────────────────────

export function thb(satang: number): string {
    return `฿${(satang / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function priceKindLabel(kind: PriceKind, locale: string = "en"): string {
    const thai = locale === "th";
    switch (kind) {
        case "RENT_MONTHLY":
            return thai ? "เช่ารายเดือน" : "Monthly rental";
        case "RENT_PERMANENT":
            return thai ? "ซื้อถาวร" : "Lifetime purchase";
        case "SOURCE_CODE":
            return thai ? "ซอร์สโค้ด" : "Source code";
    }
}

/** Features are per-bot, so any feature purchase needs a target bot; only the
 *  user-owned SOURCE_CODE does not. */
export function priceNeedsSubject(kind: PriceKind): boolean {
    return kind === "RENT_MONTHLY" || kind === "RENT_PERMANENT";
}
