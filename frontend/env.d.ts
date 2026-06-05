/// <reference types="vite/client" />

import 'vue-router'

interface ImportMetaEnv {
  /** Which backend to call: "local" | "host". */
  readonly VITE_API_TARGET?: 'local' | 'host'
  readonly VITE_API_LOCAL_URL?: string
  readonly VITE_API_HOST_URL?: string
  /** Hard override; wins over VITE_API_TARGET (set by CI / production builds). */
  readonly VITE_API_BASE_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    guestOnly?: boolean
  }
}

export {}