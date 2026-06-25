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

/** A price SKU as embedded in a catalog feature (`/api/admin/catalog/features`). */
export interface AdminFeatureCatalogPrice {
    id: string;
    kind: string;
    priceSatang: number;
    durationMonths: number | null;
}

/** A catalog feature (incl. unpriced) for the add-price picker. */
export interface AdminFeature {
    id: string;
    code: string;
    name: string;
    description: string | null;
    category: string;
    featured: boolean;
    prices: AdminFeatureCatalogPrice[];
}

export interface CreateFeaturePricePayload {
    featureId: string;
    kind: string;
    priceSatang: number;
    durationMonths?: number | null;
    active?: boolean;
}

/** Price kinds an admin can create — mirrors feature_prices_kind_chk. */
export const FEATURE_PRICE_KINDS = ["RENT_MONTHLY", "RENT_PERMANENT", "SOURCE_CODE"] as const;

// ── subscriptions (what a user already owns) ─────────────────────────────────
export interface AdminRuntimeSubscription {
    id: string;
    externalSubjectId: string;
    runtimePlanId: string | null;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    autoRenew: boolean;
    renewPriceSatang: number | null;
    renewPlanId: string | null;
}

export interface AdminFeatureSubscription {
    id: string;
    featureId: string;
    scope: string;
    externalSubjectId: string | null;
    billingType: string;
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    autoRenew: boolean;
    renewPriceSatang: number | null;
}

export interface AdminUserSubscriptions {
    runtime: AdminRuntimeSubscription[];
    features: AdminFeatureSubscription[];
}

export interface UpdateRuntimeSubscriptionPayload {
    renewPriceSatang?: number | null;
    clearRenewPrice?: boolean;
    runtimePlanId?: string;
    renewPlanId?: string;
    status?: string;
    currentPeriodEnd?: string;
    autoRenew?: boolean;
}

export interface UpdateFeatureSubscriptionPayload {
    renewPriceSatang?: number | null;
    clearRenewPrice?: boolean;
    status?: string;
    currentPeriodEnd?: string;
    autoRenew?: boolean;
}

/** Subscription lifecycle states an admin can set. */
export const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"] as const;

/** Billing types an admin can grant a feature under (mirrors feature_subscriptions billing_type). */
export const FEATURE_BILLING_TYPES = ["RENT_MONTHLY", "RENT_PERMANENT"] as const;

/** Body for granting a feature to a bot (`POST /api/admin/bots/{id}/feature`). */
export interface GrantBotFeaturePayload {
    featureId: string;
    priceId?: string | null;
    billingType: (typeof FEATURE_BILLING_TYPES)[number];
}

// ── wallet ───────────────────────────────────────────────────────────────────
export interface AdminWallet {
    balanceSatang: number;
    currency: string;
}

export interface AdminWalletTransaction {
    id: string;
    direction: "CREDIT" | "DEBIT";
    type: string;
    amountSatang: number;
    balanceAfterSatang: number;
    referenceType: string | null;
    referenceId: string | null;
    note: string | null;
    createdAt: string;
}

export interface WalletAdjustPayload {
    direction: "CREDIT" | "DEBIT";
    amountSatang: number;
    note?: string;
}

export interface UpdateUserPayload {
    username?: string;
    displayName?: string;
    bio?: string;
    website?: string;
    githubUrl?: string;
    role?: "USER" | "ADMIN";
}

export const USER_ROLES = ["USER", "ADMIN"] as const;

// ── bots ─────────────────────────────────────────────────────────────────────
export interface AdminBot {
    id: string;
    name: string;
    status: string;
    ownerId: string;
    ownerName: string | null;
    ownerEmail: string | null;
    discordApplicationId: string | null;
    discordGuildId: string | null;
    discordAvatarUrl: string | null;
    tokenConfigured: boolean;
    vpsNodeId: string | null;
    createdAt: string;
}

/** Live pm2 runtime status for a bot, from GET /api/admin/bots/{botId}/status. */
export interface AdminBotLiveStatus {
    state: string;
    restarts: number | null;
    uptime: number | null;
    cpu: number | null;
    memory: number | null;
}

export interface BotConfigField {
    variableKey: string;
    label: string;
    description: string | null;
    valueType: string;
    isRequired: boolean;
    isSensitive: boolean;
    defaultValue: string | null;
    sortOrder: number;
}

export interface BotConfigFeature {
    code: string;
    name: string;
    fields: BotConfigField[];
}

export interface BotConfig {
    features: BotConfigFeature[];
    values: Record<string, string>;
}

// ── dashboard ────────────────────────────────────────────────────────────────
export interface AdminAuditEntry {
    id: string;
    actorId: string | null;
    action: string;
    targetUserId: string | null;
    targetType: string | null;
    targetId: string | null;
    createdAt: string;
}

export interface AdminDashboard {
    totalUsers: number;
    adminUsers: number;
    totalBots: number;
    runningBots: number;
    vpsNodes: number;
    vpsSlotsUsed: number;
    vpsSlotsTotal: number;
    topupRevenueSatang30d: number;
    totalWalletBalanceSatang: number;
    walletCount: number;
    recentAudit: AdminAuditEntry[];
}

export interface AdminVpsNode {
    id: string;
    name: string;
    label: string | null;
    region: string | null;
    status: string;
    maxSlots: number;
    reservedSlots: number;
    usedSlots: number;
    freeSlots: number;
    orchestratorUrl: string | null;
    hasServiceToken: boolean;
    notes: string | null;
    createdAt: string;
}

export interface AdminVpsSlot {
    id: string;
    slotIndex: number;
    status: string;
    occupied: boolean;
    notes: string | null;
}

export interface AdminSeat {
    nodeId: string;
    nodeName: string;
    nodeStatus: string;
    slotId: string;
    slotIndex: number;
    occupancy: string;
    runtimeId: string | null;
    ownerUserId: string | null;
    assignedBotId: string | null;
    expiresAt: string | null;
}

export interface UpdateVpsNodePayload {
    label?: string;
    maxSlots?: number;
    reservedSlots?: number;
    status?: string;
    notes?: string;
}

export interface AdminUnseatedRuntime {
    runtimeId: string;
    externalSubjectId: string | null;
    ownerUserId: string | null;
    expiresAt: string | null;
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
    { label: "Bots", icon: "/images/icons/sidebar/projects.svg", to: { name: "admin-bots" } },
    { label: "VPS", icon: "/images/icons/sidebar/performance.svg", to: { name: "admin-vps" } },
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
