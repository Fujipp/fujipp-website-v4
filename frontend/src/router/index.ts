import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import { useUserStore } from '@/stores'

declare module 'vue-router' {
  interface RouteMeta {
    guestOnly?: boolean
    requiresAdmin?: boolean
    requiresAuth?: boolean
  }
}

// Views are lazy-loaded so each route ships as its own chunk (smaller initial bundle).
const RootView = () => import('@/RootView.vue')
const ComponentView = () => import('@/features/portfolio/views/ComponentView.vue')
const AboutView = () => import('@/features/portfolio/views/AboutView.vue')
const ContactView = () => import('@/features/portfolio/views/ContactView.vue')
const ChangelogView = () => import('@/features/portfolio/views/ChangelogView.vue')
const PerformanceView = () => import('@/features/portfolio/views/PerformanceView.vue')
const PrivacyView = () => import('@/features/portfolio/views/PrivacyView.vue')
const NotFoundView = () => import('@/features/portfolio/views/NotFoundView.vue')
const ProjectsView = () => import('@/features/projects/views/ProjectsView.vue')
const ProjectDetailView = () => import('@/features/projects/views/ProjectDetailView.vue')
const NewProjectView = () => import('@/features/projects/views/NewProjectView.vue')
const ShopDashboardView = () => import('@/features/shop/views/ShopDashboardView.vue')
const ShopWalletView = () => import('@/features/shop/views/ShopWalletView.vue')
const ShopPackageView = () => import('@/features/shop/views/ShopPackageView.vue')
const ShopRuntimeView = () => import('@/features/shop/views/ShopRuntimeView.vue')
const MyBotView = () => import('@/features/shop/views/MyBotView.vue')
const ShopMaintenanceView = () => import('@/features/shop/views/ShopGuideView.vue')
const BotConfigView = () => import('@/features/shop/views/BotConfigView.vue')
const EmbedDesignerView = () => import('@/features/shop/views/EmbedDesignerView.vue')
const AuthView = () => import('@/features/auth/views/AuthView.vue')
const AdminDashboardView = () => import('@/features/admin/views/AdminDashboardView.vue')
const AdminUsersView = () => import('@/features/admin/views/AdminUsersView.vue')
const AdminUserDetailView = () => import('@/features/admin/views/AdminUserDetailView.vue')
const AdminPricingView = () => import('@/features/admin/views/AdminPricingView.vue')
const AdminBotsView = () => import('@/features/admin/views/AdminBotsView.vue')
const AdminBotConfigView = () => import('@/features/admin/views/AdminBotConfigView.vue')
const AdminVpsView = () => import('@/features/admin/views/AdminVpsView.vue')

const AUTH_CALLBACK_QUERY_KEYS = ['code', 'error', 'error_code', 'error_description'] as const

function getCleanAuthCallbackLocation(to: RouteLocationNormalized) {
  const query = { ...to.query }
  const hasAuthQuery = AUTH_CALLBACK_QUERY_KEYS.some((key) => key in query)
  const hasAuthHash = to.hash.includes('access_token')
    || to.hash.includes('refresh_token')
    || to.hash.includes('provider_token')

  if (!hasAuthQuery && !hasAuthHash) return null

  AUTH_CALLBACK_QUERY_KEYS.forEach((key) => { delete query[key] })

  return {
    path: to.path,
    query,
    hash: '',
    replace: true,
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(_to, _from, savedPosition) {
    // New pages start at the top; browser back/forward restores the user's
    // previous reading position instead of unexpectedly resetting it.
    return savedPosition ?? { top: 0, left: 0 }
  },
  routes: [
    { path: '/',            name: 'home',        component: RootView },
    { path: '/components',  name: 'components',  component: ComponentView },
    { path: '/projects',    name: 'projects',    component: ProjectsView },
    { path: '/projects/inline/new', name: 'project-inline-new', component: ProjectDetailView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/projects/new', name: 'project-new', component: NewProjectView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/projects/:projectId/edit', name: 'project-edit', component: NewProjectView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/projects/:projectId', name: 'project-detail', component: ProjectDetailView },
    { path: '/about',       name: 'about',       component: AboutView },
    { path: '/contact',     name: 'contact',     component: ContactView },
    { path: '/changelog',   name: 'changelog',   component: ChangelogView },
    { path: '/performance', name: 'performance', component: PerformanceView },
    { path: '/privacy',     name: 'privacy',     component: PrivacyView },

    // Store routes
    { path: '/store', name: 'shop-dashboard', component: ShopDashboardView, meta: { requiresAuth: true } },
    { path: '/store/packages', name: 'shop-package', component: ShopPackageView, meta: { requiresAuth: true } },
    { path: '/store/runtime', name: 'shop-runtime', component: ShopRuntimeView, meta: { requiresAuth: true } },

    // Shop account and bot-management routes
    { path: '/add-credit', name: 'shop-wallet', component: ShopWalletView, meta: { requiresAuth: true } },
    { path: '/my-bot', name: 'my-bot', component: MyBotView, meta: { requiresAuth: true } },
    { path: '/shop/maintenance', name: 'shop-maintenance', component: ShopMaintenanceView, meta: { requiresAuth: true } },
    { path: '/shop/guide', redirect: { name: 'shop-maintenance' } },
    { path: '/shop/bots/:botId/config', name: 'shop-bot-config', component: BotConfigView, meta: { requiresAuth: true } },
    { path: '/shop/bots/:botId/config/bot-config', name: 'shop-bot-config-detail', component: BotConfigView, meta: { requiresAuth: true } },
    { path: '/shop/bots/:botId/config/runtime-setting', name: 'shop-bot-runtime-setting', component: BotConfigView, meta: { requiresAuth: true } },
    { path: '/shop/bots/:botId/config/package-setting', name: 'shop-bot-package-setting', component: BotConfigView, meta: { requiresAuth: true } },
    { path: '/shop/bots/:botId/config/core-features', name: 'shop-bot-core-features', component: BotConfigView, meta: { requiresAuth: true } },
    { path: '/shop/bots/:botId/config/core-features/:featureCode', name: 'shop-bot-core-feature', component: BotConfigView, meta: { requiresAuth: true } },
    { path: '/shop/bots/:botId/config/package-setting/:featureCode/embed-setting', name: 'shop-bot-embed-setting', component: BotConfigView, meta: { requiresAuth: true } },
    { path: '/shop/bots/:botId/config/package-setting/:featureCode', name: 'shop-bot-package-feature', component: BotConfigView, meta: { requiresAuth: true } },
    { path: '/shop/bots/:botId/embeds', name: 'shop-bot-embeds', component: EmbedDesignerView, meta: { requiresAuth: true } },

    // Legacy Store URLs keep existing bookmarks working.
    { path: '/shop', redirect: { name: 'shop-dashboard' } },
    { path: '/shop/add-credit', redirect: { name: 'shop-wallet' } },
    { path: '/shop/wallet', redirect: { name: 'shop-wallet' } },
    { path: '/shop/package', redirect: { name: 'shop-package' } },
    { path: '/shop/runtime', redirect: { name: 'shop-runtime' } },

    // Admin routes live inside the shop section because they operate the shop.
    { path: '/shop/admin', name: 'admin-dashboard', component: AdminDashboardView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/shop/admin/users', name: 'admin-users', component: AdminUsersView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/shop/admin/users/:userId/user-setting', name: 'admin-user-setting', component: AdminUserDetailView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/shop/admin/users/:userId/wallet-setting', name: 'admin-user-wallet-setting', component: AdminUserDetailView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/shop/admin/users/:userId/runtime-setting', name: 'admin-user-runtime-setting', component: AdminUserDetailView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/shop/admin/users/:userId/package-setting', name: 'admin-user-package-setting', component: AdminUserDetailView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/shop/admin/users/:userId', name: 'admin-user-detail', component: AdminUserDetailView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/shop/admin/pricing', name: 'admin-pricing', component: AdminPricingView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/shop/admin/bots', name: 'admin-bots', component: AdminBotsView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/shop/admin/bots/:botId/config', name: 'admin-bot-config', component: AdminBotConfigView, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/shop/admin/vps', name: 'admin-vps', component: AdminVpsView, meta: { requiresAuth: true, requiresAdmin: true } },

    // Legacy admin URLs redirect into the shop admin namespace.
    { path: '/admin', redirect: { name: 'admin-dashboard' } },
    { path: '/admin/users', redirect: { name: 'admin-users' } },
    { path: '/admin/users/:userId', redirect: to => ({ name: 'admin-user-detail', params: to.params }) },
    { path: '/admin/users/:userId/user-setting', redirect: to => ({ name: 'admin-user-setting', params: to.params }) },
    { path: '/admin/users/:userId/wallet-setting', redirect: to => ({ name: 'admin-user-wallet-setting', params: to.params }) },
    { path: '/admin/users/:userId/runtime-setting', redirect: to => ({ name: 'admin-user-runtime-setting', params: to.params }) },
    { path: '/admin/users/:userId/package-setting', redirect: to => ({ name: 'admin-user-package-setting', params: to.params }) },
    { path: '/admin/pricing', redirect: { name: 'admin-pricing' } },
    { path: '/admin/bots', redirect: { name: 'admin-bots' } },
    { path: '/admin/bots/:botId/config', redirect: to => ({ name: 'admin-bot-config', params: to.params }) },

    // Auth routes
    { path: '/login',    name: 'login',    component: AuthView, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: AuthView, meta: { guestOnly: true } },

    // 404 fallback must stay last.
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView },
  ],
})

// ─── Global guard ─────────────────────────────────────────────────────────────
router.beforeEach(async (to) => {
  const store = useUserStore()

  await store.initAuth()

  const cleanAuthCallbackLocation = getCleanAuthCallbackLocation(to)
  if (cleanAuthCallbackLocation) return cleanAuthCallbackLocation

  if ((to.meta.requiresAuth || to.meta.requiresAdmin) && !store.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && !store.isAdmin) {
    return { name: 'projects' }
  }

  if (to.meta.guestOnly && store.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
