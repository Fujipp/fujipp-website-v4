import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import { HomeView, AboutView, ContactView, PerformanceView, PrivacyView } from '@/features/portfolio'
import { ProjectsView, ProjectDetailView, NewProjectView } from '@/features/projects'
import { ShopDashboardView, ShopWalletView } from '@/features/shop'
import { AuthView } from '@/features/auth'
import { useUserStore } from '@/stores'

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

    // Auth routes
    { path: '/login',    name: 'login',    component: AuthView },
    { path: '/register', name: 'register', component: AuthView },
  ],
})

// ─── Global guard ─────────────────────────────────────────────────────────────
router.beforeEach(async (to) => {
  const store = useUserStore()

  await store.initAuth()

  const authRoutes = ['login', 'register']
  if (authRoutes.includes(to.name as string) && store.isAuthenticated) {
    return { name: 'home' }
  }
})

export default router
