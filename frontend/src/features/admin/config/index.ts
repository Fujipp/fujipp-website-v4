import type { RouteLocationRaw } from "vue-router";

/** A user/profile row as returned by the backend admin API (`/api/admin/users`). */
export interface AdminUser {
    id: string;
    email: string | null;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    provider: string | null;
    role: "USER" | "ADMIN";
    bio: string | null;
    website: string | null;
    githubUrl: string | null;
    createdAt: string;
    updatedAt: string;
}

/** A runtime hosting plan as returned by `/api/admin/catalog/runtime-plans`. */
export interface AdminRuntimePlan {
    id: string;
    code: string;
    name: string;
    durationMonths: number;
    priceSatang: number;
    currency: string;
    promotionLabel: string | null;
    promotionPriceSatang: number | null;
    promotionStartsAt: string | null;
    promotionEndsAt: string | null;
    featured: boolean;
    sortOrder: number;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

/** A priced feature SKU as returned by `/api/admin/catalog/feature-prices`. */
export interface AdminFeaturePrice {
    id: string;
    featureId: string;
    featureCode: string | null;
    featureName: string | null;
    kind: string;
    priceSatang: number;
    currency: string;
    durationMonths: number | null;
    promotionLabel: string | null;
    promotionPriceSatang: number | null;
    promotionStartsAt: string | null;
    promotionEndsAt: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateRuntimePlanPayload {
    name?: string;
    priceSatang?: number;
    durationMonths?: number;
    featured?: boolean;
    sortOrder?: number;
    active?: boolean;
    clearPromotion?: boolean;
    promotionLabel?: string | null;
    promotionPriceSatang?: number | null;
}

export interface UpdateFeaturePricePayload {
    priceSatang?: number;
    durationMonths?: number;
    active?: boolean;
    clearPromotion?: boolean;
    promotionLabel?: string | null;
    promotionPriceSatang?: number | null;
}

export interface AdminNavItem {
    label: string;
    icon: string;
    to: RouteLocationRaw;
}

/**
 * Admin sidebar destinations. Items are added here as each feature PR lands
 * (Pricing, Wallet, Bots, …); only routes that exist are listed.
 */
export const adminNavItems: readonly AdminNavItem[] = [
    { label: "Dashboard", icon: "/images/icons/sidebar/home.svg", to: { name: "admin-dashboard" } },
    { label: "Users", icon: "/images/icons/sidebar/about.svg", to: { name: "admin-users" } },
    { label: "Pricing", icon: "/images/icons/sidebar/package.svg", to: { name: "admin-pricing" } },
] satisfies readonly AdminNavItem[];

/** satang ⇄ baht helpers — money is stored in satang (THB ×100) everywhere. */
export function satangToBaht(satang: number | null | undefined): number | null {
    return satang === null || satang === undefined ? null : satang / 100;
}

export function bahtToSatang(baht: number | null | undefined): number | null {
    // An emptied <input type="number"> with v-model.number yields "" — treat blank/NaN as null.
    if (baht === null || baht === undefined || (baht as unknown) === "" || Number.isNaN(Number(baht))) {
        return null;
    }
    return Math.round(Number(baht) * 100);
}
