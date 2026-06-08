import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import { useUserStore } from '@/stores'

// Views are lazy-loaded so each route ships as its own chunk (smaller initial bundle).
const HomeView = () => import('@/features/portfolio/views/HomeView.vue')
const AboutView = () => import('@/features/portfolio/views/AboutView.vue')
const ContactView = () => import('@/features/portfolio/views/ContactView.vue')
const PerformanceView = () => import('@/features/portfolio/views/PerformanceView.vue')
const PrivacyView = () => import('@/features/portfolio/views/PrivacyView.vue')
const ProjectsView = () => import('@/features/projects/views/ProjectsView.vue')
const ProjectDetailView = () => import('@/features/projects/views/ProjectDetailView.vue')
const NewProjectView = () => import('@/features/projects/views/NewProjectView.vue')
const ShopDashboardView = () => import('@/features/shop/views/ShopDashboardView.vue')
const ShopWalletView = () => import('@/features/shop/views/ShopWalletView.vue')
const ShopPackageView = () => import('@/features/shop/views/ShopPackageView.vue')
const BotConfigView = () => import('@/features/shop/views/BotConfigView.vue')
const AuthView = () => import('@/features/auth/views/AuthView.vue')

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

async function requireAdmin(to: RouteLocationNormalized) {
  const store = useUserStore()

  await store.initAuth()

  if (!store.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (!store.isAdmin) {
    return { name: 'projects' }
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',            name: 'home',        component: HomeView },
    { path: '/projects',    name: 'projects',    component: ProjectsView },
    { path: '/projects/new', name: 'project-new', component: NewProjectView, beforeEnter: requireAdmin },
    { path: '/projects/:projectId/edit', name: 'project-edit', component: NewProjectView, beforeEnter: requireAdmin },
    { path: '/projects/:projectId', name: 'project-detail', component: ProjectDetailView },
    { path: '/about',       name: 'about',       component: AboutView },
    { path: '/contact',     name: 'contact',     component: ContactView },
    { path: '/performance', name: 'performance', component: PerformanceView },
    { path: '/privacy',     name: 'privacy',     component: PrivacyView },

    // Shop routes
    { path: '/shop', name: 'shop-dashboard', component: ShopDashboardView },
    { path: '/shop/wallet', name: 'shop-wallet', component: ShopWalletView },
    { path: '/shop/package', name: 'shop-package', component: ShopPackageView },
    { path: '/shop/bots/:botId/config', name: 'shop-bot-config', component: BotConfigView },

    // Auth routes
    { path: '/login',    name: 'login',    component: AuthView },
    { path: '/register', name: 'register', component: AuthView },
  ],
})

// ─── Global guard ─────────────────────────────────────────────────────────────
router.beforeEach(async (to) => {
  const store = useUserStore()

  await store.initAuth()

  const cleanAuthCallbackLocation = getCleanAuthCallbackLocation(to)
  if (cleanAuthCallbackLocation) return cleanAuthCallbackLocation

  const authRoutes = ['login', 'register']
  if (authRoutes.includes(to.name as string) && store.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
