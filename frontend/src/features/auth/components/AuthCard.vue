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
    { provider: "google", label: "Sign In", icon: icons.google },
    { provider: "discord", label: "Discord", icon: icons.discord },
    { provider: "github", label: "Github", icon: icons.github },
];

const fieldsDisabled = (): boolean => !props.credentialsEnabled || props.loading;
</script>

<template>
    <section :class="$style.authCard" :aria-label="mode === 'login' ? 'Login' : 'Register'">
        <div :class="$style.headRow">
            <h1 :class="$style.title">{{ mode === "login" ? "LOGIN" : "REGISTER" }}</h1>
            <PrimaryButton
                width-mode="hug"
                :leading-icon="icons.arrowBack"
                @click="emit('back')"
            >
                Back
            </PrimaryButton>
        </div>
        <hr :class="$style.divider">

        <div :class="$style.body">
            <div :class="$style.formGroup">
                <div :class="$style.oauthRow">
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

                <form :class="$style.fields" @submit.prevent="emit('submit')">
                    <TextField
                        :class="$style.field"
                        label="Username"
                        :model-value="username"
                        autocomplete="username"
                        :disabled="fieldsDisabled()"
                        @update:model-value="emit('update:username', $event)"
                    />
                    <TextField
                        :class="$style.field"
                        label="Password"
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
                        label="Confirm Password"
                        :model-value="confirmPassword"
                        type="password"
                        autocomplete="new-password"
                        :disabled="fieldsDisabled()"
                        @update:model-value="emit('update:confirmPassword', $event)"
                    />

                    <div :class="$style.footerRow">
                        <label v-if="mode === 'login'" :class="$style.rememberRow">
                            <CheckboxInput
                                :model-value="remember"
                                size="s"
                                :disabled="fieldsDisabled()"
                                @update:model-value="emit('update:remember', $event)"
                            />
                            Remember
                        </label>
                        <div :class="$style.switchRow">
                            <span>{{ mode === "login" ? "New here?" : "Already have an account?" }}</span>
                            <button
                                type="button"
                                :class="$style.switchLink"
                                @click="emit('switch-mode', mode === 'login' ? 'register' : 'login')"
                            >
                                {{ mode === "login" ? "Register" : "Login" }}
                            </button>
                        </div>
                    </div>

                    <p v-if="error" :class="$style.error" role="alert">{{ error }}</p>
                </form>
            </div>

            <PrimaryButton
                width-mode="hug"
                :disabled="!credentialsEnabled || loading"
                @click="emit('submit')"
            >
                {{ loading ? "Loading…" : mode === "login" ? "Sign In" : "Sign Up" }}
            </PrimaryButton>
        </div>
    </section>
</template>

<style module>
.authCard {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    width: 100%;
    flex: 1;
    gap: 8px;
    border-radius: var(--radius-xl);
    padding: 12px 16px;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    text-align: left;
}

.headRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    align-self: stretch;
    gap: 20px;
}

.title {
    margin: 0;
    font-size: var(--type-size-h1-page-title);
    font-weight: 800;
}

.divider {
    align-self: stretch;
    height: 1px;
    margin: 0;
    border: 0;
    border-top: 1px solid var(--color-main-divider);
}

.body {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.formGroup {
    display: flex;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    width: min(100%, 500px);
    gap: 8px;
    padding: 12px 16px;
}

.oauthRow {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    flex-wrap: wrap;
    align-self: stretch;
    gap: 12px;
}

.fields {
    display: flex;
    flex-direction: column;
    align-items: center;
    align-self: stretch;
    gap: 8px;
}

.field {
    max-width: 370px;
}

.eyeButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin: 0;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
}

.eyeButton:disabled {
    cursor: not-allowed;
    opacity: 0.45;
}

.eyeButton img {
    width: 16px;
    height: 16px;
    object-fit: contain;
}

.footerRow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-sizing: border-box;
    width: min(100%, 370px);
    gap: 20px;
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 300;
}

.footerRow:has(.switchRow:only-child) {
    justify-content: flex-end;
}

.rememberRow {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    user-select: none;
}

.switchRow {
    display: flex;
    align-items: center;
    gap: 12px;
}

.switchLink {
    margin: 0;
    border: none;
    background: none;
    padding: 0;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
}

.switchLink:hover {
    color: var(--color-text-secondary);
}

.switchLink:focus-visible {
    outline: 2px solid var(--color-main-primary);
    outline-offset: 2px;
}

.error {
    align-self: flex-start;
    margin: 0;
    color: var(--color-status-error);
    font-size: 14px;
    font-weight: 300;
}
</style>
