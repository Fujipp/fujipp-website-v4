<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { AuthCard } from '@/features/auth/components'

type AuthMode = 'login' | 'register'

const router = useRouter()
const route  = useRoute()
const store  = useUserStore()

const mode = ref<AuthMode>(route.name === 'register' ? 'register' : 'login')
watch(
  () => route.name,
  (name) => { mode.value = name === 'register' ? 'register' : 'login' },
)

// Username/password form is disabled until the feature is ready
const CREDENTIALS_ENABLED = false as const

const username        = ref('')
const password        = ref('')
const confirmPassword = ref('')
const rememberMe      = ref(false)
const pwMismatch      = ref(false)
const redirectAfterAuth = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/'
})

const errorMessage = computed(() => {
  if (pwMismatch.value) return 'Passwords do not match'
  return store.error ?? ''
})

function switchMode(m: AuthMode) {
  store.clearError()
  username.value = password.value = confirmPassword.value = ''
  pwMismatch.value = false
  router.push({ name: m, query: route.query })
}

async function handleOAuth(provider: 'google' | 'discord' | 'github') {
  await store.signInWithOAuth(provider, redirectAfterAuth.value)
}

async function handleSubmit() {
  if (!CREDENTIALS_ENABLED || store.isLoading) return
  if (mode.value === 'login') {
    if (!username.value.trim() || !password.value) return
    const ok = await store.signInWithUsername(username.value.trim(), password.value)
    if (ok) router.push(redirectAfterAuth.value)
  } else {
    if (!username.value.trim() || !password.value || !confirmPassword.value) return
    if (password.value !== confirmPassword.value) { pwMismatch.value = true; return }
    pwMismatch.value = false
    const ok = await store.signUpWithUsername(username.value.trim(), password.value)
    if (ok) router.push(redirectAfterAuth.value)
  }
}
</script>

<template>
  <div :class="$style.page">
    <AuthCard
      :class="$style.card"
      :mode="mode"
      v-model:username="username"
      v-model:password="password"
      v-model:confirm-password="confirmPassword"
      v-model:remember="rememberMe"
      :loading="store.isLoading"
      :error="errorMessage"
      :credentials-enabled="CREDENTIALS_ENABLED"
      @oauth="handleOAuth"
      @submit="handleSubmit"
      @switch-mode="switchMode"
      @back="router.push(redirectAfterAuth)"
    />
  </div>
</template>

<style module>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  min-height: 100dvh;
  /* Transparent so the fixed BackgroundEffect shows through. */
  font-family: var(--font-sans);
}

.card {
  max-width: 100%;
}
</style>
