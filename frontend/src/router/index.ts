import { createRouter, createWebHistory } from 'vue-router'
import {
  HomeView, ProjectsView, ProjectDetailView, AboutView, ContactView,
  PerformanceView, PrivacyView, AuthView,
} from '@/views'
import { useUserStore } from '@/stores'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',            name: 'home',        component: HomeView },
    { path: '/projects',    name: 'projects',    component: ProjectsView },
    { path: '/projects/:projectId', name: 'project-detail', component: ProjectDetailView },
    { path: '/about',       name: 'about',       component: AboutView },
    { path: '/contact',     name: 'contact',     component: ContactView },
    { path: '/performance', name: 'performance', component: PerformanceView },
    { path: '/privacy',     name: 'privacy',     component: PrivacyView },

    // Auth routes
    { path: '/login',    name: 'login',    component: AuthView },
    { path: '/register', name: 'register', component: AuthView },
  ],
})

// ─── Global guard ─────────────────────────────────────────────────────────────
// router.beforeEach(async (to) => {
//   const store = useUserStore()

//   // Initialize auth state once (reads session from localStorage)
//   if (!store.initialized) {
//     await store.initAuth()
//   }

//   // Redirect authenticated users away from auth pages
//   const authRoutes = ['login', 'register']
//   if (authRoutes.includes(to.name as string) && store.isAuthenticated) {
//     return { name: 'home' }
//   }
// })

export default router
