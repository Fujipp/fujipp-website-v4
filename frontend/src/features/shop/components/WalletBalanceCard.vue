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
        <img
            :class="$style.avatar"
            :src="avatarUrl"
            alt=""
            aria-hidden="true"
            draggable="false"
        >
        <div :class="$style.username">{{ username }}</div>

        <div :class="$style.creditRow">
            <div :class="$style.creditLabel">เครดิตของคุณ</div>
            <div :class="$style.balanceWrap">
                <div :class="$style.balanceValue">{{ loading ? "..." : balance }}</div>
            </div>
            <div :class="$style.creditLabel">บาท</div>
        </div>
    </article>
</template>

<style module>
.balanceCard {
    display: flex;
    width: 380px;
    height: 450px;
    max-width: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: var(--spacing-space-3);
    gap: 10px;
    border-radius: var(--radius-xl);
    background-color: var(--color-main-surface);
    color: var(--color-text-secondary);
    text-align: center;
}

.avatar {
    width: 275px;
    height: 275px;
    border-radius: var(--radius-xl);
    object-fit: cover;
}

.username {
    align-self: stretch;
    font-size: 24px;
    font-weight: 800;
    line-height: 1.15;
}

.creditRow {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    color: var(--color-text-secondary);
    text-align: left;
}

.creditLabel {
    font-size: 22px;
    font-weight: 800;
    line-height: 1.15;
    white-space: nowrap;
}

.balanceWrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 0;
    text-align: center;
}

.balanceValue {
    font-size: 32px;
    font-weight: 800;
    line-height: 1.15;
    overflow-wrap: anywhere;
}

@media (max-width: 1024px) {
    .balanceCard {
        width: 100%;
    }
}

@media (max-width: 520px) {
    .balanceCard {
        width: min(100%, 326px);
        height: 450px;
    }

    .creditRow {
        gap: 12px;
    }

    .creditLabel {
        font-size: 20px;
    }
}
</style>
