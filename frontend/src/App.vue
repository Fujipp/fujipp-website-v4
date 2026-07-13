<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { BackgroundEffect, AppNavbar } from '@/shared/layout'
import { ToastHost } from '@/shared/ui/toasts'
import { ConfirmModal } from '@/shared/ui/modals'
import { useToastStore, useUserStore } from '@/stores'
import { useProjectStore } from '@/features/projects/stores'
import { icons } from '@/config'

const CLICK_SOUND_SRC = '/music/click.MP3'
const CLICK_SOUND_VOLUME = 0.2
const TOOLS_SOUND_SRC = '/music/olded-click.MP3'
const TOOLS_POSITION_KEY = 'admin-tools-position'

const userStore = useUserStore()
const projectStore = useProjectStore()
const toastStore = useToastStore()
const route = useRoute()
const router = useRouter()
const CHROME_SHOP_ROUTES = ['shop-dashboard', 'shop-wallet', 'shop-package', 'shop-runtime', 'shop-maintenance', 'shop-bot-config', 'shop-bot-embeds']
const isAdminRoute = computed(() => route.matched.some((record) => record.meta.requiresAdmin === true))
const shouldShowAppChrome = computed(() =>
  // Shop and Admin workspaces use the shared navbar; deeper Shop pages keep their own chrome.
  (CHROME_SHOP_ROUTES.includes(String(route.name)) || isAdminRoute.value || !route.path.startsWith('/shop'))
  && !['login', 'register'].includes(String(route.name)))
const isShopRoute = computed(() => route.path.startsWith('/shop'))
const currentRouteRequiresAuth = computed(() =>
  route.matched.some((record) => record.meta.requiresAuth === true || record.meta.requiresAdmin === true),
)
const isProjectRoute = computed(() => route.path.startsWith('/projects'))
const showAdminTools = computed(() => userStore.isAdmin && isProjectRoute.value)
const toolsLevel = ref<'closed' | 'categories' | 'projects' | 'edit' | 'delete'>('closed')
const deleteProjectTarget = ref<{ id: string | number; name: string } | null>(null)
const isDeletingProject = ref(false)
const toolsPosition = ref({ x: 0, y: 0 })
const isDraggingTools = ref(false)
let toolsAudio: HTMLAudioElement | undefined
let dragPointerId: number | null = null
let dragStart = { pointerX: 0, pointerY: 0, x: 0, y: 0 }
let didDragTools = false
let closedToolsPosition: { x: number; y: number } | null = null

const toolsPositionStyle = computed(() => ({
  left: `${toolsPosition.value.x}px`,
  top: `${toolsPosition.value.y}px`,
}))
const toolsPickerOnLeft = computed(() => toolsPosition.value.x > window.innerWidth / 2)

function clampToolsPosition(x: number, y: number): { x: number; y: number } {
  const padding = toolsLevel.value === 'closed' ? 36 : Math.min(142, window.innerWidth / 2 - 8, window.innerHeight / 2 - 8)
  return {
    x: Math.min(Math.max(x, padding), window.innerWidth - padding),
    y: Math.min(Math.max(y, padding), window.innerHeight - padding),
  }
}

function playToolsSound(): void {
  toolsAudio ??= new Audio(TOOLS_SOUND_SRC)
  toolsAudio.volume = 0.18
  toolsAudio.currentTime = 0
  void toolsAudio.play().catch(() => undefined)
}

function setToolsLevel(level: 'closed' | 'categories' | 'projects' | 'edit' | 'delete'): void {
  if (toolsLevel.value === 'closed' && level !== 'closed') {
    closedToolsPosition = { ...toolsPosition.value }
  }
  toolsLevel.value = level
  if (level === 'closed' && closedToolsPosition) {
    toolsPosition.value = clampToolsPosition(closedToolsPosition.x, closedToolsPosition.y)
    closedToolsPosition = null
  } else {
    toolsPosition.value = clampToolsPosition(toolsPosition.value.x, toolsPosition.value.y)
  }
  playToolsSound()
}

async function toggleAdminTools(): Promise<void> {
  if (didDragTools) {
    didDragTools = false
    return
  }
  setToolsLevel(toolsLevel.value === 'closed' ? 'categories' : 'closed')
  if (!projectStore.hasLoadedAll) {
    await projectStore.fetchProjects().catch(() => undefined)
  }
}

function handleToolsCenter(): void {
  if (toolsLevel.value === 'projects' || toolsLevel.value === 'edit' || toolsLevel.value === 'delete') {
    setToolsLevel('categories')
    return
  }
  void toggleAdminTools()
}

function startToolsDrag(event: PointerEvent): void {
  if (event.button !== 0 || toolsLevel.value !== 'closed') return
  dragPointerId = event.pointerId
  dragStart = { pointerX: event.clientX, pointerY: event.clientY, x: toolsPosition.value.x, y: toolsPosition.value.y }
  didDragTools = false
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function moveToolsDrag(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId) return
  const deltaX = event.clientX - dragStart.pointerX
  const deltaY = event.clientY - dragStart.pointerY
  if (Math.hypot(deltaX, deltaY) > 5) {
    didDragTools = true
    isDraggingTools.value = true
  }
  if (isDraggingTools.value) toolsPosition.value = clampToolsPosition(dragStart.x + deltaX, dragStart.y + deltaY)
}

function endToolsDrag(event: PointerEvent): void {
  if (dragPointerId !== event.pointerId) return
  dragPointerId = null
  isDraggingTools.value = false
  localStorage.setItem(TOOLS_POSITION_KEY, JSON.stringify(toolsPosition.value))
}

function restoreToolsPosition(): void {
  const fallback = { x: window.innerWidth - 52, y: window.innerHeight - 52 }
  try {
    const stored = JSON.parse(localStorage.getItem(TOOLS_POSITION_KEY) || 'null') as { x?: number; y?: number } | null
    toolsPosition.value = clampToolsPosition(stored?.x ?? fallback.x, stored?.y ?? fallback.y)
  } catch {
    toolsPosition.value = clampToolsPosition(fallback.x, fallback.y)
  }
}

function handleToolsResize(): void {
  toolsPosition.value = clampToolsPosition(toolsPosition.value.x, toolsPosition.value.y)
}

function openInlineCreate(): void {
  setToolsLevel('closed')
  void router.push({ name: 'project-inline-new' })
}

function openInlineEdit(projectId: string | number): void {
  setToolsLevel('closed')
  void router.push({ name: 'project-detail', params: { projectId }, query: { edit: 'inline' } })
}

function selectAdminProject(project: (typeof projectStore.projects)[number]): void {
  if (toolsLevel.value === 'delete') {
    deleteProjectTarget.value = {
      id: project.id,
      name: project.content.en.projectName || project.content.th.projectName,
    }
    setToolsLevel('closed')
    return
  }
  openInlineEdit(project.id)
}

async function confirmAdminDelete(): Promise<void> {
  if (!deleteProjectTarget.value || isDeletingProject.value) return
  isDeletingProject.value = true
  try {
    await projectStore.deleteProject(deleteProjectTarget.value.id)
    toastStore.show('Project deleted', `${deleteProjectTarget.value.name} was removed.`, 'success')
    deleteProjectTarget.value = null
    if (route.name === 'project-detail') void router.push({ name: 'projects' })
  } catch (cause) {
    toastStore.show('Unable to delete project', cause instanceof Error ? cause.message : 'Please try again.', 'error')
  } finally {
    isDeletingProject.value = false
  }
}

let clickAudio: HTMLAudioElement | undefined

function isDisabledControl(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  if (element.getAttribute('aria-disabled') === 'true') {
    return true
  }

  if (
    (element instanceof HTMLButtonElement
      || element instanceof HTMLInputElement
      || element instanceof HTMLSelectElement
      || element instanceof HTMLTextAreaElement)
    && element.disabled
  ) {
    return true
  }

  return Boolean(element.closest('fieldset:disabled'))
}

function getClickableControl(event: MouseEvent): Element | null {
  const selectors = [
    'button',
    'a[href]',
    '[role="button"]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    'summary',
  ].join(',')

  for (const target of event.composedPath()) {
    if (!(target instanceof Element)) {
      continue
    }

    const control = target.matches(selectors) ? target : target.closest(selectors)

    if (control) {
      return isDisabledControl(control) ? null : control
    }
  }

  return null
}

function playClickSound(event: MouseEvent): void {
  const control = getClickableControl(event)
  if (!control || control.closest('[data-tools-sound]')) {
    return
  }

  clickAudio ??= new Audio(CLICK_SOUND_SRC)
  clickAudio.volume = CLICK_SOUND_VOLUME
  clickAudio.currentTime = 0
  void clickAudio.play().catch(() => undefined)
}

onMounted(() => {
  void userStore.initAuth()
  document.addEventListener('click', playClickSound, { capture: true })
  restoreToolsPosition()
  window.addEventListener('resize', handleToolsResize, { passive: true })
})

watch(
  isShopRoute,
  (isActive) => {
    document.documentElement.classList.toggle('shop-route', isActive)
  },
  { immediate: true },
)

// A router guard runs only when the location changes. Logout changes the auth state
// in place, so redirect away from protected views once session hydration is complete.
watch(
  [() => userStore.initialized, () => userStore.isAuthenticated, () => route.fullPath],
  ([isInitialized, isAuthenticated]) => {
    if (!isInitialized || isAuthenticated || !currentRouteRequiresAuth.value) {
      return
    }

    if (route.name === 'shop-maintenance') {
      void router.replace({ name: 'home' })
      return
    }

    void router.replace({ name: 'login', query: { redirect: route.fullPath } })
  },
  { immediate: true },
)

onUnmounted(() => {
  document.documentElement.classList.remove('shop-route')
  document.removeEventListener('click', playClickSound, { capture: true })
  window.removeEventListener('resize', handleToolsResize)
})
</script>

<template>
  <RouterView />
  <ToastHost />
  <!-- Floating background belongs to the Home page only. -->
  <BackgroundEffect v-if="route.name === 'home'" />
  <AppNavbar v-if="shouldShowAppChrome" />
  <aside
    v-if="showAdminTools"
    class="admin-tools"
    :class="{ 'admin-tools--open': toolsLevel !== 'closed', 'admin-tools--dragging': isDraggingTools, 'admin-tools--picker-left': toolsPickerOnLeft }"
    :style="toolsPositionStyle"
    aria-label="Admin tools"
  >
    <div v-if="toolsLevel === 'edit' || toolsLevel === 'delete'" class="admin-tools__picker" role="dialog" :aria-label="`Choose a project to ${toolsLevel}`">
      <div class="admin-tools__picker-head">
        <strong>{{ toolsLevel === 'delete' ? 'Delete project' : 'Choose project' }}</strong>
        <button type="button" data-tools-sound aria-label="Back to project tools" @click="setToolsLevel('projects')">←</button>
      </div>
      <button
        v-for="project in projectStore.projects"
        :key="project.id"
        type="button"
        class="admin-tools__project" data-tools-sound
        :class="{ 'admin-tools__project--danger': toolsLevel === 'delete' }"
        @click="selectAdminProject(project)"
      >
        {{ project.content.en.projectName || project.content.th.projectName }}
      </button>
    </div>
    <div class="admin-tools__radial" :class="`admin-tools__radial--${toolsLevel}`">
      <div v-if="toolsLevel !== 'closed'" class="admin-tools__ring" aria-hidden="true" />
      <template v-if="toolsLevel === 'categories'">
        <button type="button" data-tools-sound class="admin-tools__segment admin-tools__segment--one" aria-label="Projects tools" @click="setToolsLevel('projects')">
          <img :src="icons.projects" alt="" aria-hidden="true"><span>Projects</span>
        </button>
        <button type="button" data-tools-sound class="admin-tools__segment admin-tools__segment--two" disabled aria-label="Shop tools coming soon">
          <img :src="icons.shop" alt="" aria-hidden="true"><span>Shop</span>
        </button>
        <button type="button" data-tools-sound class="admin-tools__segment admin-tools__segment--close" aria-label="Close tools" @click="setToolsLevel('closed')">
          <span class="admin-tools__close-icon">×</span><span>Close</span>
        </button>
      </template>
      <template v-else-if="toolsLevel === 'projects' || toolsLevel === 'edit' || toolsLevel === 'delete'">
        <button type="button" data-tools-sound class="admin-tools__segment admin-tools__segment--one" @click="openInlineCreate">
          <img :src="icons.add" alt="" aria-hidden="true"><span>Add</span>
        </button>
        <button type="button" data-tools-sound class="admin-tools__segment admin-tools__segment--two" @click="setToolsLevel('edit')">
          <img :src="icons.edit" alt="" aria-hidden="true"><span>Edit</span>
        </button>
        <button type="button" data-tools-sound class="admin-tools__segment admin-tools__segment--delete" @click="setToolsLevel('delete')">
          <img :src="icons.delete" alt="" aria-hidden="true"><span>Delete</span>
        </button>
        <button type="button" data-tools-sound class="admin-tools__segment admin-tools__segment--close" aria-label="Close tools" @click="setToolsLevel('closed')">
          <span class="admin-tools__close-icon">×</span><span>Close</span>
        </button>
      </template>
      <button
        type="button"
        class="admin-tools__trigger"
        data-tools-sound
        :aria-expanded="toolsLevel !== 'closed'"
        :aria-label="toolsLevel === 'closed' ? 'Open admin tools; drag to move' : toolsLevel === 'categories' ? 'Close admin tools' : 'Back to tool categories'"
        @pointerdown="startToolsDrag"
        @pointermove="moveToolsDrag"
        @pointerup="endToolsDrag"
        @pointercancel="endToolsDrag"
        @click="handleToolsCenter"
      >
        <span
          class="admin-tools__center-icon"
          :style="{ '--admin-tools-center-icon': `url(${toolsLevel === 'projects' || toolsLevel === 'edit' || toolsLevel === 'delete' ? icons.arrowBack : icons.tools})` }"
          aria-hidden="true"
        />
      </button>
    </div>
  </aside>
  <ConfirmModal
    v-if="deleteProjectTarget"
    variant="danger"
    title="Delete project"
    :reason="`Delete ${deleteProjectTarget.name}? This action cannot be undone.`"
    :disabled="isDeletingProject"
    @cancel="deleteProjectTarget = null"
    @confirm="confirmAdminDelete"
  />
</template>

<style scoped>
.admin-tools { position: fixed; z-index: 90; width: 56px; height: 56px; font-family: var(--font-sans); transform: translate(-50%, -50%); touch-action: none; user-select: none; }
.admin-tools--open { width: 280px; height: 280px; }
.admin-tools__radial { position: absolute; top: 50%; left: 50%; width: 56px; height: 56px; transform: translate(-50%, -50%); }
.admin-tools--open .admin-tools__radial { width: 280px; height: 280px; }
.admin-tools__ring { position: absolute; inset: 0; border: 1px solid var(--color-button-border); border-radius: 50%; background: repeating-conic-gradient(from 45deg, var(--color-main-surface) 0deg 88.5deg, var(--color-main-divider) 89deg 90deg); box-shadow: 0 18px 50px rgb(0 0 0 / 34%); opacity: 0; transform: scale(.35) rotate(-50deg); animation: tools-ring-open 280ms cubic-bezier(.2,.85,.25,1.2) forwards; }
.admin-tools__radial--projects .admin-tools__ring, .admin-tools__radial--edit .admin-tools__ring, .admin-tools__radial--delete .admin-tools__ring { background: repeating-conic-gradient(from 30deg, var(--color-main-surface) 0deg 58.5deg, var(--color-main-divider) 59deg 60deg); }
.admin-tools__ring::after { position: absolute; inset: 86px; border: 1px solid var(--color-main-divider); border-radius: 50%; background: color-mix(in srgb, var(--color-main-background) 28%, transparent); backdrop-filter: blur(8px); content: ""; }
.admin-tools__trigger { position: absolute; top: 50%; left: 50%; z-index: 5; display: grid; place-items: center; width: 56px; height: 56px; padding: 0; border: 1px solid var(--color-button-border); border-radius: 50%; background: var(--color-button-secondary-btn-bg); color: var(--color-button-secondary-btn-text); box-shadow: 0 8px 24px rgb(0 0 0 / 24%); cursor: grab; transform: translate(-50%, -50%); transition: transform 180ms ease, box-shadow 180ms ease; touch-action: none; }
.admin-tools__trigger:hover { box-shadow: 0 10px 30px rgb(0 0 0 / 34%); transform: translate(-50%, -50%) scale(1.06); }
.admin-tools--open .admin-tools__trigger { background: color-mix(in srgb, var(--color-main-background) 55%, transparent); backdrop-filter: blur(8px); cursor: pointer; }
.admin-tools__radial--categories .admin-tools__center-icon { transform: rotate(135deg); }
.admin-tools--dragging .admin-tools__trigger { cursor: grabbing; transform: translate(-50%, -50%) scale(.94); }
.admin-tools__center-icon { display: block; width: 24px; height: 24px; background-color: var(--color-text-primary); mask: var(--admin-tools-center-icon) center / contain no-repeat; -webkit-mask: var(--admin-tools-center-icon) center / contain no-repeat; pointer-events: none; transition: background-color 160ms ease, transform 280ms ease; }
.admin-tools__segment { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--color-text-secondary); cursor: pointer; opacity: 0; transform: scale(.4); animation: tools-item-open 260ms cubic-bezier(.2,.85,.25,1.2) forwards; transition: color 160ms ease; }
.admin-tools__segment::before { position: absolute; inset: 0; z-index: 1; border-radius: 50%; background: transparent; content: ""; mask: radial-gradient(circle, transparent 0 53px, var(--color-main-primary) 54px); -webkit-mask: radial-gradient(circle, transparent 0 53px, var(--color-main-primary) 54px); transition: background-color 160ms ease; }
.admin-tools__segment img, .admin-tools__segment > span { position: absolute; z-index: 2; left: 50%; transform: translateX(-50%); pointer-events: none; }
.admin-tools__segment img { width: 30px; height: 30px; filter: invert(1); }
.admin-tools__segment > span { font-size: var(--type-size-support); font-weight: 600; }
.admin-tools__segment:hover, .admin-tools__segment:focus-visible { color: var(--color-button-primary); outline: none; }
.admin-tools__segment:hover::before, .admin-tools__segment:focus-visible::before { background: color-mix(in srgb, var(--color-button-primary) 18%, transparent); }
.admin-tools__segment:disabled { opacity: .32 !important; cursor: not-allowed; pointer-events: none; }
.admin-tools__radial--categories .admin-tools__segment--one { clip-path: polygon(50% 50%, 0 0, 100% 0); animation-delay: 30ms; }
.admin-tools__radial--categories .admin-tools__segment--two { clip-path: polygon(50% 50%, 100% 0, 100% 100%); animation-delay: 60ms; }
.admin-tools__radial--categories .admin-tools__segment--close { clip-path: polygon(50% 50%, 100% 100%, 0 100%); animation-delay: 90ms; }
.admin-tools__radial--projects .admin-tools__segment--one, .admin-tools__radial--edit .admin-tools__segment--one, .admin-tools__radial--delete .admin-tools__segment--one { clip-path: polygon(50% 50%, 21% 0, 79% 0); }
.admin-tools__radial--projects .admin-tools__segment--two, .admin-tools__radial--edit .admin-tools__segment--two, .admin-tools__radial--delete .admin-tools__segment--two { clip-path: polygon(50% 50%, 79% 0, 100% 21%, 100% 50%); }
.admin-tools__radial--projects .admin-tools__segment--delete, .admin-tools__radial--edit .admin-tools__segment--delete, .admin-tools__radial--delete .admin-tools__segment--delete { clip-path: polygon(50% 50%, 100% 50%, 100% 79%, 79% 100%); }
.admin-tools__radial--projects .admin-tools__segment--close, .admin-tools__radial--edit .admin-tools__segment--close, .admin-tools__radial--delete .admin-tools__segment--close { clip-path: polygon(50% 50%, 79% 100%, 21% 100%); }
.admin-tools__segment--one img { top: 10%; }
.admin-tools__segment--one > span { top: 24%; }
.admin-tools__radial--categories .admin-tools__segment--two img { top: 40%; left: 78%; }
.admin-tools__radial--categories .admin-tools__segment--two > span { top: 55%; left: 78%; }
.admin-tools__radial--categories .admin-tools__segment--close .admin-tools__close-icon { top: 70%; }
.admin-tools__radial--categories .admin-tools__segment--close > span:last-child { top: 85%; }
.admin-tools__radial--projects .admin-tools__segment--two img, .admin-tools__radial--edit .admin-tools__segment--two img, .admin-tools__radial--delete .admin-tools__segment--two img { top: 22%; left: 78%; }
.admin-tools__radial--projects .admin-tools__segment--two > span, .admin-tools__radial--edit .admin-tools__segment--two > span, .admin-tools__radial--delete .admin-tools__segment--two > span { top: 36%; left: 78%; }
.admin-tools__segment--delete img { top: 54%; left: 78%; }
.admin-tools__segment--delete > span { top: 69%; left: 78%; }
.admin-tools__segment--close .admin-tools__close-icon { top: 71%; }
.admin-tools__segment--close > span:last-child { top: 86%; }
.admin-tools__close-icon { color: var(--color-status-error); font-size: 38px !important; font-weight: 300 !important; line-height: .7; }
.admin-tools__picker { position: absolute; top: 50%; left: calc(50% + 158px); z-index: 7; display: flex; flex-direction: column; box-sizing: border-box; width: min(300px, calc(100vw - 32px)); max-height: 340px; padding: var(--spacing-space-4); gap: var(--spacing-space-1); overflow: auto; border: 1px solid var(--color-main-border); border-radius: var(--radius-xl); background: var(--color-main-background); color: var(--color-text-primary); box-shadow: 0 16px 40px rgb(0 0 0 / 24%); font-size: var(--type-size-body-small); transform: translateY(-50%); animation: tools-picker-open 220ms ease-out both; touch-action: pan-y; }
.admin-tools--picker-left .admin-tools__picker { right: calc(50% + 158px); left: auto; }
.admin-tools__picker-head { display: flex; align-items: center; justify-content: space-between; padding: 0 var(--spacing-space-1) var(--spacing-space-3); }
.admin-tools__picker-head strong { font-size: var(--type-size-body-main); font-weight: 800; }
.admin-tools__picker-head button { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border-radius: 50%; font-size: var(--type-size-h3-card-title); }
.admin-tools__picker-head button, .admin-tools__project { border: 0; background: transparent; color: inherit; cursor: pointer; }
.admin-tools__project { min-height: 44px; padding: var(--spacing-space-2) var(--spacing-space-3); border-radius: var(--radius-lg); color: var(--color-text-primary); font: inherit; text-align: left; }
.admin-tools__project:hover, .admin-tools__project:focus-visible { background: var(--color-table-row-hover); color: var(--color-text-primary); outline: 1px solid var(--color-main-border); }
.admin-tools__project--danger:hover, .admin-tools__project--danger:focus-visible { background: color-mix(in srgb, var(--color-status-error) 18%, transparent); color: var(--color-status-error); }
@keyframes tools-ring-open { to { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes tools-item-open { to { opacity: 1; transform: scale(1); } }
@keyframes tools-picker-open { from { opacity: 0; transform: translate(18px, -50%); } to { opacity: 1; transform: translate(0, -50%); } }
@media (max-width: 767px) {
  .admin-tools--open, .admin-tools--open .admin-tools__radial { width: 232px; height: 232px; }
  .admin-tools__ring::after { inset: 70px; }
  .admin-tools__segment::before { mask: radial-gradient(circle, transparent 0 45px, var(--color-main-primary) 46px); -webkit-mask: radial-gradient(circle, transparent 0 45px, var(--color-main-primary) 46px); }
  .admin-tools__segment img { width: 24px; height: 24px; }
  .admin-tools__picker { top: calc(100% + 12px); left: 50%; max-height: 260px; transform: translateX(-50%); }
  .admin-tools--picker-left .admin-tools__picker { right: auto; left: 50%; }
  @keyframes tools-picker-open { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
}
@media (prefers-reduced-motion: reduce) { .admin-tools__ring, .admin-tools__segment, .admin-tools__picker { animation-duration: 1ms; } }
</style>
