<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { BackgroundEffect, AppNavbar, UserControl } from '@/components'
import { useUserStore } from '@/stores'

const userStore = useUserStore()

onMounted(() => {
  void userStore.initAuth()
})
</script>

<template>
  <RouterView />
  <BackgroundEffect />
  <AppNavbar />
  <UserControl />
</template>

<style scoped></style>
