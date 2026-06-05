<script setup lang="ts">
interface Props {
    title: string;
}

defineProps<Props>();
</script>

<template>
    <header :class="$style.titleSection">
        <h2 :class="$style.title" class="font-sans font-semibold text-text-primary">
            {{ title }}
        </h2>
        <hr :class="$style.divider" class="border-main-divider">
    </header>
</template>

<style module>
.titleSection {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    text-align: center;
}

.title {
    align-self: stretch;
    margin: 0;
    font-size: 3rem;
    line-height: normal;
    letter-spacing: 0;
}

.divider {
    box-sizing: border-box;
    width: 100%;
    height: 1px;
    margin: 0;
    border-width: 1px 0 0;
}
</style>
