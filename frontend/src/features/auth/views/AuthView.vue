<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores'

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
const showPassword    = ref(false)
const redirectAfterAuth = computed(() => {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//')
    ? redirect
    : '/'
})

const ICONS = {
  github:   '/images/icons/auth/github.svg',
  discord:  '/images/icons/auth/discord.svg',
  google:   '/images/icons/auth/google.svg',
  eyeOpen:  '/images/icons/auth/eye.svg',
  eyeClose: '/images/icons/auth/eye-off.svg',
  question: '/images/icons/auth/question.svg',
} as const

const isSubmitDisabled = computed(() => {
  if (!CREDENTIALS_ENABLED) return true
  if (store.isLoading) return true
  if (mode.value === 'login') return !username.value.trim() || !password.value
  return !username.value.trim() || !password.value || !confirmPassword.value
})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function switchMode(m: AuthMode) {
  store.clearError()
  username.value = password.value = confirmPassword.value = ''
  pwMismatch.value = false
  showPassword.value = false
  router.push({ name: m, query: route.query })
}

// ─── Actions ──────────────────────────────────────────────────────────────────
async function handleOAuth(provider: 'google' | 'discord' | 'github') {
  await store.signInWithOAuth(provider, redirectAfterAuth.value)
}

async function handleSubmit() {
  if (isSubmitDisabled.value) return
  if (mode.value === 'login') {
    const ok = await store.signInWithUsername(username.value.trim(), password.value)
    if (ok) router.push(redirectAfterAuth.value)
  } else {
    if (password.value !== confirmPassword.value) { pwMismatch.value = true; return }
    pwMismatch.value = false
    const ok = await store.signUpWithUsername(username.value.trim(), password.value)
    if (ok) router.push(redirectAfterAuth.value)
  }
}
</script>

<template>
  <div :class="$style.page">
    <div :class="$style.card">

      <!-- ── Title ──────────────────────────────────────────────── -->
      <div :class="$style.headerRow">
        <span :class="$style.cardTitle" class="type-h1-page-title-sb">
          {{ mode === 'login' ? 'LOGIN' : 'REGISTER' }}
        </span>
      </div>

      <!-- ── Divider ────────────────────────────────────────────── -->
      <div :class="$style.divider" />

      <!-- ── Body ──────────────────────────────────────────────── -->
      <div :class="$style.body">
        <div :class="$style.formWrapper">
          <div :class="$style.formGroup">

            <!-- ── OAuth row ──────────────────────────────────────── -->
            <div :class="$style.oauthRow">
              <button
                v-for="{ key, label } in ([
                  { key: 'github',  label: 'Github'  },
                  { key: 'discord', label: 'Discord' },
                  { key: 'google',  label: 'Google'  },
                ] as { key: 'github' | 'discord' | 'google', label: string }[])"
                :key="key"
                :class="$style.oauthBtn"
                class="type-button-r"
                type="button"
                :disabled="store.isLoading"
                @click="handleOAuth(key)"
              >
                <img
                  :src="ICONS[key]"
                  :alt="label"
                  :class="$style.oauthIcon"
                />
                <span>{{ label }}</span>
              </button>
            </div>

            <!-- ── Credentials form (disabled until feature is ready) ── -->
            <div :class="$style.credentialsSection">

              <!-- Username -->
              <div :class="$style.textField">
                <label :class="$style.fieldLabel" class="type-overline-r">Username</label>
                <div :class="$style.fieldWrapper">
                  <input
                    v-model="username"
                    :class="$style.input"
                    class="type-caption-r"
                    type="text"
                    placeholder="your_username"
                    autocomplete="username"
                    spellcheck="false"
                    disabled
                  />
                </div>
              </div>

              <!-- Password -->
              <div :class="$style.textField">
                <div :class="$style.labelRow">
                  <label :class="$style.fieldLabel" class="type-overline-r">Password</label>
                  <div v-if="mode === 'register'" :class="$style.tooltipWrap">
                    <img :src="ICONS.question" :class="$style.tooltipTrigger" alt="Password requirements" />
                    <div :class="$style.tooltip">
                      <p :class="$style.tooltipText">
                        All new passwords must contain at least 8 characters.<br />
                        We also suggest having at least one capital and one lower-case letter (Aa-Zz),
                        one special symbol (#, &amp;, % etc), and one number (0-9) in your password
                        for the best strength.
                      </p>
                    </div>
                  </div>
                </div>
                <div :class="$style.fieldWrapper">
                  <input
                    v-model="password"
                    :class="$style.input"
                    class="type-caption-r"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                    disabled
                  />
                  <button :class="$style.eyeBtn" type="button" tabindex="-1" disabled>
                    <img
                      :src="showPassword ? ICONS.eyeClose : ICONS.eyeOpen"
                      :class="$style.eyeIcon"
                      :alt="showPassword ? 'Hide password' : 'Show password'"
                    />
                  </button>
                </div>
              </div>

              <!-- Confirm Password (register only) -->
              <div v-if="mode === 'register'" :class="$style.textField">
                <label :class="$style.fieldLabel" class="type-overline-r">Confirm Password</label>
                <div :class="$style.fieldWrapper">
                  <input
                    v-model="confirmPassword"
                    :class="$style.input"
                    class="type-caption-r"
                    type="password"
                    placeholder="••••••••"
                    autocomplete="new-password"
                    disabled
                  />
                </div>
              </div>

              <!-- Footer row -->
              <div :class="$style.footerRow" class="type-overline-r">
                <template v-if="mode === 'login'">
                  <label :class="$style.rememberRow">
                    <span :class="[$style.checkbox, rememberMe && $style.checkboxChecked]" />
                    <span>Remember</span>
                  </label>
                  <div :class="$style.switchRow">
                    <span>New here?</span>
                    <button :class="$style.linkBtn" type="button" @click="switchMode('register')">Register</button>
                  </div>
                </template>
                <template v-else>
                  <div :class="$style.switchRow">
                    <span>Already have an account?</span>
                    <button :class="$style.linkBtn" type="button" @click="switchMode('login')">Login</button>
                  </div>
                </template>
              </div>

            </div>
            <!-- end credentials section -->

            <!-- Auth error -->
            <span v-if="store.error" :class="$style.errorMsg" class="type-handling-r">
              {{ store.error }}
            </span>

          </div>

          <!-- Submit -->
          <button
            :class="$style.submitBtn"
            class="type-button-r"
            type="button"
            :disabled="isSubmitDisabled"
            @click="handleSubmit"
          >
            <span v-if="store.isLoading">Loading…</span>
            <span v-else>{{ mode === 'login' ? 'Sign in' : 'Sign up' }}</span>
          </button>

        </div>
      </div>

    </div>
  </div>
</template>

<style module>
/* CSS filter to recolor icons to match the primary token. */
.tintPrimary {
  filter: brightness(0) saturate(100%) invert(57%) sepia(19%) saturate(580%)
          hue-rotate(188deg) brightness(88%) contrast(85%);
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
.page {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  /* background-color: var(--color-text-primary); */
  padding: 20px;
  font-family: var(--font-sans);
  overflow: auto;
}

/* ── Card ─────────────────────────────────────────────────────────────────── */
.card {
  width: 100%;
  max-width: 820px;
  min-height: 587px;
  border-radius: 16px;
  background-color: var(--color-main-surface);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px;
  box-sizing: border-box;
  gap: 10px;
  text-align: left;
  color: var(--color-text-secondary);
}

.headerRow {
  align-self: stretch;
  display: flex;
  align-items: flex-start;
}

.cardTitle {
  color: var(--color-text-secondary);
}

.divider {
  align-self: stretch;
  height: 1px;
  border-top: 1px solid var(--color-main-divider);
}

/* ── Body ─────────────────────────────────────────────────────────────────── */
.body {
  align-self: stretch;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
}

.formWrapper {
  width: 100%;
  max-width: 762px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.formGroup {
  width: 452px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* ── OAuth ────────────────────────────────────────────────────────────────── */
.oauthRow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 380px;
}

.oauthBtn {
  height: 45px;
  width: 109px;
  border-radius: 12px;
  border: 1px solid var(--color-main-primary);
  background: transparent;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 10px;
  gap: 10px;
  cursor: pointer;
  color: var(--color-main-primary);
  font-weight: 300;
  font-family: var(--font-sans);
  transition: background-color 0.18s;
  flex-shrink: 0;
  overflow: hidden;
}

.oauthBtn:hover:not(:disabled) { background-color: color-mix(in srgb, var(--color-main-primary) 12%, transparent); }
.oauthBtn:active:not(:disabled) { background-color: color-mix(in srgb, var(--color-main-primary) 22%, transparent); }
.oauthBtn:disabled { opacity: 0.5; cursor: not-allowed; }

.oauthIcon {
  height: 24px;
  width: 24px;
  flex-shrink: 0;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(57%) sepia(19%) saturate(580%)
          hue-rotate(188deg) brightness(88%) contrast(85%);
}

/* ── Credentials section (disabled) ──────────────────────────────────────── */
.credentialsSection {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  opacity: 0.35;
  pointer-events: none;
  user-select: none;
  cursor: not-allowed;
}

/* ── Text fields ──────────────────────────────────────────────────────────── */
.textField {
  width: 346px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

/* Label row: label text + optional tooltip icon */
.labelRow {
  align-self: stretch;
  display: flex;
  align-items: center;
  gap: 6px;
}

.fieldLabel {
  font-weight: 300;
  color: var(--color-text-secondary);
}

.fieldWrapper {
  align-self: stretch;
  height: 48px;
  border-radius: 8px;
  background-color: var(--color-input-bg);
  border: 1px solid var(--color-input-placeholder);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 0 12px 0 16px;
  overflow: hidden;
  flex-shrink: 0;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.fieldWrapper:focus-within {
  border-color: var(--color-input-border-focus);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-input-border-focus) 18%, transparent);
}

.fieldError {
  border-color: var(--color-status-error) !important;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-status-error) 15%, transparent) !important;
}

.input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text-input);
  caret-color: var(--color-text-input);
  font-family: var(--font-sans);
  font-weight: 300;
  min-width: 0;
  -webkit-text-fill-color: var(--color-text-input);
}

.input::placeholder { color: var(--color-text-disabled); font-weight: 300; }

.input::selection {
  background-color: var(--color-input-placeholder-bg);
  color: var(--color-text-input);
  -webkit-text-fill-color: var(--color-text-input);
}

.input:-webkit-autofill,
.input:-webkit-autofill:hover,
.input:-webkit-autofill:focus {
  box-shadow: 0 0 0 1000px var(--color-input-bg) inset;
  caret-color: var(--color-text-input);
  -webkit-text-fill-color: var(--color-text-input);
}

/* ── Eye button ───────────────────────────────────────────────────────────── */
.eyeBtn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.eyeBtn:hover { background-color: color-mix(in srgb, var(--color-text-input) 6%, transparent); }

.eyeIcon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(67%) sepia(8%) saturate(380%)
          hue-rotate(185deg) brightness(95%) contrast(88%);
}

/* ── Tooltip ──────────────────────────────────────────────────────────────── */
.tooltipWrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.tooltipTrigger {
  width: 16px;
  height: 16px;
  cursor: help;
  object-fit: contain;
  filter: brightness(0) saturate(100%) invert(57%) sepia(19%) saturate(580%)
          hue-rotate(188deg) brightness(88%) contrast(85%);
  transition: opacity 0.15s;
}

.tooltipTrigger:hover { opacity: 0.75; }

.tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--color-neutral-900);
  border: 1px solid var(--color-main-divider);
  border-radius: 10px;
  padding: 12px 14px;
  width: 300px;
  z-index: 200;
  pointer-events: none;
}

.tooltipWrap:hover .tooltip { display: block; }

.tooltipText {
  margin: 0;
  font-weight: 300;
  color: var(--color-neutral-300);
  line-height: 1.6;
}

/* ── Footer row ───────────────────────────────────────────────────────────── */
.footerRow {
  width: 346px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 7.8px;
  color: var(--color-button-primary-btn-text-active);
  font-weight: 300;
}

.rememberRow {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  user-select: none;
}

.checkbox {
  height: 16px;
  width: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--color-main-secondary);
  box-sizing: border-box;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.18s, border-color 0.18s;
}

.checkboxChecked { background-color: var(--color-main-primary); border-color: var(--color-main-primary); }

.checkboxChecked::after {
  content: '';
  display: block;
  width: 9px;
  height: 5px;
  border-left: 2px solid var(--color-button-primary-btn-text-active);
  border-bottom: 2px solid var(--color-button-primary-btn-text-active);
  transform: rotate(-45deg) translateY(-1px);
}

.switchRow {
  display: flex;
  align-items: center;
  gap: 4px;
  font-weight: 300;
}

.linkBtn {
  background: none;
  border: none;
  padding: 0;
  text-decoration: underline;
  font-weight: 600;
  color: var(--color-main-primary);
  cursor: pointer;
  font-family: var(--font-sans);
  transition: color 0.18s;
}

.linkBtn:hover { color: var(--color-neutral-400); }

/* ── Error ────────────────────────────────────────────────────────────────── */
.errorMsg {
  color: var(--color-status-error);
  font-weight: 300;
  align-self: flex-start;
}

/* ── Submit ───────────────────────────────────────────────────────────────── */
.submitBtn {
  width: 148px;
  height: 34px;
  border-radius: 12px;
  background-color: var(--color-button-primary-btn-bg);
  border: 1px solid var(--color-button-primary-btn-bg);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
  color: var(--color-button-primary-btn-text-active);
  cursor: pointer;
  font-family: var(--font-sans);
  font-weight: 300;
  transition: background-color 0.18s, opacity 0.18s;
  flex-shrink: 0;
  overflow: hidden;
}

.submitBtn:hover:not(:disabled) { background-color: var(--color-button-primary-btn-hover); }
.submitBtn:active:not(:disabled) { background-color: var(--color-button-primary-btn-active); }
.submitBtn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  background-color: var(--color-button-primary-btn-bg);
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 520px) {
  .formGroup { width: 100%; padding: 0 10px; }
  .textField, .footerRow { width: 100%; }
  .oauthRow { width: 100%; }
  .oauthBtn { flex: 1; width: auto; }
}
</style>
