<script setup lang="ts">
import { ref } from "vue";
import { icons } from "@/config";
import { PrimaryButton } from "@/shared/ui/buttons";
import { TextField } from "@/shared/ui/fields";
import { CheckboxInput } from "@/shared/ui/inputs";

type AuthMode = "login" | "register";
type OAuthProvider = "google" | "discord" | "github";

interface Props {
    mode?: AuthMode;
    username?: string;
    password?: string;
    confirmPassword?: string;
    remember?: boolean;
    loading?: boolean;
    error?: string;
    credentialsEnabled?: boolean;
    modal?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    mode: "login",
    username: "",
    password: "",
    confirmPassword: "",
    remember: false,
    loading: false,
    error: "",
    credentialsEnabled: true,
    modal: false,
});

const emit = defineEmits<{
    "update:username": [value: string];
    "update:password": [value: string];
    "update:confirmPassword": [value: string];
    "update:remember": [value: boolean];
    oauth: [provider: OAuthProvider];
    submit: [];
    "switch-mode": [mode: AuthMode];
    back: [];
}>();

const showPassword = ref(false);
const oauthButtons: { provider: OAuthProvider; label: string; icon: string }[] = [
    { provider: "google", label: "Google", icon: icons.google },
    { provider: "discord", label: "Discord", icon: icons.discord },
    { provider: "github", label: "Github", icon: icons.github },
];

const fieldsDisabled = (): boolean => !props.credentialsEnabled || props.loading;
</script>

<template>
    <section
        :class="[$style.authCard, modal ? $style.modalCard : '']"
        :aria-label="mode === 'login' ? 'Sign in to Fujipp' : 'Sign up for Fujipp'"
    >
        <span v-if="modal" :class="$style.sheetIndicator" aria-hidden="true" />
        <div :class="$style.header">
            <span :class="$style.headerSpacer" aria-hidden="true" />
            <span :class="$style.logo" aria-hidden="true" />
            <button type="button" :class="$style.closeButton" aria-label="Close" @click="emit('back')">
                <span :class="$style.closeIcon" aria-hidden="true" />
            </button>
        </div>

        <h1 :class="$style.title">
            {{ mode === "login" ? "Sign in to Fujipp" : "Sign up for Fujipp" }}
        </h1>

        <div v-if="mode === 'register'" :class="$style.oauthRow">
            <PrimaryButton
                v-for="button in oauthButtons"
                :key="button.provider"
                width-mode="hug"
                :leading-icon="button.icon"
                :disabled="loading"
                @click="emit('oauth', button.provider)"
            >
                {{ button.label }}
            </PrimaryButton>
        </div>

        <div v-if="mode === 'register'" :class="$style.orRow">
            <span /><span>or</span><span />
        </div>

        <form :class="$style.form" @submit.prevent="emit('submit')">
            <TextField
                :class="$style.field"
                :label="mode === 'register' ? 'Username *' : 'Username'"
                :model-value="username"
                autocomplete="username"
                :disabled="fieldsDisabled()"
                @update:model-value="emit('update:username', $event)"
            />
            <TextField
                :class="$style.field"
                :label="mode === 'register' ? 'Password *' : 'Password'"
                :model-value="password"
                :type="showPassword ? 'text' : 'password'"
                :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
                :disabled="fieldsDisabled()"
                @update:model-value="emit('update:password', $event)"
            >
                <template #icon>
                    <button
                        type="button"
                        :class="$style.eyeButton"
                        :aria-label="showPassword ? 'Hide password' : 'Show password'"
                        :disabled="fieldsDisabled()"
                        @click.prevent="showPassword = !showPassword"
                    >
                        <img :src="showPassword ? icons.eyeClose : icons.eye" alt="">
                    </button>
                </template>
            </TextField>
            <TextField
                v-if="mode === 'register'"
                :class="$style.field"
                label="Confirm Password *"
                :model-value="confirmPassword"
                type="password"
                autocomplete="new-password"
                :disabled="fieldsDisabled()"
                @update:model-value="emit('update:confirmPassword', $event)"
            />

            <label v-if="mode === 'register'" :class="$style.termsRow">
                <CheckboxInput
                    :model-value="remember"
                    size="s"
                    :disabled="fieldsDisabled()"
                    @update:model-value="emit('update:remember', $event)"
                />
                <span>Do you agree to our <u>Terms</u> and <RouterLink to="/privacy">Privacy Policy</RouterLink>.</span>
            </label>

            <p v-if="error" :class="$style.error" role="alert">{{ error }}</p>

            <PrimaryButton
                :class="$style.submitButton"
                width-mode="fill"
                :disabled="!credentialsEnabled || loading"
                @click="emit('submit')"
            >
                {{ loading ? "Loading…" : mode === "login" ? "Sign in" : "Create account" }}
            </PrimaryButton>
        </form>

        <div v-if="mode === 'login'" :class="$style.orRow">
            <span /><span>or</span><span />
        </div>

        <div v-if="mode === 'login'" :class="$style.oauthRow">
            <PrimaryButton
                v-for="button in oauthButtons"
                :key="button.provider"
                width-mode="hug"
                :leading-icon="button.icon"
                :disabled="loading"
                @click="emit('oauth', button.provider)"
            >
                {{ button.label }}
            </PrimaryButton>
        </div>

        <div :class="$style.switchRow">
            <span>{{ mode === "login" ? "New here?" : "Already have an account?" }}</span>
            <button
                type="button"
                :class="$style.switchLink"
                @click="emit('switch-mode', mode === 'login' ? 'register' : 'login')"
            >
                {{ mode === "login" ? "Create an account" : "Sign in" }}
            </button>
        </div>
    </section>
</template>

<style module>
.authCard {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    width: 100%;
    min-height: 520px;
    padding: 12px 16px;
    gap: 8px;
    border-radius: var(--radius-xl);
    background: var(--color-dialog-background);
    color: var(--color-dialog-text-primary);
    font-family: var(--font-sans);
    text-align: left;
}

.authCard:has(.termsRow) { min-height: 570px; }
.header { display: flex; align-items: center; justify-content: space-between; align-self: stretch; gap: 20px; }
.headerSpacer, .closeButton { width: 32px; height: 32px; }
.logo { width: 32px; height: 28px; background: currentColor; mask: url('/brand/fujipp-logo.svg') center / contain no-repeat; -webkit-mask: url('/brand/fujipp-logo.svg') center / contain no-repeat; }
.closeButton { display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; }
.closeIcon { width: 24px; height: 24px; background: currentColor; mask: url('/icons/navigation/hamburger-close.svg') center / contain no-repeat; -webkit-mask: url('/icons/navigation/hamburger-close.svg') center / contain no-repeat; }
.title { align-self: stretch; margin: 0; font-family: var(--font-rammetto-one); font-size: 32px; font-weight: 400; line-height: 1.25; text-align: center; }
.form { display: flex; flex-direction: column; align-items: center; align-self: stretch; gap: 8px; padding: 12px 16px; }
.field, .submitButton { width: 100%; max-width: 370px; }
.oauthRow { display: flex; align-items: flex-start; justify-content: center; flex-wrap: wrap; align-self: stretch; gap: 12px; }
.orRow { display: flex; align-items: center; justify-content: center; width: min(100%, 370px); gap: 8px; color: var(--color-text-secondary); font-weight: 300; }
.orRow > span:first-child, .orRow > span:last-child { flex: 1; height: 1px; background: var(--color-main-divider); }
.eyeButton { display: inline-flex; align-items: center; justify-content: center; padding: 0; border: 0; background: none; cursor: pointer; }
.eyeButton:disabled { cursor: not-allowed; opacity: .45; }
.eyeButton img { width: 16px; height: 16px; }
.termsRow { display: flex; align-items: center; width: min(100%, 370px); gap: 8px; font-size: var(--type-size-button); font-weight: 300; }
.termsRow a { color: inherit; text-decoration: underline; }
.error { width: min(100%, 370px); margin: 0; color: var(--color-status-error); font-size: 14px; }
.switchRow { display: flex; align-items: center; gap: 12px; color: var(--color-text-secondary); font-weight: 300; }
.switchLink { padding: 0; border: 0; background: none; color: var(--color-dialog-text-primary); font: inherit; font-weight: 600; text-decoration: underline; cursor: pointer; }
.closeButton:focus-visible, .switchLink:focus-visible { outline: 2px solid var(--color-main-primary); outline-offset: 2px; }
.sheetIndicator { display: none; }

@media (max-width: 767px) {
    .modalCard { justify-content: flex-start; height: calc(100dvh - 16px); min-height: 0; max-height: calc(100dvh - 16px); padding: 12px 16px 32px; overflow-y: auto; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
    .modalCard:has(.termsRow) { min-height: 0; }
    .sheetIndicator { display: block; width: 24px; height: 4px; flex-shrink: 0; border-radius: var(--radius-sm); background: var(--color-dialog-text-primary); }
    .title { font-size: 26px; }
    .form { padding: 12px 0; }
    .oauthRow { gap: 8px; }
    .switchRow { font-size: 14px; }
}
</style>
