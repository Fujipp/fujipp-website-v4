<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { BackgroundEffect, AppNavbar } from '@/shared/layout'
import { ToastHost } from '@/shared/ui/toasts'
import { useUserStore } from '@/stores'

const CLICK_SOUND_SRC = '/music/click.MP3'
const CLICK_SOUND_VOLUME = 0.2

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const CHROME_SHOP_ROUTES = ['shop-dashboard', 'shop-wallet', 'shop-package', 'shop-runtime', 'shop-bot-config', 'shop-bot-embeds']
const isAdminRoute = computed(() => route.matched.some((record) => record.meta.requiresAdmin === true))
const shouldShowAppChrome = computed(() =>
  // Shop and Admin workspaces use the shared navbar; deeper Shop pages keep their own chrome.
  (CHROME_SHOP_ROUTES.includes(String(route.name)) || isAdminRoute.value || !route.path.startsWith('/shop'))
  && !['project-detail', 'project-new', 'project-edit', 'login', 'register'].includes(String(route.name)))
const isShopRoute = computed(() => route.path.startsWith('/shop'))
const currentRouteRequiresAuth = computed(() =>
  route.matched.some((record) => record.meta.requiresAuth === true || record.meta.requiresAdmin === true),
)

let clickAudio: HTMLAudioElement | undefined

function isDisabledControl(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  if (element.getAttribute('aria-disabled') === 'true') {
    return true
  }

  if (
    (element instanceof HTMLButtonElement
      || element instanceof HTMLInputElement
      || element instanceof HTMLSelectElement
      || element instanceof HTMLTextAreaElement)
    && element.disabled
  ) {
    return true
  }

  return Boolean(element.closest('fieldset:disabled'))
}

function getClickableControl(event: MouseEvent): Element | null {
  const selectors = [
    'button',
    'a[href]',
    '[role="button"]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    'summary',
  ].join(',')

  for (const target of event.composedPath()) {
    if (!(target instanceof Element)) {
      continue
    }

    const control = target.matches(selectors) ? target : target.closest(selectors)

    if (control) {
      return isDisabledControl(control) ? null : control
    }
  }

  return null
}

function playClickSound(event: MouseEvent): void {
  if (!getClickableControl(event)) {
    return
  }

  clickAudio ??= new Audio(CLICK_SOUND_SRC)
  clickAudio.volume = CLICK_SOUND_VOLUME
  clickAudio.currentTime = 0
  void clickAudio.play().catch(() => undefined)
}

onMounted(() => {
  void userStore.initAuth()
  document.addEventListener('click', playClickSound, { capture: true })
})

watch(
  isShopRoute,
  (isActive) => {
    document.documentElement.classList.toggle('shop-route', isActive)
  },
  { immediate: true },
)

// A router guard runs only when the location changes. Logout changes the auth state
// in place, so redirect away from protected views once session hydration is complete.
watch(
  [() => userStore.initialized, () => userStore.isAuthenticated, () => route.fullPath],
  ([isInitialized, isAuthenticated]) => {
    if (!isInitialized || isAuthenticated || !currentRouteRequiresAuth.value) {
      return
    }

    void router.replace({ name: 'login', query: { redirect: route.fullPath } })
  },
  { immediate: true },
)

onUnmounted(() => {
  document.documentElement.classList.remove('shop-route')
  document.removeEventListener('click', playClickSound, { capture: true })
})
</script>

<template>
  <RouterView />
  <ToastHost />
  <!-- Floating background belongs to the Home page only. -->
  <BackgroundEffect v-if="route.name === 'home'" />
  <AppNavbar v-if="shouldShowAppChrome" />
</template>

<style scoped></style>
