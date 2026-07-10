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
