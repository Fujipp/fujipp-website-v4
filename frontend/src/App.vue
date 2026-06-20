<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { BackgroundEffect, AppNavbar, UserControl } from '@/shared/layout'
import { useUserStore } from '@/stores'

const CLICK_SOUND_SRC = '/music/click.MP3'
const CLICK_SOUND_VOLUME = 0.2

const userStore = useUserStore()
const route = useRoute()
const shouldShowAppChrome = computed(() =>
  !route.path.startsWith('/shop')
  && !route.path.startsWith('/admin')
  && !['login', 'register'].includes(String(route.name)))

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

onUnmounted(() => {
  document.removeEventListener('click', playClickSound, { capture: true })
})
</script>

<template>
  <RouterView />
  <BackgroundEffect />
  <AppNavbar v-if="shouldShowAppChrome" />
  <UserControl v-if="shouldShowAppChrome" />
</template>

<style scoped></style>
