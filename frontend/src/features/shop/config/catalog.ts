// Shop catalog model — frontend mirror of billing CatalogController DTOs
// (FeatureResponse / FeaturePriceResponse / RuntimePlanResponse) and the
// PurchaseRequest shape consumed by the order endpoint.

export type PriceKind = "RENT_MONTHLY" | "RENT_PERMANENT" | "SOURCE_CODE";

export interface CatalogPrice {
    // priceId (UUID) — required to purchase. NOTE: backend FeaturePriceResponse must
    // be extended to expose this; it currently omits the id.
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

/** One basket line sent to POST /api/orders (exactly one id set). */
export interface PurchasePayload {
    priceId?: string;
    runtimePlanId?: string;
}

// ── presentation helpers ──────────────────────────────────────────────────────

export function thb(satang: number): string {
    return `฿${(satang / 100).toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
}

export function priceKindLabel(kind: PriceKind): string {
    switch (kind) {
        case "RENT_MONTHLY":
            return "เช่ารายเดือน";
        case "RENT_PERMANENT":
            return "ซื้อถาวร";
        case "SOURCE_CODE":
            return "ซอร์สโค้ด";
    }
}

/** Features are per-bot, so any feature purchase needs a target bot; only the
 *  user-owned SOURCE_CODE does not. */
export function priceNeedsSubject(kind: PriceKind): boolean {
    return kind === "RENT_MONTHLY" || kind === "RENT_PERMANENT";
}

// ── SAMPLE catalog — mirrors the seeded data (migrations 20260605170000/170500
//    and the runtime plans in 20260602194239). Fallback until the backend proxy
//    endpoints exist, so the page is demonstrable. ──────────────────────────────
export const SAMPLE_FEATURES: CatalogFeature[] = [
    {
        id: "sample-roblox",
        code: "roblox-robux-payout",
        name: "Roblox Robux Payout",
        description: "จ่าย Robux ออกจากกลุ่มอัตโนมัติ (รองรับ 2FA), เช็คสิทธิ์รับ Robux, ดูยอดกลุ่ม",
        category: "ROBLOX",
        featured: true,
        prices: [
            { id: "sample-roblox-perm", kind: "RENT_PERMANENT", priceSatang: 49000, effectivePriceSatang: 49000, onPromotion: false, durationMonths: null },
        ],
    },
    {
        id: "sample-wallet",
        code: "wallet-topup",
        name: "Shop Wallet & Top-up",
        description: "กระเป๋าเงินร้านในบอท: เติมผ่านสลิป (SlipOK) และ TrueMoney, เก็บยอด/ประวัติของสมาชิก",
        category: "PAYMENT",
        featured: false,
        prices: [
            { id: "sample-wallet-perm", kind: "RENT_PERMANENT", priceSatang: 29000, effectivePriceSatang: 29000, onPromotion: false, durationMonths: null },
        ],
    },
];

export const SAMPLE_RUNTIME_PLANS: RuntimePlan[] = [
    { id: "sample-rt-1m", code: "runtime-1m", name: "Runtime 24/7 — 1 เดือน", durationMonths: 1, priceSatang: 6900, effectivePriceSatang: 6900, onPromotion: false, featured: true },
    { id: "sample-rt-2m", code: "runtime-2m", name: "Runtime 24/7 — 2 เดือน", durationMonths: 2, priceSatang: 13000, effectivePriceSatang: 13000, onPromotion: true, promotionLabel: "คุ้มกว่า", featured: false },
    { id: "sample-rt-3m", code: "runtime-3m", name: "Runtime 24/7 — 3 เดือน", durationMonths: 3, priceSatang: 19900, effectivePriceSatang: 19900, onPromotion: true, promotionLabel: "คุ้มที่สุด", featured: false },
];
