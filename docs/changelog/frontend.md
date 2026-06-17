# Changelog — Frontend

**Current version: `0.5.3.5`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.5.3.5` | 2026-06-18 | shop UI revise: move the service flow into a dedicated `/shop/guide` page, convert Dashboard into an operator snapshot with next actions, add buying/payment summaries to Package and Wallet, and keep the collapsed Shop sidebar usable with icon navigation |
| `0.5.3.4` | 2026-06-18 | shop UI revise: add dashboard next-action cards based on current bot/runtime/feature state, clarify feature/runtime package cards, and improve purchase confirmation copy for per-bot purchases and no-bot cases |
| `0.5.3.3` | 2026-06-18 | shop/admin UX: move admin routes under `/shop/admin`, keep legacy `/admin` redirects, and reuse the Shop sidebar with an in-page admin tab bar so admin feels like part of the shop operator flow |
| `0.5.3.2` | 2026-06-18 | shop UX: add lifecycle guidance across dashboard/package/wallet/bot config so customers see create → buy → configure → start, and add dark-mode input text/background/border token overrides for readable form fields |
| `0.5.3.1` | 2026-06-15 | STRING_LIST config fields now render as separate input boxes with add/remove per item (was a one-per-line textarea) — clearer for editing reply messages / reactions individually |
| `0.5.3` | 2026-06-15 | bot config: new "Review Credit — ตัวนับรีวิว" panel (shown when the bot has review-credit) — see the current count, set it to any number, or "นับทั้งห้องใหม่" to recount the whole channel |
| `0.5.2.4` | 2026-06-15 | bot config form: new `STRING_LIST` field type renders as a one-item-per-line textarea (converts ↔ JSON array under the hood), so list config like review-credit's reply messages / reactions no longer needs hand-written `["...","..."]` JSON |
| `0.5.2.3` | 2026-06-15 | admin Runtime: the "Plan (เดือน)" selector now sets the subscription's current plan (`runtimePlanId`) — the field the customer's "X Month" card reads — as well as the renewal plan (`renewPlanId`), so changing it to 1 เดือน actually shows "1 Month" on the user side. (Previously only the renewal term changed) |
| `0.5.2.2` | 2026-06-15 | admin Runtime subscription: replace the manual "Extend" control with a **Renew plan** selector — sets the renewal term (the runtime plan whose duration = months added each renewal), paired with the existing Renew ฿ price. This is what controls how much / how many months a user's runtime renews for |
| `0.5.2.1` | 2026-06-15 | admin user detail: permanent feature subscriptions (`RENT_PERMANENT` / non-`RENT_MONTHLY`) no longer show editable Period end / Renew ฿ / Auto — they show ถาวร / — since they never lapse or renew. Recurring (`RENT_MONTHLY`) rows keep the inputs |
| `0.5.2` | 2026-06-15 | admin user detail: (1) Runtime row gets a quick "Extend" control — +1..5 เดือน (extends from the later of current period end / today) or ถาวร (far-future period end, since runtime period end is NOT NULL), fills the date then Save persists it; (2) paginate the wallet transactions table (10/page, First/Prev/1·2·3/Next/Last) following the shop FeatureTable pager |
| `0.5.1` | 2026-06-15 | admin Pricing: new "Add feature price" form — pick any catalog feature (incl. unpriced like review-credit), choose kind/price/months/active, and create the SKU; it then appears in the editable Feature prices table |
| `0.5.0.3` | 2026-06-14 | restore the deleted legacy Vite JS chunks from the previous deploy under `public/assets/` so browsers with cached old HTML/entry chunks stop receiving `index.html` as `text/html` for module scripts |
| `0.5.0.2` | 2026-06-14 | deploy asset guard: `.htaccess` no longer rewrites missing static assets to `index.html`, so stale/missing JS chunks fail as 404 instead of browser-blocking `text/html` module MIME errors |
| `0.5.0.1` | 2026-06-13 | admin: transfer-bot owner picker is now a `SearchField` + filtered results list (search by name/email/id) instead of a native `<select>` — matches the app's UI and scales past a few users |
| `0.5.0` | 2026-06-13 | admin: transfer a bot to another user from `AdminBotsView` — a dialog to pick the new owner; moves the bot + its subscriptions & config |
| `0.4.9` | 2026-06-13 | admin: rebuild bot config page with a **feature selector** (pick a feature → edit only its fields; no more one long page) and a full **embed editor**; extracted the Embed Designer into a shared `EmbedEditor`/`DiscordEmbedPreview` (`shared/ui/embeds`, base-path prop) reused by both shop and admin |
| `0.4.8` | 2026-06-13 | admin: editable **Period end** (date) on runtime + feature subscriptions in `UserSubscriptionsPanel` (backend already accepted `currentPeriodEnd`) |
| `0.4.7.5` | 2026-06-13 | fix(admin): hide the main-site navbar + UserControl on `/admin` routes (admin has its own layout) — extend `shouldShowAppChrome` to exclude `/admin` |
| `0.4.7.4` | 2026-06-13 | admin: keep the Admin entry **only in the Shop sidebar** (shop is a separate section from the main site) — revert the main-navbar ADMIN link (#61) and restore the avatar menu's "Setting" button |
| `0.4.7.3` | 2026-06-13 | admin: add an "Admin" entry to the **Shop sidebar** (`ShopSidebar`, admins only) → `/admin`, so it's reachable from the shop where the user actually navigates |
| `0.4.7.2` | 2026-06-13 | fix(admin): resolve `vue-tsc` failures that blocked the frontend deploy — `AdminPricingView` & `UserSubscriptionsPanel` now iterate `{item, draft}` row objects instead of indexing a `Record` (which is `T \| undefined` under `noUncheckedIndexedAccess`) |
| `0.4.7.1` | 2026-06-13 | admin: surface an "ADMIN" entry in the main navbar (desktop centre nav + mobile menu), shown only to admins → goes to `/admin` |
| `0.4.7` | 2026-06-13 | admin: real `AdminDashboardView` — metric cards (users/admins, bots/running, VPS slots, 30-day top-up revenue, total wallet credit) and a recent admin-activity feed |
| `0.4.6` | 2026-06-13 | admin: `AdminBotsView` (all bots across users + owner) and `AdminBotConfigView` (generic per-feature config editor, sensitive fields kept blank to preserve secrets); new "Bots" sidebar item + `/admin/bots` routes |
| `0.4.5` | 2026-06-13 | admin: user detail page is now an editable form — username, display name, bio, website, GitHub, and USER↔ADMIN role, saved via `PATCH /api/admin/users/{id}` |
| `0.4.4` | 2026-06-13 | admin: `UserWalletPanel` on the user detail page — balance, add/subtract adjustment form (baht↔satang) with a note, and the wallet ledger |
| `0.4.3` | 2026-06-13 | admin: `UserSubscriptionsPanel` on the user detail page — view a user's runtime + feature subscriptions and override renewal price (baht↔satang, clear), status, and auto-renew per subscription |
| `0.4.2` | 2026-06-13 | admin: `AdminPricingView` — inline-editable tables for runtime plans and feature prices (baht↔satang, promo price/label with clear, featured/active/sort toggles); new "Pricing" sidebar item + `/admin/pricing` route |
| `0.4.1` | 2026-06-13 | admin: new `features/admin/` shell — collapsible `AdminLayout` sidebar, role-gated `/admin` routes (Dashboard stub + Users list/search + read-only user detail), `adminStore` API client, and an "Admin" entry in the admin `UserControl` menu |
| `0.4.0.7` | 2026-06-13 | fix more dark-on-surface contrast: dashboard metric numbers (`metricValue`) and the `TextareaField`/`SelectField` labels now use `text-secondary` instead of `text-primary` (invisible on `main-surface` in light mode) |
| `0.4.0.6` | 2026-06-13 | refresh the Wallet top-up view: balance card with a tinted balance panel (muted label + large accent value + unit), full-width amount buttons, taller 46px primary buttons, standard readable amount input, roomier spacing |
| `0.4.0.5` | 2026-06-13 | fix `TextField` label color — use `text-secondary` (was `text-primary`, invisible on the dark `main-surface` when the field is teleported outside the theme wrapper, e.g. the edit-bot modal) |
| `0.4.0.4` | 2026-06-13 | refresh Shop package cards (feature + runtime): full-width primary buy button, accent-colored price, lighter 1px border + 2xl radius, hover lift/shadow, roomier padding and consistent left alignment — all via existing tokens |
| `0.4.0.3` | 2026-06-13 | Shop dashboard feature table: rename the "Expire" column to "Usage", showing which bot uses each feature subscription (maps `externalSubjectId` → bot name) |
| `0.4.0.2` | 2026-06-10 | align Shop main-surface components with text-secondary foregrounds |
| `0.4.0.1` | 2026-06-10 | refine Shop bot-config light theme surfaces, spacing, tabs, and action copy |
| `0.4.0` | 2026-06-10 | Bot Config redesign: Bot/Feature/Embed sections + feature tabs; custom RobloxRobuxConfigForm (1–3 groups, rate select, cooldown, notify channel, countdown) |
| `0.3.9.1` | 2026-06-10 | fix Embed Designer component role bindings so vue-tsc accepts optional component configs |
| `0.3.9` | 2026-06-10 | Embed Designer: component appearance editor for fixed button/dropdown roles + live component preview |
| `0.3.8` | 2026-06-10 | Embed Designer: fields[] editor (add/remove name·value·inline) + preview |
| `0.3.7.4` | 2026-06-10 | Embed Designer: clone embeds via JSON (structuredClone failed on Vue reactive proxy → load error) |
| `0.3.7.3` | 2026-06-10 | Embed Designer: surface the HTTP status + body in the load error (diagnostics) |
| `0.3.7.2` | 2026-06-10 | Embed Designer: redirect to login when a 401 can't be recovered by refresh (expired session) |
| `0.3.7.1` | 2026-06-09 | Embed Designer: refresh the session + retry once on 401 (fixes stale-token load failure) |
| `0.3.7` | 2026-06-09 | Embed Designer page: per-slot editor (color/title/desc/image/footer/author) + live Discord-style preview with custom-emoji + markdown render |
| `0.3.6` | 2026-06-09 | Runtime cards: real-time countdown timer + auto-renew toggle + renew-now button |
| `0.3.5` | 2026-06-09 | Create Bot dialog: pick a Runtime plan + show free VPS slots, charge on add, surface real errors |
| `0.3.4.1` | 2026-06-09 | fix Shop dashboard feature table category typing for CI builds |
| `0.3.4` | 2026-06-08 | refine Projects cards, detail layouts, and editor panels |
| `0.3.3` | 2026-06-08 | refine Portfolio section layouts, gallery framing, and contact page presentation |
| `0.3.2` | 2026-06-08 | stabilize Supabase PKCE auth callbacks and shared app chrome |
| `0.3.1` | 2026-06-08 | adopt local Inter/Sora typography assets and token docs |
| `0.3.0` | 2026-06-08 | connect Shop views to live backend data and remove sample fallbacks |
| `0.2.9.5` | 2026-06-08 | reuse the default Shop sidebar on the Wallet page |
| `0.2.9.4` | 2026-06-08 | fix Wallet sidebar Package link and title-case Wallet label |
| `0.2.9.3` | 2026-06-08 | standardize toast placement to the bottom-right corner |
| `0.2.9.2` | 2026-06-08 | align Shop Package layout and toast placement with shop pages |
| `0.2.9.1` | 2026-06-08 | catalog: features are permanent per-bot (drop monthly, reprice sample, purchase needs a bot) |
| `0.2.9` | 2026-06-08 | add Shop Package feature/runtime purchase cards with loading skeletons |
| `0.2.8` | 2026-06-08 | add Shop Package view: catalog cards + purchase dialog (buy features/runtime) |
| `0.2.7` | 2026-06-08 | add dynamic bot-config form (template-driven) + Bot Config view |
| `0.2.6.1` | 2026-06-08 | align Shop wallet cards with provided Figma component exports |
| `0.2.6` | 2026-06-08 | redesign Shop wallet balance, top-up, and slip verification cards from Figma |
| `0.2.5.4` | 2026-06-08 | persist Shop sidebar open state across shop pages |
| `0.2.5.3` | 2026-06-08 | match Shop sidebar logo mark height to previous wordmark text |
| `0.2.5.2` | 2026-06-08 | reduce Shop sidebar wordmark icon size |
| `0.2.5.1` | 2026-06-08 | refine Shop sidebar theme buttons, guest state, and wordmark |
| `0.2.5` | 2026-06-08 | redesign Shop dashboard cards, sidebar, feature table, and runtime panels from Figma |
| `0.2.4.10` | 2026-06-08 | strip Supabase PKCE callback code after router navigation |
| `0.2.4.9` | 2026-06-08 | clean Supabase OAuth callback tokens from URL |
| `0.2.4.8` | 2026-06-08 | hide app chrome on auth routes |
| `0.2.4.7` | 2026-06-08 | restore Projects store caching and stabilize featured thumbnail loading |
| `0.2.4.6` | 2026-06-08 | replace navbar FUJIPP wordmark with SVG icon |
| `0.2.4.5` | 2026-06-08 | reload Projects page data fresh on every route entry |
| `0.2.4.4` | 2026-06-08 | align Project form category and status dropdowns with dark controls |
| `0.2.4.3` | 2026-06-08 | set Project form certificate field text to secondary color |
| `0.2.4.2` | 2026-06-08 | match project timeline calendar icon color to input text |
| `0.2.4.1` | 2026-06-08 | refine Project timeline editor dropdown width and month calendar icons |
| `0.2.4` | 2026-06-07 | redesign Project Add and Edit form layout from Figma |
| `0.2.3.9` | 2026-06-07 | title-case Project Detail link labels and strengthen secondary icon tint |
| `0.2.3.8` | 2026-06-07 | limit Project Detail secondary link icon tint to certificate, live demo, and website |
| `0.2.3.7` | 2026-06-07 | tint Project Detail link button icons to text secondary |
| `0.2.3.6` | 2026-06-07 | make Project Detail desktop split panels equal width |
| `0.2.3.5` | 2026-06-07 | split Project Detail challenges and learnings into equal desktop columns |
| `0.2.3.4` | 2026-06-07 | render Project Detail challenges as bullet title-content items |
| `0.2.3.3` | 2026-06-07 | align Project Detail challenge and learning text sizing |
| `0.2.3.2` | 2026-06-07 | refine Project Detail panel headings, dividers, and text hierarchy |
| `0.2.3.1` | 2026-06-07 | round shared language switch button |
| `0.2.3` | 2026-06-07 | redesign Project Detail gallery, header controls, content panels, and detail editor cards from Figma |
| `0.2.2.2` | 2026-06-07 | slow Projects AI card marquee speed |
| `0.2.2.1` | 2026-06-07 | smooth Projects AI card marquee and tighten featured card descriptions |
| `0.2.2` | 2026-06-07 | redesign Projects featured cards, table, tags, and AI cards from Figma |
| `0.2.1.3` | 2026-06-07 | set Home hero title to ExtraBold |
| `0.2.1.2` | 2026-06-07 | make About gallery featured image cover its frame |
| `0.2.1.1` | 2026-06-07 | fix About mobile education card clipping |
| `0.2.1` | 2026-06-07 | redesign About hero, education, and gallery sections from Figma |
| `0.2.0.8` | 2026-06-07 | increase Contact action button icon size |
| `0.2.0.7` | 2026-06-07 | restore live Discord presence on Contact cards |
| `0.2.0.6` | 2026-06-07 | restore Contact card open and closed states |
| `0.2.0.5` | 2026-06-07 | redesign Contact view cards for desktop, iPad, and mobile |
| `0.2.0.4` | 2026-06-07 | remove Home hero title glow |
| `0.2.0.3` | 2026-06-07 | lower Home mobile project button |
| `0.2.0.2` | 2026-06-07 | increase Home mobile intro label size |
| `0.2.0.1` | 2026-06-07 | adjust Home mobile mascot and experience card placement |
| `0.2.0` | 2026-06-07 | refine Home mobile layout from Figma |
| `0.1.9` | 2026-06-07 | update typography tokens to Inter with Sora assets and Extrabold styles |
| `0.1.8` | 2026-06-05 | add Live Demo & Website project links (form + detail view) |
| `0.1.7` | 2026-06-05 | select backend via VITE_API_TARGET (local / host) in .env |
| `0.1.6` | 2026-06-05 | reorganize src into shared/ + features (portfolio, projects, shop, auth) |
| `0.1.5` | 2026-06-05 | rename public icons & folders to kebab-case, strip library prefixes |
| `0.1.4.2` | 2026-06-04 | add dev:host script to switch between local and hosted backend |
| `0.1.4.1` | 2026-06-04 | add Apache .htaccess for SPA routing and HTTPS |
| `0.1.4` | 2026-06-04 | add shop dashboard, wallet, and sidebar |
| `0.1.3.2` | 2026-06-04 | reorganize views into auth, fujipp, and shop folders |
| `0.1.3.1` | 2026-06-03 | add Chat2Date draft recovery helper |
| `0.1.3` | 2026-06-03 | add certificate and Google assets |
| `0.1.2.1` | 2026-06-03 | remove stack config whitespace |
| `0.1.2` | 2026-06-03 | add project portfolio management UI |
| `0.1.1` | 2026-06-02 | update components, views, and configs |
| `0.1.0.1` | 2026-06-01 | save progress |
| `0.1.0` | 2026-05-27 | update AppFooter and ContactView |
| `0.0.9` | 2026-05-26 | update gallery, language button, and about view |
| `0.0.8.1` | 2026-05-26 | populate gallery image source |
| `0.0.8` | 2026-05-26 | add about gallery carousel |
| `0.0.7` | 2026-05-26 | update About view and locales |
| `0.0.6` | 2026-05-25 | refine navbar and home view |
| `0.0.5.1` | 2026-05-24 | sync work and push |
| `0.0.5` | 2026-05-24 | add navbar and background effect; refine styles |
| `0.0.4` | 2026-05-24 | add app navigation and views |
| `0.0.3` | 2026-05-24 | update App and add components/docs |
| `0.0.2.1` | 2026-05-24 | move 3D models to public/models |
| `0.0.2` | 2026-05-24 | add frontend views and assets |
| `0.0.1` | 2026-05-23 | add vue app scaffold |
