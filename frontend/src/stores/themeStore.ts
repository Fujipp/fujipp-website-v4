import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { ThemeApp } from '@/config'
import type { ThemeMode } from '@/config/theme'

const themeStorageKey = 'fujipp-theme-mode'

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

  function applyTheme() {
    if (typeof document === 'undefined') return

    const useDarkTheme = selectedTheme.value === 'DARK'
      || (selectedTheme.value === 'SYSTEM' && systemColorScheme?.matches)

    document.documentElement.dataset.theme = useDarkTheme ? 'dark' : 'light'
  }

  function setTheme(theme: ThemeMode) {
    selectedTheme.value = theme
    window.localStorage.setItem(themeStorageKey, theme)
    applyTheme()
  }

  systemColorScheme?.addEventListener('change', () => {
    if (selectedTheme.value === 'SYSTEM') {
      applyTheme()
    }
  })

  applyTheme()

  return { selectedTheme, currentTheme, setTheme }
})
