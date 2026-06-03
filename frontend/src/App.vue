<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { BackgroundEffect, AppNavbar, UserControl } from '@/components'
import { useUserStore } from '@/stores'

const userStore = useUserStore()
const route = useRoute()
const shouldShowAppChrome = computed(() => !route.path.startsWith('/shop'))

onMounted(() => {
  void userStore.initAuth()
})
</script>

<template>
  <RouterView />
  <BackgroundEffect />
  <AppNavbar v-if="shouldShowAppChrome" />
  <UserControl v-if="shouldShowAppChrome" />
</template>

<style scoped></style>
