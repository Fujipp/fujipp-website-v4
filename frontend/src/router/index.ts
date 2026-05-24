import { createRouter, createWebHistory } from "vue-router";
import { HomeView, ProjectsView, AboutView, ContactView, PerformanceView, PrivacyView } from "@/views";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/projects",
      name: "projects",
      component: ProjectsView,
    },
    {
      path: "/about",
      name: "about",
      component: AboutView,
    },
    {
      path: "/contact",
      name: "contact",
      component: ContactView,
    },
    {
      path: "/performance",
      name: "performance",
      component: PerformanceView,
    },
    {
      path: "/privacy",
      name: "privacy",
      component: PrivacyView,
    },
  ],
});

export default router;
