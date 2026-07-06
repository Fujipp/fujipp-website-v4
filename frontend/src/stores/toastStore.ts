import { ref } from 'vue'
import { defineStore } from 'pinia'

export type ToastStatus = 'info' | 'success' | 'warning' | 'error'

export interface ToastItem {
  description: string
  id: number
  status: ToastStatus
  title: string
}

const TOAST_DURATION_MS = 5000

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<ToastItem[]>([])
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  let nextId = 1

  function show(title: string, description = '', status: ToastStatus = 'info'): number {
    const id = nextId++

    toasts.value.push({ description, id, status, title })
    timers.set(id, setTimeout(() => dismiss(id), TOAST_DURATION_MS))

    return id
  }

  function dismiss(id: number): void {
    const timer = timers.get(id)

    if (timer) {
      clearTimeout(timer)
      timers.delete(id)
    }

    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return { dismiss, show, toasts }
})
