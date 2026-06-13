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
] satisfies readonly AdminNavItem[];
