# Changelog — Frontend

**Current version: `0.5.9.19`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.5.9.19` | 2026-06-21 | make shared Project category tags theme-aware in light mode and restyle shared status tags to match the Project Detail pill treatment with compact spacing, pulsing dots, and Detail-aligned status colors |
| `0.5.9.18` | 2026-06-21 | add a cursor-follow glass highlight to shared Secondary, Filter, table next/back, and Projects pagination buttons so hover light tracks the mouse while keyboard focus keeps a centered glow |
| `0.5.9.17` | 2026-06-21 | fix light-mode glass button legibility by giving shared Secondary, Filter, table next/back, and Projects pagination buttons theme-aware foreground, icon, border, and shadow colors instead of always-white glass styling |
| `0.5.9.16` | 2026-06-21 | make the Projects index page respond visibly to Light/Dark mode by using page-scoped theme variables for section bands, cards, the table, and AI cards, with smooth color transitions while keeping Project Detail's fixed dark section token untouched |
| `0.5.9.15` | 2026-06-21 | add a `--color-main-section-background` token (the dark-mode background tone, same in both themes) and use it for the Project Detail page background, blending the hero scrim and band into the same tone so there is no longer a hard seam between the hero and the body sections |
| `0.5.9.14` | 2026-06-21 | restyle the project image zoom modal to match the dark detail page: dark gradient viewport instead of a white background, floating glass zoom + close controls overlaying the image, and a pop-in open animation that respects reduced-motion |
| `0.5.9.13` | 2026-06-21 | remove the Project Detail bottom "See … in action" links CTA band since the same project links already appear in the hero |
| `0.5.9.12` | 2026-06-21 | stack the Project Detail architecture image above its tech stack grid so the diagram spans full width, and switch the gallery main image to a 16:9 aspect-ratio so it matches the thumbnail column height instead of letterboxing inside a fixed-height box |
| `0.5.9.11` | 2026-06-21 | redesign the Project Detail tech stack from icon pills into a grid of labelled glass cells (icon + name) per group, with a trailing rule on each group label and hover lift/glow, replacing the tooltip-only icons |
| `0.5.9.10` | 2026-06-21 | restyle the Project Detail Dynamic Island with the shared glass treatment instead of solid black so it matches the secondary button and language switch |
| `0.5.9.9` | 2026-06-21 | move the Project Detail Dynamic Island to the right edge, vertically centered, and stack its back and EN/TH controls vertically, sliding in from the right |
| `0.5.9.8` | 2026-06-21 | fix the Projects list collapsing to a single row after viewing a project: track a `hasLoadedAll` flag in the project store and refetch the full list when only a single project was loaded by the detail page, instead of caching on array length |
| `0.5.9.7` | 2026-06-21 | keep the Project Detail back/language controls in the hero (scrolling away normally) and add a Dynamic Island pill that expands in centered near the top once those controls scroll out of view, offering back and EN/TH language toggles |
| `0.5.9.6` | 2026-06-21 | constrain the Project Detail hero content (back, language, title, links) to the shared 7xl column so the controls stop spreading to the viewport edges when zoomed out, while keeping the cover image full-bleed |
| `0.5.9.5` | 2026-06-21 | repurpose the project Roles field from app user-roles to the developer's own responsibilities: swap the editor role options to role titles (Full Stack / Frontend / Backend / UI/UX / etc.), relabel the editor field and Project Detail tile to "My Role" (free-text `project_roles` column means no DB migration) |
| `0.5.9.4` | 2026-06-21 | swap the Project Detail at-a-glance number tiles from internal overview metrics to viewer-meaningful Duration / Technologies / Features derived from existing data, and drop the duplicate duration from the status tile |
| `0.5.9.3` | 2026-06-21 | make shared section headers use primary text by default and keep secondary text only on surface-backed sections |
| `0.5.9.2` | 2026-06-21 | polish the Project Detail at-a-glance bento: add an AT A GLANCE eyebrow, accent underline on metric tiles, icon + accent headers, a roles count badge, and surface the timeline date range inside the status tile |
| `0.5.9.1` | 2026-06-21 | swap the Project Detail hero breadcrumb for a SecondaryButton Back control, and add an opt-in `icon-reveal` SecondaryButton variant so the project links render as icon-only glass buttons that expand their label on hover; keep the original brand icon colors since whitening the multi-fill YouTube logo collapsed it into a solid blob |
| `0.5.9` | 2026-06-21 | rebuild the Project Detail page as an immersive dark case study: full-bleed cinematic cover hero with gradient display title, bento at-a-glance grid, auto-numbered editorial sections with sticky index, scroll-reveal and hover micro-interactions, and a matching skeleton — all on design tokens, keeping every database field and respecting reduced-motion |
| `0.5.8.35` | 2026-06-21 | align the Project Detail top offset with the fixed navbar height so the Projects band starts flush below it |
| `0.5.8.34` | 2026-06-21 | make the Project Detail top section use a full-width Projects band and replace the project ID header label |
| `0.5.8.33` | 2026-06-20 | align the Projects page top offset with the fixed navbar height so section bands start directly below it |
| `0.5.8.32` | 2026-06-20 | lower the global button click sound volume to 20 percent |
| `0.5.8.31` | 2026-06-20 | restore the Projects AI Skills marquee to full-bleed width inside its section band |
| `0.5.8.30` | 2026-06-20 | switch shared section headers to secondary text color and remove gaps between Projects page section bands |
| `0.5.8.29` | 2026-06-20 | add a global click sound for enabled button-style controls using the bundled click audio |
| `0.5.8.28` | 2026-06-20 | widen the Projects table layout, add full-width Projects section bands, and restyle filter plus pagination controls with glass buttons |
| `0.5.8.27` | 2026-06-20 | align Projects page section widths with the About page container |
| `0.5.8.26` | 2026-06-20 | route Contact card actions through the shared glass secondary button with external link support |
| `0.5.8.25` | 2026-06-20 | restyle the shared secondary button with the same glass treatment as the language switch |
| `0.5.8.24` | 2026-06-20 | remove the About page bottom container padding so the Gallery section sits flush against the footer |
| `0.5.8.23` | 2026-06-20 | scope the About Gallery header title color to text-secondary without affecting shared HeaderSection usage elsewhere |
| `0.5.8.22` | 2026-06-20 | give the About Gallery section the same full-width surface band treatment as the About hero section |
| `0.5.8.21` | 2026-06-20 | restyle shared image next/back controls with the same glass treatment as the language switch |
| `0.5.8.20` | 2026-06-20 | reorganize About skill categories for runtime, build tools, and external services with matching public icon paths |
| `0.5.8.19` | 2026-06-20 | apply the About skill rack text-secondary icon filter across all row layouts instead of only the mobile icon strip |
| `0.5.8.18` | 2026-06-20 | map additional About skill rack icons to the mobile text-secondary icon treatment |
| `0.5.8.17` | 2026-06-20 | constrain mobile About skill rack cards so their horizontal icon tracks scroll inside the card instead of protruding past the viewport |
| `0.5.8.16` | 2026-06-20 | hide the About hero 3D model until its animation starts so the rest pose does not flash on load |
| `0.5.8.15` | 2026-06-20 | preload critical About assets and prioritize the hero model plus first education image while keeping gallery images lazy |
| `0.5.8.14` | 2026-06-20 | align the About Education and Gallery sections to the same full-width container as Hero and Skills |
| `0.5.8.13` | 2026-06-20 | redesign the About Skills section as full-width server rack cards and include the existing external service category |
| `0.5.8.12` | 2026-06-20 | reduce the About hero music playback volume by half |
| `0.5.8.11` | 2026-06-20 | format the About hero lived-time counter as hours:minutes:seconds:centiseconds |
| `0.5.8.10` | 2026-06-20 | change the About hero lived-time counter from hours-based to minutes:seconds:centiseconds |
| `0.5.8.9` | 2026-06-20 | add a configurable About hero mascot animation loop flag and stop the current mascot animation after one playthrough |
| `0.5.8.8` | 2026-06-20 | restore About hero music playback using the shall-we sped-up instrumental track with visibility fade handling |
| `0.5.8.7` | 2026-06-20 | format the About hero lived-time counter as a compact hours:seconds:centiseconds clock |
| `0.5.8.6` | 2026-06-20 | make the About hero birthday static and add a live lived-time counter in hours, seconds, and milliseconds |
| `0.5.8.5` | 2026-06-20 | update the About hero side copy with internship context and replace the right paragraph with localized personal facts plus animated birthday digits |
| `0.5.8.4` | 2026-06-20 | remove the frame from the About hero role label while keeping the System Architecture interest line |
| `0.5.8.3` | 2026-06-20 | switch the About hero role badge from error coloring to the primary brand color |
| `0.5.8.2` | 2026-06-20 | refine the About hero role line into a Junior Full Stack Developer badge with a separate System Architecture interest line |
| `0.5.8.1` | 2026-06-20 | refine the About hero intro copy to emphasize maintainable code in English and Thai |
| `0.5.8` | 2026-06-20 | clarify the About hero Fujipp/Fuji status copy in English and Thai |
| `0.5.7.9` | 2026-06-20 | remove clipping from the About hero 3D mascot area so animated hands and edges are not cut off |
| `0.5.7.8` | 2026-06-20 | simplify the About hero eyebrow label to "ABOUT ME" without showing the active locale |
| `0.5.7.7` | 2026-06-20 | add the Figma glass effect to the shared language switch while preserving the compact EN/TH variant layout |
| `0.5.7.6` | 2026-06-20 | implement the shared language switch EN/TH variants from the Figma component specs |
| `0.5.7.5` | 2026-06-20 | cap the desktop About hero height so the full-screen composition stays fixed when browser zoom is below 100% |
| `0.5.7.4` | 2026-06-20 | simplify the About hero status line so it focuses on the Fujipp/Fuji name without repeating role metadata |
| `0.5.7.3` | 2026-06-20 | update the About hero status line to include the Fujipp/Fuji personal brand |
| `0.5.7.2` | 2026-06-20 | refine About language switching with a 12px language button radius and smoother fade-slide transitions for hero copy |
| `0.5.7.1` | 2026-06-20 | refine the About hero into a full-screen section with a centered animated mascot, language toggle, animated profile copy, and responsive text placement |
| `0.5.7` | 2026-06-20 | redesign the About hero with the 3D mascot centered between English and Thai profile copy, and remove the hero music playback |
| `0.5.6` | 2026-06-19 | add a public `/changelog` page that imports the repository changelog markdown, summarizes area counts/latest date, and lets visitors filter release history by frontend, backend, database, or other work |
| `0.5.5.1` | 2026-06-19 | frontend dev host API: route `VITE_API_TARGET=host` through a Vite `/host-api` proxy so local development can call the hosted backend without browser CORS failures |
| `0.5.5` | 2026-06-19 | navigation guard: centralize route meta checks for authenticated shop pages, admin/project edit pages, guest-only auth pages, and add a routed 404 fallback page |
| `0.5.4` | 2026-06-18 | admin bot control: Start/Stop/Restart buttons per row in Bots list, and a new "Runtime & Features" section in Bot config — live runtime status + lifecycle buttons, grant/extend the bot's runtime plan, and grant features (RENT_MONTHLY/PERMANENT) + adjust existing runtime/feature subscriptions (status, period end) |
| `0.5.3.7` | 2026-06-18 | frontend dev config: add `bun run dev:local` alongside `dev:host` so local UI can explicitly choose local backend or VPS backend without editing `.env` |
| `0.5.3.6` | 2026-06-18 | shop UI polish: remove floating summary action cards from Package/Wallet headers, hide Dashboard next-actions when there is no real action, and make feature package cards equal-height within the grid |
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
