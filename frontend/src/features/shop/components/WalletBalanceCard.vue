<script setup lang="ts">
interface Props {
    avatarUrl?: string;
    balance: string;
    loading?: boolean;
    username: string;
}

withDefaults(defineProps<Props>(), {
    avatarUrl: "/images/users/fujipp/profile-fujipp.png",
    loading: false,
});
</script>

<template>
    <article :class="$style.balanceCard" aria-live="polite">
        <div :class="$style.identity">
            <img
                :class="$style.avatar"
                :src="avatarUrl"
                alt=""
                aria-hidden="true"
                draggable="false"
            >
            <div :class="$style.username">{{ username }}</div>
        </div>

        <div :class="$style.balancePanel">
            <span :class="$style.creditLabel">เครดิตของคุณ</span>
            <div :class="$style.balanceLine">
                <span :class="$style.balanceValue">{{ loading ? "..." : balance }}</span>
                <span :class="$style.balanceUnit">บาท</span>
            </div>
        </div>
    </article>
</template>

<style module>
.balanceCard {
    display: flex;
    width: 380px;
    min-height: 450px;
    max-width: 100%;
    flex-direction: column;
    align-items: center;
    box-sizing: border-box;
    padding: var(--spacing-space-6);
    gap: var(--spacing-space-5);
    border: 1px solid var(--color-main-border);
    border-radius: var(--radius-2xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: center;
}

.identity {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-space-4);
}

.avatar {
    width: 100%;
    max-width: 240px;
    aspect-ratio: 1 / 1;
    border-radius: var(--radius-2xl);
    object-fit: cover;
}

.username {
    font-size: 22px;
    font-weight: 600;
    line-height: 1.2;
}

.balancePanel {
    align-self: stretch;
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-space-1);
    box-sizing: border-box;
    padding: var(--spacing-space-5);
    border-radius: var(--radius-xl);
    background-color: color-mix(in srgb, var(--color-main-primary) 10%, var(--color-main-surface));
}

.creditLabel {
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0.2px;
    color: color-mix(in srgb, var(--color-text-secondary) 72%, transparent);
}

.balanceLine {
    display: flex;
    align-items: baseline;
    gap: 8px;
}

.balanceValue {
    font-size: 40px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.5px;
    color: var(--color-main-primary);
    overflow-wrap: anywhere;
}

.balanceUnit {
    font-size: 16px;
    font-weight: 600;
    color: color-mix(in srgb, var(--color-text-secondary) 72%, transparent);
}

@media (max-width: 1024px) {
    .balanceCard {
        width: 100%;
    }
}

@media (max-width: 520px) {
    .balanceCard {
        width: min(100%, 326px);
    }

    .balanceValue {
        font-size: 34px;
    }
}
</style>
