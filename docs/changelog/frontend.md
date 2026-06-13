# Changelog — Frontend

**Current version: `0.4.0.3`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
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
