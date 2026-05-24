<script setup lang="ts">
import { RouterView } from 'vue-router'
import { BackgroundEffect, AppNavbar } from '@/components'
</script>

<template>
  <RouterView />
  <BackgroundEffect />
  <AppNavbar />
</template>

<style scoped></style>
