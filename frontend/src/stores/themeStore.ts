import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ThemeApp } from '@/config'
import type { ThemeMode } from '@/config/theme'

const themeStorageKey = 'fujipp-theme-mode'

interface ThemeTransitionOrigin {
  x: number
  y: number
}

interface ViewTransitionHandle {
  finished: Promise<void>
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionHandle
}

function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'SYSTEM'

  const storedTheme = window.localStorage.getItem(themeStorageKey)
  return storedTheme === 'LIGHT' || storedTheme === 'DARK' || storedTheme === 'SYSTEM'
    ? storedTheme
    : 'SYSTEM'
}

export const useThemeStore = defineStore('theme', () => {
  const selectedTheme = ref<ThemeMode>(getStoredTheme())
  const systemColorScheme = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : undefined

  const currentTheme = computed(() =>
    ThemeApp.find((theme) => theme.mode === selectedTheme.value) ?? ThemeApp[2],
  )

  function applyTheme(instant = false) {
    if (typeof document === 'undefined') return

    const useDarkTheme = selectedTheme.value === 'DARK'
      || (selectedTheme.value === 'SYSTEM' && systemColorScheme?.matches)

    const root = document.documentElement
    if (instant) root.classList.add('theme-switching')
    root.dataset.theme = useDarkTheme ? 'dark' : 'light'

    const favicon = document.querySelector<HTMLLinkElement>('#app-favicon')
    if (favicon) {
      favicon.href = useDarkTheme
        ? '/brand/logo-fujipp-new-icons-dark.svg'
        : '/brand/logo-fujipp-new-icons.svg'
    }

    if (instant) {
      // Resolve the new token values while transitions are disabled, then restore
      // normal hover and interaction motion without cross-fading the theme.
      void root.offsetWidth
      root.classList.remove('theme-switching')
    }
  }

  function setTheme(theme: ThemeMode, origin?: ThemeTransitionOrigin) {
    const updateTheme = (instant: boolean) => {
      selectedTheme.value = theme
      window.localStorage.setItem(themeStorageKey, theme)
      applyTheme(instant)
    }

    const viewTransitionDocument = document as ViewTransitionDocument
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!origin || reduceMotion || !viewTransitionDocument.startViewTransition) {
      updateTheme(true)
      return
    }

    const root = document.documentElement
    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y),
    )

    root.style.setProperty('--theme-reveal-x', `${origin.x}px`)
    root.style.setProperty('--theme-reveal-y', `${origin.y}px`)
    root.style.setProperty('--theme-reveal-radius', `${radius}px`)
    root.classList.add('theme-reveal')

    const transition = viewTransitionDocument.startViewTransition(() => updateTheme(false))
    void transition.finished.finally(() => {
      root.classList.remove('theme-reveal')
      root.style.removeProperty('--theme-reveal-x')
      root.style.removeProperty('--theme-reveal-y')
      root.style.removeProperty('--theme-reveal-radius')
    })
  }

  systemColorScheme?.addEventListener('change', () => {
    if (selectedTheme.value === 'SYSTEM') {
      applyTheme(true)
    }
  })

  applyTheme()

  return { selectedTheme, currentTheme, setTheme }
})
