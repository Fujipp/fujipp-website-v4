# Frontend Architecture

This document is the human-readable map of the current Vue frontend. Use it when onboarding a person or AI before changing UI, routes, stores, or feature code.

## Stack

| Concern | Current choice | Notes |
| --- | --- | --- |
| Framework | Vue 3 SFC | Components use `<script setup lang="ts">`. |
| Language | TypeScript | Props, emits, store state, config records, and API DTOs should be typed. |
| Runtime / package manager | Bun | Use Bun for local frontend scripts. Do not switch package managers without approval. |
| Bundler | Vite | Entrypoint is `src/main.ts`; Vite env is typed through `env.d.ts`. |
| Styling | Tailwind CSS v4 through CSS `@theme` | Tailwind is active even though styling is token-led, not utility-free. Prefer project tokens over arbitrary values. |
| Routing | Vue Router | Routes live in `src/router/index.ts` and lazy-load views. |
| Stores | Pinia | Cross-cutting stores live in `src/stores/`; feature stores live in `src/features/<feature>/stores/`. |
| Auth/data client | Supabase client + backend API | Supabase client is in `src/shared/lib/supabase.ts`; backend base URL comes from `@/config`. |
| Locales | vue-i18n | Locale files live in `src/locales/en/` and `src/locales/th/`. |

Verification commands such as build, type-check, tests, or browser checks are run only when the task explicitly asks for verification.

## Naming Rules

| Item | Pattern | Example |
| --- | --- | --- |
| Vue component file | PascalCase and matches component name | `PrimaryButton.vue`, `ShopDashboardView.vue` |
| View file | PascalCase ending in `View` | `ProjectsView.vue` |
| Shared UI category folder | plural lowercase | `buttons/`, `fields/`, `modals/` |
| Feature folder | lowercase domain name | `shop/`, `projects/`, `admin/` |
| Store file | camelCase ending in `Store.ts` | `userStore.ts`, `projectStore.ts` |
| Config file | lowercase domain noun | `api.ts`, `navigation.ts`, `catalog.ts` |
| Barrel export | `index.ts` inside the category or feature subfolder | `shared/ui/buttons/index.ts` |
| Import from `src` | `@/` alias | `@/shared/ui/buttons` |

Use `shared/` only for generic UI or layout that multiple features can reuse. Keep feature-owned copy, data shape, and behavior inside `features/<feature>/`.

## Top-Level Source Map

| Path | Purpose |
| --- | --- |
| `src/main.ts` | Creates Vue app, installs Pinia, router, i18n, model-viewer, and global CSS. |
| `src/App.vue` | Global shell: route view, toast host, home background, app navbar, floating user control, click sound. |
| `src/router/index.ts` | Lazy route registry plus auth/admin/guest route guards. |
| `src/config/` | Cross-cutting config such as API base URL, icons, navigation, theme, project data, and skill taxonomy. |
| `src/stores/` | Cross-cutting Pinia stores: user/auth, theme, toast. |
| `src/shared/` | Reusable UI, layout, and libraries. Must not import from `features/*`. |
| `src/features/` | Product domains: views, feature components, feature config, and feature stores. |
| `src/styles/` | Global base CSS and Figma-derived design tokens. |
| `src/locales/` | Thai/English app copy for vue-i18n. |
| `public/` | Static assets: icons, brand, images, fonts, sounds. |

## Shared UI Inventory

Shared UI lives in `src/shared/ui/<category>/`. Import from the category barrel where possible.

| Category | Components | Use for |
| --- | --- | --- |
| `buttons` | `ActionButton`, `ButtonSkeleton`, `FilterButton`, `LanguageToggleButton`, `PrimaryButton`, `SecondaryButton` | General actions, icon buttons, filter triggers, language toggles, loading button placeholders. |
| `fields` | `DateField`, `SearchField`, `SelectField`, `TextField`, `TextareaField` | Form fields that appear across portfolio, projects, shop, and admin flows. |
| `inputs` | `CheckboxInput`, `RadioInput`, `StarRating` | Lower-level input controls. |
| `modals` | `BaseDialog`, `ConfirmModal`, `PaymentResultDialog`, `ReadMoreModal` | Shared accessible dialog foundation plus reusable confirmation, payment-result, and read-only dialogs. |
| `paginations` | `TablePagination` | Shared table/card pagination controls. |
| `sections` | `HeaderSection` | Shared section heading treatment. |
| `tags` | `CategoryTag`, `StackTag`, `StatusTag` | Project/category/stack/status labels. |
| `toasts` | `StatusToast`, `ToastHost` | Global toast rendering. Toast state is in `src/stores/toastStore.ts`. |
| `toggles` | `ToggleSwitch` | Reusable binary switch. |
| `embeds` | `DiscordEmbedPreview`, `EmbedEditor` | Discord embed preview/editor pieces, shared because shop and bot configuration can reuse them. |

Shared layout lives in `src/shared/layout/`.

| Component | Use for |
| --- | --- |
| `AppNavbar` | Main site/shop navigation shell. |
| `AppFooter` | Main footer for public/shop pages that use standard chrome. |
| `UserControl` | Floating auth/profile/theme control. |
| `BackgroundEffect` | Home-only visual background effect. |

## Feature Inventory

| Feature | Main views | Components / stores / config |
| --- | --- | --- |
| `portfolio` | `HomeView`, `AboutView`, `ContactView`, `ChangelogView`, `PerformanceView`, `PrivacyView`, `ComponentView`, `NotFoundView` | `Gallery`, `SkillCard`, `gallery.ts`, `monitoringStore.ts`. |
| `projects` | `ProjectsView`, `ProjectDetailView`, `NewProjectView` | Project cards, image/gallery modals, project table, editor cards, `projectStore.ts`, `ai.ts`. |
| `shop` | `ShopDashboardView`, `MyBotView`, `ShopWalletView`, `ShopPackageView`, `ShopRuntimeView`, `BotConfigView`, `EmbedDesignerView` | Bot management, purchase assignment tables, runtime cards, wallet/top-up cards, dialogs, feature config forms, catalog/config files. |
| `admin` | `AdminDashboardView`, `AdminUsersView`, `AdminUserDetailView`, `AdminPricingView`, `AdminBotsView`, `AdminBotConfigView`, `AdminVpsView` | `AdminLayout`, user wallet/subscription panels, `adminStore.ts`. |
| `auth` | `AuthView` | `AuthCard`; user session state is cross-cutting in `src/stores/userStore.ts`. |

## Design System

Design system implementation lives in `src/styles/` and is documented in `docs/design-system.md`.

| Concern | File | How to use |
| --- | --- | --- |
| Global assembly | `src/style.css` | The only global stylesheet imported by app code. |
| Base browser/app rules | `src/styles/base.css` | Global element defaults, scrollbar, theme transition, shop route class behavior. |
| Colors | `src/styles/tokens/colors.css` | Semantic `bg-*`, `text-*`, `border-*` utilities. |
| Typography | `src/styles/tokens/typography.css` | `type-*` text utilities and local font faces. |
| Spacing | `src/styles/tokens/spacing.css` | `p-space-*`, `gap-space-*`, `max-w-*` utilities. |
| Radius | `src/styles/tokens/radius.css` | `rounded-*` values mapped to Figma tokens. |
| Icons | `src/styles/tokens/icons.css` | `size-icon-*` utilities. |

Rules of thumb:

- Use tokens first. Do not hardcode hex colors, one-off font sizes, or arbitrary spacing when a token exists.
- Dark/light theme should work through semantic tokens and `data-theme`, not duplicated color branches in each component.
- Icon paths should come from `src/config/icons.ts` instead of hardcoded `/icons/...` strings.

## Router

Routes live in `src/router/index.ts`.

- Views are lazy-loaded with `() => import('@/features/<feature>/views/<View>.vue')`.
- Route meta supports `requiresAuth`, `requiresAdmin`, and `guestOnly`.
- The global guard initializes the user store, cleans OAuth callback query/hash data, redirects unauthenticated users to `login`, blocks non-admins from admin pages, and sends signed-in users away from guest-only pages.
- `/shop/admin/*` is the current admin namespace. Legacy `/admin/*` paths redirect into `/shop/admin/*`.
- 404 fallback stays last.

When adding a route:

1. Put the view in the owning feature's `views/` folder.
2. Lazy-load it in `src/router/index.ts`.
3. Add route meta deliberately.
4. Update navigation config only if it should appear in the UI.

## Stores And Data Flow

| Store | Location | Responsibility |
| --- | --- | --- |
| `useUserStore` | `src/stores/userStore.ts` | Supabase auth session, backend profile hydration, auth redirects, admin state, OAuth login. |
| `useThemeStore` | `src/stores/themeStore.ts` | Light/dark/system theme selection and `documentElement.dataset.theme`. |
| `useToastStore` | `src/stores/toastStore.ts` | Global toast queue and auto-dismiss timers. |
| `useProjectStore` | `src/features/projects/stores/projectStore.ts` | Project data/editing state. |
| `useMonitoringStore` | `src/features/portfolio/stores/monitoringStore.ts` | Public performance/server snapshot display data. |
| `useAdminStore` | `src/features/admin/stores/adminStore.ts` | Admin operational data. |

API base URL must come from `API_BASE_URL` exported by `@/config`. Do not read `import.meta.env.VITE_API_*` directly inside components/views/stores, and do not hardcode backend URLs.

## Config Modules

| File | Purpose |
| --- | --- |
| `src/config/api.ts` | Resolves backend target: local, host, dev host proxy, or hard override. |
| `src/config/icons.ts` | Central icon path and color-mode registry. |
| `src/config/navigation.ts` | Navbar/mobile navigation items. |
| `src/config/projects.ts` | Portfolio project data and types. |
| `src/config/skills.ts` | Skill/tech taxonomy used by portfolio/project UI. |
| `src/config/theme.ts` | Theme choices and labels/icons. |
| `src/features/shop/config/catalog.ts` | Shop package/catalog definitions. |
| `src/features/shop/config/featureConfig.ts` | Bot feature configuration field metadata. |

## When Adding Or Moving Code

- Shared primitives: `src/shared/ui/<category>/<ComponentName>.vue`.
- Shared layout: `src/shared/layout/<ComponentName>.vue` or a component folder when it has subparts.
- Feature views: `src/features/<feature>/views/<Name>View.vue`.
- Feature components: `src/features/<feature>/components/<Name>.vue`.
- Feature stores/config: `src/features/<feature>/stores/` or `src/features/<feature>/config/`.
- Cross-cutting config/store: `src/config/` or `src/stores/`.

Always update the local `index.ts` barrel when a component should be imported by other files. Avoid a root mega-barrel for everything; import from the nearest category or feature barrel.

## Documentation Map

| Need | Read |
| --- | --- |
| Repo-wide rules | `../.agents/README.md` |
| Frontend-specific AI rules | `AGENTS.md` |
| Architecture and inventory | `docs/architecture.md` |
| Tokens and design foundations | `docs/design-system.md` |
| Component implementation workflow | `docs/component-guidelines.md` |
