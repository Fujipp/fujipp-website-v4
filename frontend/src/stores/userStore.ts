import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080'

// ─── Feature flags ───────────────────────────────────────────────────────────
/** Set to true when username/password auth is ready on the backend */
const CREDENTIALS_ENABLED = false as const

// Internal email domain used for username-based accounts (never shown to users)
const INTERNAL_DOMAIN = '@internal.fujipp'

export interface UserProfile {
  id: string
  email: string | null
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  provider: string | null
  role: 'USER' | 'ADMIN'
  bio: string | null
  website: string | null
  githubUrl: string | null
}

interface DatabaseProfile {
  id: string
  email: string | null
  username: string | null
  display_name: string | null
  avatar_url: string | null
  provider: string | null
  role: 'USER' | 'ADMIN'
  bio: string | null
  website: string | null
  github_url: string | null
}

function mapDatabaseProfile(profile: DatabaseProfile): UserProfile {
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    provider: profile.provider,
    role: profile.role,
    bio: profile.bio,
    website: profile.website,
    githubUrl: profile.github_url,
  }
}

export const useUserStore = defineStore('user', () => {
  const user        = ref<User | null>(null)
  const session     = ref<Session | null>(null)
  const profile     = ref<UserProfile | null>(null)
  const isLoading   = ref(false)
  const error       = ref<string | null>(null)
  const initialized = ref(false)
  let initAuthPromise: Promise<void> | null = null

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin         = computed(() => profile.value?.role === 'ADMIN')
  const accessToken     = computed(() => session.value?.access_token ?? null)

  // ─── Backend profile ─────────────────────────────────────────────────────────
  async function fetchProfile() {
    if (!accessToken.value || !user.value) return
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      if (res.ok) {
        profile.value = await res.json()
        return
      }
    } catch {
      // Non-critical — backend may not be running in dev
    }

    const { data } = await supabase
      .from('profiles')
      .select('id,email,username,display_name,avatar_url,provider,role,bio,website,github_url')
      .eq('id', user.value.id)
      .maybeSingle<DatabaseProfile>()

    if (data) profile.value = mapDatabaseProfile(data)
  }

  // ─── OAuth (Google / Discord / GitHub) ───────────────────────────────────────
  async function signInWithOAuth(provider: 'google' | 'discord' | 'github', redirectPath = '/') {
    isLoading.value = true
    error.value = null
    try {
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: new URL(redirectPath, window.location.origin).toString() },
      })
      if (err) error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  // ─── Username / Password ──────────────────────────────────────────────────────
  async function isUsernameAvailable(username: string): Promise<boolean> {
    const { data } = await supabase.rpc('is_username_available', { p_username: username })
    return data === true
  }

  async function signInWithUsername(username: string, password: string): Promise<boolean> {
    if (!CREDENTIALS_ENABLED) {
      error.value = 'Username/password login is not available yet'
      return false
    }
    isLoading.value = true
    error.value = null
    try {
      const email = `${username.toLowerCase()}${INTERNAL_DOMAIN}`
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        error.value = err.message.includes('Invalid login credentials')
          ? 'Username or password is incorrect'
          : err.message
        return false
      }
      user.value    = data.user
      session.value = data.session
      await fetchProfile()
      return true
    } finally {
      isLoading.value = false
    }
  }

  async function signUpWithUsername(username: string, password: string): Promise<boolean> {
    if (!CREDENTIALS_ENABLED) {
      error.value = 'Username/password registration is not available yet'
      return false
    }
    isLoading.value = true
    error.value = null
    try {
      // 1. Pre-check username availability via RPC
      const available = await isUsernameAvailable(username)
      if (!available) {
        error.value = 'Username is already taken'
        return false
      }

      // 2. Create auth user with internal email pattern
      const email = `${username.toLowerCase()}${INTERNAL_DOMAIN}`
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) {
        error.value = err.message.includes('already registered')
          ? 'Username is already taken'
          : err.message
        return false
      }

      user.value    = data.user
      session.value = data.session

      // 3. Set username on the auto-created profile
      if (data.session && data.user) {
        await supabase.from('profiles').update({ username }).eq('id', data.user.id)
        await fetchProfile()
      }

      return true
    } finally {
      isLoading.value = false
    }
  }

  // ─── Sign out ─────────────────────────────────────────────────────────────────
  async function signOut() {
    isLoading.value = true
    try {
      await supabase.auth.signOut()
      user.value    = null
      session.value = null
      profile.value = null
    } finally {
      isLoading.value = false
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  function clearError() { error.value = null }

  // ─── Init (call once on app startup) ─────────────────────────────────────────
  function initAuth(): Promise<void> {
    if (initialized.value) return Promise.resolve()
    if (initAuthPromise) return initAuthPromise

    initAuthPromise = initializeAuth()
    return initAuthPromise
  }

  async function initializeAuth() {
    try {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        user.value    = data.session.user
        session.value = data.session
        await fetchProfile()
      }

      supabase.auth.onAuthStateChange((_event, newSession) => {
        user.value    = newSession?.user ?? null
        session.value = newSession ?? null
        if (newSession) {
          void fetchProfile()
        } else {
          profile.value = null
        }
      })
    } finally {
      initialized.value = true
      initAuthPromise = null
    }
  }

  return {
    user, session, profile,
    isLoading, error, initialized,
    isAuthenticated, isAdmin, accessToken,
    signInWithOAuth,
    signInWithUsername, signUpWithUsername,
    isUsernameAvailable,
    signOut, clearError, initAuth, fetchProfile,
  }
})
