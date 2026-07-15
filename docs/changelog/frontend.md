# Changelog — Frontend

**Current version: `0.7.6.2`**  ·  see [versioning scheme](./README.md)

| Version | Date | Change |
| --- | --- | --- |
| `0.7.6.2` | 2026-07-16 | Fixed production type-check failures by making Bot configuration’s nullable Runtime and Feature state explicit and guarding empty dialog focus traps. |
| `0.7.6.1` | 2026-07-16 | Admin Package settings now describe entitlement duration as Access type and display readable Permanent or Monthly labels instead of billing enums. |
| `0.7.6` | 2026-07-16 | Admin Package settings now separate unused and bot-assigned Features, support Detach and Remove confirmations, and only offer free slots from active VPS nodes. |
| `0.7.5` | 2026-07-16 | Admin user Runtime and Package workspaces can now grant Runtime or monthly/permanent Features, assign them to an owned bot or unused stack, and confirm the action with Toast feedback. |
| `0.7.4.48` | 2026-07-15 | Clickable Admin user rows now expose button semantics so the platform-wide click sound and accessibility behavior trigger correctly. |
| `0.7.4.47` | 2026-07-15 | Fixed the cross-route Admin user transition by waiting for the selected-row snapshot and rendering the destination menu before user data finishes loading. |
| `0.7.4.46` | 2026-07-15 | Opening an Admin user now morphs the selected table row into the user menu and reveals the user breadcrumb trail from left to right. |
| `0.7.4.45` | 2026-07-15 | The Users config Back button now follows browser history through each user workspace level, with a safe fallback to the users list. |
| `0.7.4.44` | 2026-07-15 | Admin user workspaces now use nested browser-history routes, clickable breadcrumbs, fixed-height breadcrumb rows, and Bot-config-style shared-card transitions. |
| `0.7.4.43` | 2026-07-15 | Users config now aligns Search with the Main breadcrumb above the table while keeping Back in the page header. |
| `0.7.4.42` | 2026-07-15 | Admin Dashboard metrics now use a full-viewport Home-style Main Surface band with centered cards, secondary text, and matching icons. |
| `0.7.4.41` | 2026-07-15 | Simplified the Admin workspace header to a single page title and removed the redundant Shop Admin tabs and Platform overview hero. |
| `0.7.4.40` | 2026-07-15 | Admin Dashboard now provides four configuration menus, seven live platform and commerce metrics, recent activity, a searchable Users config table, and per-user User, Wallet, Runtime, and Package workspaces. |
| `0.7.4.39` | 2026-07-15 | Core features now keeps its own shared-frame transition identity instead of inheriting the Package setting animation. |
| `0.7.4.38` | 2026-07-15 | Add Credit navigation now uses the concise Back and Next labels instead of Next step. |
| `0.7.4.37` | 2026-07-15 | Shared inputs now use the dark Main Surface palette in dark mode, including teleported Select menus, selected options, disabled states, text, borders, and native picker color schemes. |
| `0.7.4.36` | 2026-07-15 | Bot Setting now separates the always-included Bot Presence and Runtime Expiry Alert from purchased Packages under a dedicated Core features flow with nested browser history. |
| `0.7.4.35` | 2026-07-15 | Admin Pricing now opens a reusable Feature Settings editor for customer-facing field labels, descriptions, defaults, enum options, flags, and ordering, starting with Shop Status. |
| `0.7.4.34` | 2026-07-15 | Bot, Feature, Package, Runtime, and Embed Save/Remove actions now require the shared ConfirmModal and report outcomes through existing Toast notifications. |
| `0.7.4.33` | 2026-07-15 | Bot config Cancel and all Runtime setting actions now use PrimaryButton consistently with their existing icons and widths. |
| `0.7.4.32` | 2026-07-15 | Bot Setting slide states now have dedicated nested URLs for Bot config, Runtime, Package, Feature, and Embed setting, with browser Back/Forward restoring each inline state. |
| `0.7.4.31` | 2026-07-15 | Embed editor two-column field grids now use shrink-safe minmax columns and zero-width children so TextField controls no longer overflow their cards. |
| `0.7.4.30` | 2026-07-15 | Embed component editor headings, role names, visibility states, helper text, and control placeholders now use English while preserving the bot's real Thai fallback labels in Discord Preview. |
| `0.7.4.29` | 2026-07-15 | Embed Fields, Footer, and Components sections now use shared Primary/Secondary/Action buttons, CheckboxInput, DateField, TextField, and SelectField controls; ActionButton also supports downward movement. |
| `0.7.4.28` | 2026-07-15 | Embed Content and Description inputs now use the shared TextareaField component instead of duplicated native textarea markup and styles. |
| `0.7.4.27` | 2026-07-15 | The selected Embed slot now has a thicker Primary Text border, inset selection rail, checkmarked Selected label, and accessible pressed state. |
| `0.7.4.26` | 2026-07-15 | Embed setting now uses Main Background across its container, slots, editor sections, fields, and preview wrapper, with Primary Text applied to labels and editor icons. |
| `0.7.4.25` | 2026-07-15 | Embed setting fields, textareas, selects, borders, and slot labels now explicitly inherit the Main color family instead of the light Input palette in dark mode. |
| `0.7.4.24` | 2026-07-15 | Embed setting now uses Surface/secondary text colors consistently, English action labels, and the standard PrimaryButton with Save icon for saving embeds. |
| `0.7.4.23` | 2026-07-15 | Embed setting now continues inline from each Package feature with a four-level breadcrumb, three-column slot/editor/Discord preview workspace, and live Feature Config values in its preview. |
| `0.7.4.22` | 2026-07-15 | Removed the legacy Advanced setup and Configuration workspace from the Bot Setting main view. |
| `0.7.4.21` | 2026-07-15 | Desktop Runtime and Package action rows no longer use clipping scroll containers; horizontal scrolling is now limited to mobile. |
| `0.7.4.20` | 2026-07-15 | Single-row Runtime and Package action containers now preserve full button shadows instead of clipping their lower edges. |
| `0.7.4.19` | 2026-07-15 | Runtime and Package feature action buttons now stay on one row and share the width required by their longest label. |
| `0.7.4.18` | 2026-07-15 | Bot status Start/Stop and Restart controls now use SecondaryButton while the page Back action remains PrimaryButton. |
| `0.7.4.17` | 2026-07-15 | Bot Setting Back, Start/Stop, and Restart controls now use PrimaryButton. |
| `0.7.4.16` | 2026-07-15 | Package table actions now use PrimaryButton, and Package Embed setting actions now use the edit icon. |
| `0.7.4.15` | 2026-07-15 | Bot Setting action groups now use equal-width standard buttons, while Package feature forms use three icon-led Primary actions and slide their feature breadcrumb from Package setting. |
| `0.7.4.14` | 2026-07-15 | Package setting now lists bot-assigned features with Setting and Remove actions, plus dedicated per-feature configuration and Embed access. |
| `0.7.4.13` | 2026-07-15 | Runtime setting now expands from its Main menu card into a dedicated server panel with expiry, auto-renew, removal, and renewal controls. |
| `0.7.4.12` | 2026-07-15 | The Main > Bot config breadcrumb now matches the Store breadcrumb typography, spacing, interaction, and reduced-motion-aware destination reveal. |
| `0.7.4.11` | 2026-07-15 | The fixed Navbar now remains above the Bot config shared-frame animation, including when the page is scrolled. |
| `0.7.4.10` | 2026-07-15 | Main now matches the Bot config breadcrumb size, and the Bot config Menu card expands into the full inline form with a shared-frame transition and staged field actions. |
| `0.7.4.9` | 2026-07-15 | Bot config now opens inline within Bot Setting as a Main > Bot config state with a full-width edit form instead of a modal or separate route. |
| `0.7.4.8` | 2026-07-15 | My Bot and Bot Setting now start on the same vertical axis as All Products, and Bot Setting no longer shows a divider below its header. |
| `0.7.4.7` | 2026-07-15 | Bot Setting now uses Secondary controls and pairs Surface backgrounds with secondary text and icon colors, including Menu hover states. |
| `0.7.4.6` | 2026-07-15 | Bot Setting now opens with a live bot summary, Start and Restart controls, and responsive navigation cards for bot, Runtime, Package, and permission configuration. |
| `0.7.4.5` | 2026-07-15 | The Add Bot modal now uses the shared Dialog surface colors and standard Primary and Secondary actions. |
| `0.7.4.4` | 2026-07-15 | My Bot toast notifications now sit below the fixed Navbar on desktop and mobile. |
| `0.7.4.3` | 2026-07-15 | My Bot purchase tables now share aligned columns and Runtime actions, while bot cards show live second-level countdowns and safe avatar fallbacks. |
| `0.7.4.2` | 2026-07-15 | Runtime purchases can now be edited, unassigned, or renewed directly from My Bot. |
| `0.7.4.1` | 2026-07-15 | My Bot now groups unused duplicate Packages into stack counts and hides Packages already assigned to bots. |
| `0.7.4` | 2026-07-15 | Added My Bot management with live bot controls and assignable Package and Runtime purchase tables. |
| `0.7.3.7` | 2026-07-15 | Add Credit now uses the concise `/add-credit` URL, with previous Shop paths retained as safe redirects. |
| `0.7.3.6` | 2026-07-15 | Add Credit now uses a clear dedicated URL while existing Wallet links continue to redirect safely. |
| `0.7.3.5` | 2026-07-15 | Signing out from protected Shop pages now returns directly to public Home without preserving the previous page as a login redirect. |
| `0.7.3.4` | 2026-07-15 | Package and Runtime checkout dialogs now use the shared accessible BaseDialog foundation. |
| `0.7.3.3` | 2026-07-15 | Shared modals now use one accessible BaseDialog foundation for consistent focus, dismissal, scrolling, colors, sizing, and motion. |
| `0.7.3.2` | 2026-07-15 | Shared modals now use dialog colors, standard action buttons, and smoother accessible motion. |
| `0.7.3.1` | 2026-07-15 | Toast notifications now use clearer status accents, refined spacing, improved contrast, and smoother stacking motion. |
| `0.7.3` | 2026-07-15 | Added accessible success and failure payment dialogs with distinct audio feedback and component previews. |
| `0.7.2.3` | 2026-07-15 | Navbar wallet balances now display the clear THB currency label. |
| `0.7.2.2` | 2026-07-15 | The Add Credit header is now cleaner, with navigation kept inside the guided top-up flow. |
| `0.7.2.1` | 2026-07-15 | Back navigation now uses a consistent left-direction icon throughout the platform. |
| `0.7.2` | 2026-07-15 | Add Credit now guides customers through amount entry, QR payment, and slip upload in three clear steps. |
| `0.7.1.3` | 2026-07-14 | Package and Runtime checkout dialogs now share consistent dialog colors and standard action buttons. |
| `0.7.1.2` | 2026-07-14 | Runtime plan dividers now use a balanced centered height for a cleaner pricing layout. |
| `0.7.1.1` | 2026-07-14 | Runtime plan prices now use full-height divider lines for clearer visual separation. |
| `0.7.1` | 2026-07-14 | Runtime pricing and availability countdowns now stay aligned on a single line within every card. |
| `0.7.0.99` | 2026-07-14 | Runtime now supports VPS selection, live slot availability countdowns, and clear purchasable or unavailable cards. |
| `0.7.0.98.5` | 2026-07-14 | Package purchase buttons now present prices with a clear trailing THB currency label. |
| `0.7.0.98.4` | 2026-07-14 | Store breadcrumbs now reveal the active destination with subtle, reduced-motion-aware movement. |
| `0.7.0.98.3` | 2026-07-14 | Unified Store paths and fixed header/control row heights so Store pages remain precisely aligned. |
| `0.7.0.98.2` | 2026-07-14 | Search controls now match input text colors, while Store breadcrumbs keep consistent typography and vertical alignment. |
| `0.7.0.98.1` | 2026-07-14 | Packages now uses Home-style product cards, clickable Store navigation, and one continuous searchable catalog. |
| `0.7.0.98` | 2026-07-14 | Refined the Packages catalog with Store navigation, a responsive product grid, and name-based search. |
| `0.7.0.97` | 2026-07-14 | Added a centered Store menu with Packages and Runtime choices plus the standard site footer. |
| `0.7.0.96.12` | 2026-07-14 | Refined Admin Tools selection feedback and aligned Navigation text sizing with the other command-wheel items. |
| `0.7.0.96.11` | 2026-07-14 | Project Admin Tools actions and edit/delete project pickers now use a balanced five-segment radial layout without an empty slice. |
| `0.7.0.96.10` | 2026-07-14 | Fixed clipped Top 3 rows on mobile and expanded Admin Tools with all-page visibility, full navigation, and an admin-only profile toggle. |
| `0.7.0.96.9` | 2026-07-14 | Every existing mobile bottom sheet can now be dragged down to dismiss, including authentication and profile settings. |
| `0.7.0.96.8` | 2026-07-14 | Top 3 Projects now opens and closes with responsive modal motion, and its mobile sheet can be dragged down to dismiss. |
| `0.7.0.96.7` | 2026-07-14 | Admin Tools now manages all Top 3 Projects in one responsive desktop dialog and mobile bottom sheet, keeping showcase cards clean. |
| `0.7.0.96.6` | 2026-07-14 | Project table statuses now use polished tinted badges with compact Inter on mobile and Sora on desktop. |
| `0.7.0.96.5` | 2026-07-14 | Featured Project cards now follow drag gestures smoothly with frame-synchronized movement and gentler snapping. |
| `0.7.0.96.4` | 2026-07-14 | Recommended Shop cards now use calm surface artwork placeholders without neon gradients or glow. |
| `0.7.0.96.3` | 2026-07-14 | Root Home now presents the public site to guests and Shop Main to signed-in customers, with a surface-colored overview section. |
| `0.7.0.96.2` | 2026-07-14 | Shop Main now shows platform-wide totals and lets customers review and pay for recommended features directly. |
| `0.7.0.96.1` | 2026-07-14 | Authenticated Home navigation and sign-in now open the new Shop Main directly. |
| `0.7.0.96` | 2026-07-14 | Redesigned Shop Main with rotating highlights, live service totals, and six recommended feature packages. |
| `0.7.0.95.3` | 2026-07-13 | Stabilized Project Detail inline saving for complete technology groups and featured stack ordering. |
| `0.7.0.95.2` | 2026-07-13 | Signing out from Shop maintenance now returns visitors to the public Home page without an unnecessary login redirect. |
| `0.7.0.95.1` | 2026-07-13 | The maintenance ghost now pops up manga-style speech bubbles with three rotating friendly messages. |
| `0.7.0.95` | 2026-07-13 | The Shop maintenance notice now shows a shared three-day countdown to the expected return time. |
| `0.7.0.94.9` | 2026-07-13 | The Shop maintenance notice now uses dialog colors, a standard action button, and an interactive apologetic ghost. |
| `0.7.0.94.8` | 2026-07-13 | Signed-in Shop areas now show a temporary maintenance notice while wallet top-ups remain available. |
| `0.7.0.94.7` | 2026-07-13 | Projects now appear from a saved snapshot while fresh data loads, with more efficient gallery image caching. |
| `0.7.0.94.6` | 2026-07-13 | Center command-wheel icons now follow the primary text color across light and dark themes. |
| `0.7.0.94.5` | 2026-07-13 | Command-wheel hover now fills each complete segment from the center boundary to the outer edge. |
| `0.7.0.94.4` | 2026-07-13 | Stabilized command-wheel icon visibility and refined the project picker with compact spacing and readable hover colors. |
| `0.7.0.94.3` | 2026-07-13 | Improved command-wheel selection, centered Back navigation, editable project dates and status, mapped roles, and image removal controls. |
| `0.7.0.94.2` | 2026-07-13 | Refined admin project actions, preview ordering, stack selection, certificate uploads, and balanced inline link blocks. |
| `0.7.0.94.1` | 2026-07-13 | Admin tools can now be dragged to any screen corner and open as an animated, sound-enabled command wheel. |
| `0.7.0.94` | 2026-07-13 | Added admin project tools with circular shortcuts and direct inline creation and editing on Project Detail. |
| `0.7.0.93` | 2026-07-13 | Refined Project Add/Edit with the standard Navbar, centered form header, direct Thai/English controls, and design-aligned field order. |
| `0.7.0.92.3` | 2026-07-13 | Technology chips now use compact floating name tooltips instead of expanding labels, preventing overlap and layout movement. |
| `0.7.0.92.2` | 2026-07-13 | Technology names now expand as overlays without pushing or rewrapping neighboring stack icons. |
| `0.7.0.92.1` | 2026-07-13 | Project Detail insight lists now use visible bullets, clearer line spacing, and separation between each item. |
| `0.7.0.92` | 2026-07-13 | Unified Project Detail's Features, Challenges, and What I Learned into a clear three-part list section. |
| `0.7.0.91.1` | 2026-07-13 | Project Detail technology chips now match About, revealing names with lift and focus interactions. |
| `0.7.0.91` | 2026-07-13 | Combined Project Detail's Architecture and technology stack into a responsive image-and-icon showcase section. |
| `0.7.0.90.5` | 2026-07-13 | Featured Projects now opens with the first-ranked Top 1 project centered instead of Top 2. |
| `0.7.0.90.4` | 2026-07-13 | Full-width dark sections now keep their content aligned inside the centered 1280px page block. |
| `0.7.0.90.3` | 2026-07-13 | Dark surface sections on Projects and Project Detail now extend edge to edge like the Home page. |
| `0.7.0.90.2` | 2026-07-13 | Refined Project Detail's Feasibility and Target Users into a spacious dark information section with clearer typography. |
| `0.7.0.90.1` | 2026-07-13 | Tightened the mobile transition between Project Detail's Preview and information sections by removing desktop height and padding constraints. |
| `0.7.0.90` | 2026-07-13 | Consolidated Project Detail's identity, links, status metrics, roles, and overview into a spacious unified information section. |
| `0.7.0.89.4` | 2026-07-13 | Project Detail now defaults to English and treats its flag controls as simple language actions without a persistent selected state. |
| `0.7.0.89.3` | 2026-07-13 | Thai and English flag controls now appear only in the Project Detail Preview header beside Back and Preview. |
| `0.7.0.89.2` | 2026-07-13 | Thai and English flag controls are now visible directly in the Navbar for guests and signed-in users. |
| `0.7.0.89.1` | 2026-07-13 | Project Detail now uses the standard Navbar for theme and Thai/English language controls, keeping Preview focused on navigation and imagery. |
| `0.7.0.89` | 2026-07-13 | Refined Project Detail's Preview hero with balanced navigation controls and a precisely sized, bordered gallery layout. |
| `0.7.0.88.6` | 2026-07-13 | Contribution cells now show only the styled activity tooltip without a duplicate browser tooltip. |
| `0.7.0.88.5` | 2026-07-13 | Contribution cells now show an accessible tooltip with the full date and exact contribution count on hover or keyboard focus. |
| `0.7.0.88.4` | 2026-07-13 | Replaced the GitHub Activity year dropdown with compact, keyboard-accessible text year controls. |
| `0.7.0.88.3` | 2026-07-13 | GitHub Activity now uses the platform's shared dropdown component for contribution-year selection. |
| `0.7.0.88.2` | 2026-07-13 | GitHub Activity now includes month labels, a detailed contribution intensity legend, and selectable yearly history. |
| `0.7.0.88.1` | 2026-07-13 | GitHub contribution activity now uses four distinct green intensity levels for clearer daily activity patterns. |
| `0.7.0.88` | 2026-07-13 | Added a live GitHub Activity section showing Fujipp's contribution total and responsive one-year contribution calendar. |
| `0.7.0.87.5` | 2026-07-13 | New pages now open at the top while browser back and forward navigation restores the previous reading position. |
| `0.7.0.87.4` | 2026-07-13 | Restored Featured project button navigation by preventing the card drag gesture from intercepting button and link presses. |
| `0.7.0.87.3` | 2026-07-13 | Updated table pagination with high-contrast theme colors for its controls, page numbers, icons, and borders. |
| `0.7.0.87.2` | 2026-07-13 | Refined the All Projects section with balanced spacing, centered vertical layout, and theme-aware surface colors. |
| `0.7.0.87.1` | 2026-07-13 | Corrected shared button colors so backgrounds, labels, icons, and borders follow the intended light and dark theme pairing. |
| `0.7.0.87` | 2026-07-13 | Featured project cards now appear in their true ranked order from top 1 through top 3. |
| `0.7.0.86.9` | 2026-07-13 | Featured project cards can now be dragged left or right with a mouse or touch gesture to rotate the showcase. |
| `0.7.0.86.8` | 2026-07-13 | Featured project cards now rotate: clicking a side card swings it into the center where it grows to full size, with dots to jump between cards. |
| `0.7.0.86.7` | 2026-07-13 | Redesigned the featured projects showcase as a dark carousel with the top project enlarged in the center, rank-labeled view buttons, and swipeable cards with indicator dots on mobile. |
| `0.7.0.86.6` | 2026-07-13 | Added a Projects hero introducing the top 3 featured projects, with a Slide down button that scrolls to the next section. |
| `0.7.0.86.5` | 2026-07-13 | The About banner now uses the standard dark surface tone instead of a photo texture, keeping the animated ghosts consistent with the site theme. |
| `0.7.0.86.4` | 2026-07-13 | The footer now uses the same left-aligned layout on mobile as on desktop. |
| `0.7.0.86.3` | 2026-07-13 | Polished the About page with scroll-reveal sections, skill chips that expand their names on hover, lifting design cards, an avatar ring, and self-drawing heading accents. |
| `0.7.0.86.2` | 2026-07-13 | Removed the language toggle from the About page contact row. |
| `0.7.0.86.1` | 2026-07-13 | About banner ghosts now watch the cursor with eyes that follow the pointer and blink. |
| `0.7.0.86` | 2026-07-13 | Turned the About banner into an interactive scene with floating ghost mascots, twinkling sparkles, and a gliding light sweep. |
| `0.7.0.85.9` | 2026-07-13 | Refreshed the About page layout with a My design logo showcase, icon-based skill chips, refined profile row, and updated intro copy in both languages. |
| `0.7.0.85.8` | 2026-07-12 | Filled the footer area on the Home page with the standard background color across the full width. |
| `0.7.0.85.7` | 2026-07-12 | Added the site footer to the Home page. |
| `0.7.0.85.6` | 2026-07-12 | Applied the standard background color to the Home services and developer sections. |
| `0.7.0.85.5` | 2026-07-12 | Added a Home section introducing the developer behind the platform, with a button linking to all projects. |
| `0.7.0.85.4` | 2026-07-12 | Added a Home section highlighting the Discord communities already running on the platform, with their logos. |
| `0.7.0.85.3` | 2026-07-12 | Aligned the Home services section content width with the sections above it on wide screens. |
| `0.7.0.85.2` | 2026-07-12 | Added a Home section presenting premium bot features and reliable hosting, covering custom bot features and flexible 1-3 month runtime plans. |
| `0.7.0.85.1` | 2026-07-12 | Balanced the Home ghost mascot accents with an additional floating pair on the left side. |
| `0.7.0.85` | 2026-07-12 | Tilted the Home ghost mascot accents to match the design and added a gentle floating animation that respects reduced-motion preferences. |
| `0.7.0.84.9` | 2026-07-12 | Added a Home section introducing effortless Discord bot setup, with a Discord art card, ghost mascot accents on desktop, and a stacked centered layout on mobile. |
| `0.7.0.84.8` | 2026-07-12 | Redesigned the Home hero with the Rammetto One display font, a welcome heading beside the mascot image on desktop, and a centered text-only layout on mobile. |
| `0.7.0.84.7` | 2026-07-12 | Restored mobile profile settings as a bottom sheet and raised it to approximately half the viewport height. |
| `0.7.0.84.6` | 2026-07-12 | Expanded the mobile authentication sheet to nearly full height and centered mobile profile settings for easier interaction. |
| `0.7.0.84.5` | 2026-07-12 | Replaced Navbar authentication page links with responsive sign-in and sign-up modals, including a mobile bottom-sheet experience and connected OAuth actions. |
| `0.7.0.84.4` | 2026-07-12 | Connected the Footer directly to Fujipp's email, Discord community, and GitHub profile. |
| `0.7.0.84.3` | 2026-07-12 | Refreshed the responsive Footer with clearer company details, policy links, and social contact access. |
| `0.7.0.84.2` | 2026-07-12 | Refined profile settings with a glass-selected theme control and simpler language switching. |
| `0.7.0.84.1` | 2026-07-12 | Improved Navbar feedback with inverted authentication buttons and clearer hover, pressed, and active Portal links. |
| `0.7.0.84` | 2026-07-12 | Rebuilt desktop and mobile navigation around clear guest and customer journeys, with responsive account settings. |
| `0.7.0.83.9` | 2026-07-12 | Unified field labels and input text with the refreshed responsive typography system. |
| `0.7.0.83.8` | 2026-07-12 | Aligned toggle, radio, and checkbox states with the refreshed light and dark color system. |
| `0.7.0.83.7` | 2026-07-12 | Restored responsive button hover motion and refined the primary glass effect to use neutral highlights. |
| `0.7.0.83.6` | 2026-07-12 | Refined primary and secondary buttons with glass depth, consistent shadows, and clearer disabled states. |
| `0.7.0.83.5` | 2026-07-12 | Added language, social media, and directional icons to the shared visual library. |
| `0.7.0.83.4` | 2026-07-12 | Refreshed light and dark theme colors and added Rammetto One for distinctive display typography. |
| `0.7.0.83.3` | 2026-07-10 | Admins can now edit Shop feature names, descriptions, and icons; Shop cards reflect those choices. |
| `0.7.0.83.2` | 2026-07-10 | The Shop setup guide now appears only for customers without a bot. |
| `0.7.0.83.1` | 2026-07-10 | Protected Shop and Admin pages now return to Login immediately after signing out. |
| `0.7.0.83` | 2026-07-10 | Reframed the Shop around a clearer customer journey: guided setup on the dashboard, Thai action-led labels, and purpose-led Wallet, Feature, and Runtime pages. |
| `0.7.0.82.7` | 2026-07-10 | Runtime slot icons now follow the text-primary color token for clear light and dark theme contrast. |
| `0.7.0.82.6` | 2026-07-10 | Clarified Runtime payment states so an unselected package uses muted text while the selected amount remains readable in dark mode. |
| `0.7.0.82.5` | 2026-07-10 | Restored the shared Navbar on the canonical Shop Admin routes. |
| `0.7.0.82.4` | 2026-07-10 | Added Dashboard, Users, and Pricing shortcuts to the Navbar account menu for Admin accounts. |
| `0.7.0.82.3` | 2026-07-10 | Moved Admin account controls into the standard Navbar and removed the floating Admin tools control from the workspace. |
| `0.7.0.82.2` | 2026-07-10 | Corrected Admin tools contrast so its dark panel keeps clear, accessible light labels and icons in every theme. |
| `0.7.0.82.1` | 2026-07-10 | Refined the Admin tools control into a compact labeled panel, replacing the overlapping radial action bubbles with a calmer, clearer workspace menu. |
| `0.7.0.82` | 2026-07-10 | Runtime purchases now select a duration first and are kept unassigned until the customer chooses a bot from Dashboard; expired releases no longer remain in the customer’s Runtime cards. |
| `0.7.0.81.2` | 2026-07-10 | Completed the Shop workspace refresh with a token-aligned Wallet surface and dark-mode payment controls that match Bot, Feature, and Runtime pages |
| `0.7.0.81.1` | 2026-07-10 | Unified Admin bot, user, wallet, and subscription actions with the shared controls and operational form styles |
| `0.7.0.81` | 2026-07-10 | Rebuilt the shared Shop card system so bot, feature, and runtime cards have aligned surfaces, dimensions, actions, and dark-workspace controls |
| `0.7.0.80.9` | 2026-07-10 | Refined Shop bot cards and Admin bot status colours; Admin pricing controls now use a consistent dark workspace palette, aligned fields, and accessible checkboxes |
| `0.7.0.80.8` | 2026-07-10 | Improved Shop and Admin keyboard dismissal for operational dialogs, and aligned key Shop actions, page sizing, and typography with the shared design system |
| `0.7.0.80.7` | 2026-07-10 | Equalized the Admin VPS edit row controls so text inputs, selects, and save actions share the same field height, radius, and spacing |
| `0.7.0.80.6` | 2026-07-10 | Aligned Admin VPS, Pricing, Bots, and Users pages to text-primary/text-secondary text colors, shared admin chrome, centered layout, and shared action controls |
| `0.7.0.80.5` | 2026-07-09 | Refined Admin Dashboard into a design-system-aligned overview with token-based metric cards, icon-led summary stats, and a cleaner recent activity table |
| `0.7.0.80.4` | 2026-07-09 | Restored standard shop navigation on Bot Config and Embed Setting, and refined Embed Setting into a cleaner editing workspace |
| `0.7.0.80.3` | 2026-07-09 | Simplified Bot Config surfaces by removing glow-style backgrounds and shadows for a cleaner flat workspace |
| `0.7.0.80.2` | 2026-07-09 | Aligned Bot Config icon and supporting text colors with the design-system text tokens |
| `0.7.0.80.1` | 2026-07-09 | Fixed the Bot Config Dashboard action so it returns to the shop dashboard correctly |
| `0.7.0.80` | 2026-07-09 | Refined Bot Config into a clearer setup workspace with status cards, feature navigation, runtime controls, and icon-led actions |
| `0.7.0.79` | 2026-07-08 | Added a frontend architecture knowledge map covering stack choices, naming rules, shared UI inventory, feature inventory, design-system files, router, stores, and config modules; updated README/AGENTS/component guidance to point at the current `shared/` + `features/` structure |
| `0.7.0.78` | 2026-07-06 | Fixed the deploy build after the UI revision by replacing the admin wallet panel's stale TableNextBackButton usage with the shared TablePagination and deleting the unused legacy FeatureTable component that still imported the removed button |
| `0.7.0.77` | 2026-07-06 | Shop flow polish: Dashboard hides fully-assigned feature cards (0 items). Feature store purchase is now buy-into-stock — PurchaseDialog dropped the bot picker entirely and became the formal payment dialog (รายการ/แบบ/ยอดชำระ/ยอดเงินในกระเป๋า/คงเหลือหลังชำระ, insufficient → เติมเงิน button, adaptive colors, Secondary/PrimaryButton, closes on confirm) with a note pointing to Dashboard Use for binding. CreateBotDialog rebuilt to the new Figma: centered "New Bot Discord" title, single-column fields with red required asterisks (Bot Name / Bot Token / Application ID now required on create), top+bottom dividers, centered Close + Add(+icon) SecondaryButtons, adaptive modal colors; shared TextField gained a `required` prop that renders the red asterisk |
| `0.7.0.76` | 2026-07-06 | Dashboard: Feature cards' Use now actually assigns — "X items" counts only the unassigned stack (BOT-scoped, no bot, not expired) and Use opens a pick-a-bot modal calling the new POST /api/subscriptions/features/{id}/assign, dropping the count as items move onto bots (0 items → info toast pointing to the Package store). All Dashboard modals (assign runtime / use feature / add-time payment / buy-slot) now use the shared Secondary/PrimaryButton pair and close immediately on confirm (result reported via toast, errors included). Runtime store buy dialog upgraded to the same formal payment summary (ยอดชำระ / ยอดเงินในกระเป๋า / คงเหลือหลังชำระ from a new /api/wallet fetch, insufficient → red remaining + เติมเงิน button to Wallet) with the adaptive modal color pairing |
| `0.7.0.75` | 2026-07-06 | Dashboard modals (buy-slot / assign-runtime / add-time payment) fixed to the adaptive token pairing used by the shared ConfirmModal: `main-background` + `text-primary` + `main-divider` instead of the fixed-dark `main-surface` (which broke the light theme with black-on-dark text); payment summary panel now uses a subtle text-primary/4% tint over the modal background and the assign SelectField drops the deprecated tone="dark" prop |
| `0.7.0.74` | 2026-07-06 | Dashboard เพิ่มเวลา modal upgraded from a plain ConfirmModal sentence to a formal payment-summary dialog: itemised rows (รายการ VPS/SLOT, แพ็กเกจ, ยอดชำระ highlighted in primary, ยอดเงินในกระเป๋า, คงเหลือหลังชำระ) in a bordered summary panel; when the wallet balance is insufficient the remaining amount turns error-red, a warning line appears and the confirm button becomes เติมเงิน (→ Wallet page) instead of allowing a doomed charge |
| `0.7.0.73` | 2026-07-06 | Dashboard runtime cards now act in place instead of bouncing to the Runtime store: Use (unassigned) / Edit (assigned — inUse now derived from the actual bot assignment, not subscription status) opens an assign modal with a bot dropdown (incl. "ไม่ assign" to power off) calling POST /api/runtime/{id}/assign, and the เพิ่มเวลา button's ConfirmModal now shows the card's own package name + renew price and actually renews via POST /api/subscriptions/runtime/{id}/renew (wallet-charged), with busy states, error toasts and a dashboard reload after either action |
| `0.7.0.72` | 2026-07-05 | Performance now focuses on the backend platform server snapshot and avoids database-backed monitoring requests |
| `0.7.0.71` | 2026-07-05 | Wallet balance card now matches dashboard sizing and gains a pointer-tilt hover animation |
| `0.7.0.70` | 2026-07-05 | Wallet page now follows the Package layout shell with standard shop navbar/footer and aligned section structure |
| `0.7.0.69` | 2026-07-05 | Wallet top-up panel removed quick amount buttons, updated amount field copy, and enlarged QR/slip areas into a balanced two-column layout |
| `0.7.0.68` | 2026-07-05 | Wallet page now uses the existing WalletCreditCard component for the balance card, matching the dashboard card style |
| `0.7.0.67` | 2026-07-05 | Wallet top-up now uses the new compact panel layout (QR + amount quick-picks + slip upload + confirm) from the latest design |
| `0.7.0.66` | 2026-07-05 | Button mask icons now inherit text color (`currentColor`), so confirm modal icons always match their label color |
| `0.7.0.65` | 2026-07-05 | SecondaryButton now supports explicit icon tint override, and ConfirmModal sets its confirm icon to text-primary |
| `0.7.0.64` | 2026-07-05 | ConfirmModal confirm action now supports a context icon, showing the delete icon automatically for danger actions |
| `0.7.0.63` | 2026-07-05 | Added a Profile section to the Shop Dashboard above the Bot section: a WalletCreditCard (balance from a new /api/wallet fetch, holder + avatar from the user profile, tier colour by balance) plus Add Money (→ Wallet) and Profile Setting buttons. Profile Setting has no destination route yet, so it shows an info toast instead of dead-ending |
| `0.7.0.62` | 2026-07-05 | Added WalletCreditCard — a credit-card-styled wallet balance card whose background tier is derived from the balance (default white → ฿500 black → ฿1,000 indigo → ฿5,000/฿10,000 red), with gold-foil brand/holder/scheme text on the coloured tiers, an EMV chip stand-in when no emblem image is given, and Thai-formatted balance; uses Inter (the Figma's decorative fonts aren't bundled and CDN font imports are disallowed). Exported from the shop components barrel |
| `0.7.0.61` | 2026-07-05 | Shop card grids now fill the full width instead of leaving a right-hand gutter: the Feature store, Runtime store and Dashboard (bot/feature/runtime sections + the metric row) switched from fixed-width flex-wrap cards to a CSS grid of `repeat(4, 1fr)` → 4 columns × 2 rows per page on desktop that page through the existing TablePagination, stepping down to 3 / 2 / 1 columns on narrower screens |
| `0.7.0.60` | 2026-07-05 | Rebuilt the Runtime store page (/shop/runtime) to the new card design: standard AppNavbar + AppFooter (added shop-runtime to app-chrome routes), "Runtime" title + Back, and a responsive grid of RuntimeSlotCard (sell) — one card per FREE VPS slot showing VPS/SLOT + region · ว่าง + the plan menu (7 วัน / 1 เดือน / 3 เดือน) + starting price — with client-side TablePagination. Buy opens a plan-picker dialog (radio plans by name + price, optional bot assign) that keeps the existing POST /api/runtime/slots/{id}/purchase flow; dialog actions now use the shared Primary/SecondaryButton so the confirm button is legible in dark mode (the old hand-rolled confirm rendered white-on-white). Dropped the old VPS seat-grid + assign/renew dialogs (owned-runtime management lives on the Dashboard) |
| `0.7.0.59` | 2026-07-04 | Rebuilt the Feature store page (/shop/package) to the new Figma: standard AppNavbar + AppFooter (added shop-package to the app-chrome routes), "Package" title with a Back button to the dashboard, "Features" heading + divider rule, and a responsive grid of FeatureCard (sell) — price + icon + clamped description with read-more (opens ReadMoreModal) + Buy — with client-side TablePagination (8/page). Keeps the existing purchase flow (PurchaseDialog → POST /api/orders) and drops the old sidebar margins, balance pill and wallet/runtime header buttons |
| `0.7.0.58` | 2026-07-04 | ReadMoreModal body text uses the body-small type size (was subtitle) so long feature descriptions read at a calmer scale |
| `0.7.0.57` | 2026-07-04 | Shop cards polish: BotControlCard drops the banner (round avatar only). FeatureCard now equal-height — 1-line title + 3-line clamped description with a fixed content block and bottom-aligned footer, plus an "อ่านเพิ่มเติม" link (shown only when the text overflows) that opens the new shared ReadMoreModal (scrollable read-only text + Close). RuntimeSlotCard's owned action swaps the next-arrow for an icons.shopReTime icon button that opens a ConfirmModal asking to extend runtime (confirm → Runtime page). Added ReadMoreModal to the shared modals barrel |
| `0.7.0.56` | 2026-07-04 | FeatureCard and RuntimeSlotCard now use the shared SecondaryButton for their Buy/Use/Edit actions (fill for the primary action + trailing buy icon on sell) instead of hand-rolled primary-styled buttons; removed the cards' local button CSS. Also fixed the Shop Dashboard blank page: the shop components barrel still re-exported the WIP-deleted FeatureTable (which imports the removed TableNextBackButton), breaking the whole chunk — dropped the dead FeatureTable barrel export |
| `0.7.0.55` | 2026-07-04 | Rebuilt the Shop Dashboard to the new Figma layout (responsive, one view): standard AppNavbar + AppFooter now render on /shop (deeper shop pages unchanged), DASHBOARD title + 4 compact metric cards (2×2 on mobile), per-section title + divider rule headings, Bot section with feature-flag slot counter (X/Y slot) + New Bot PrimaryButton and BotControlCard grid, Features section with blurb + Buy Feature button, owned FeatureCards grouped by feature with item counts + TablePagination, Runtimes section with blurb + Buy Runtime button and owned RuntimeSlotCards (Edit/Use by assignment); keeps all existing wiring (bot start/stop/restart/edit, create-bot dialog, buy-slot modal, toasts) and drops the old sidebar margins, quick-start chips and FeatureTable from this page |
| `0.7.0.54` | 2026-07-04 | Added a new Shop card set (separate from the existing BotCard/RuntimeCard/PackageCard) built from the new Figma exports and mapped to design tokens + theme-aware shop-card vars: BotStatusBadge (online/offline), BotControlCard (default + skeleton, banner/avatar header, Runtime + VPS/Slot lines, power/restart/edit ActionButton controls with the power icon toggling play↔pause by status), RuntimeSlotCard (sell = price + Buy, owned = Use + next arrow) and FeatureCard (sell = price + Buy, owned = items count + Use); exported via the shop components barrel |
| `0.7.0.53` | 2026-07-03 | Mobile navbar: theme switches with a single cycle button (slide-out track is desktop-only) and the hamburger is now three animated CSS bars (smaller, 40px) that morph into an X — top/bottom rotate, middle shrinks away; mobile theme taps apply instantly (no deferred apply) and the menu drawer opens/closes with no transition |
| `0.7.0.52` | 2026-07-03 | Fixed BackgroundEffect being invisible everywhere: a stray character after `<style scoped>` broke its stylesheet; Projects/About/Auth/Detail/Add-Edit page roots are now transparent and the App-level BackgroundEffect now renders only on the Home route; other pages keep transparent roots on the plain theme background |
| `0.7.0.51` | 2026-07-03 | Dark-theme fixes: TextField inputs force color-scheme light so the native month-picker calendar icon shows again and clicking anywhere in a month field opens the picker; stack chips on Project Detail and Add/Edit render tintable icons (Socket.io, ETAX Sign/Sender, Email, HSM, Open Router, Linux Server, ...) via text-primary mask, and the About page skill chips do the same |
| `0.7.0.50` | 2026-07-03 | TablePagination: removed single-step next/back — the skip buttons now jump ~10% of total pages (100 → ±10, min ±1); page numbers remain for single steps. Table row hover/active tokens now mix from text-primary so the hover highlight is visible in dark theme (was surface-on-background, nearly identical in dark). Extracted the table pagination (arrow ActionButtons + page number pills) into a shared TablePagination component used by both ProjectTable and FeatureModal |
| `0.7.0.49` | 2026-07-03 | Rebuilt FeatureModal as a single-slot picker: each featured card's Change/Add edits only its own slot (No/Project/Category rows, selected row outlined, projects used in other slots dimmed, deselect+Save clears the slot), SecondaryButton Close/Save with icons.save, filter + search + ActionButton pagination; fixed modal height with 5 top-aligned fixed-height rows per page and 2-line project names; Save closes the modal immediately (result via toast only, no inline error) and is disabled when nothing changed |
| `0.7.0.48` | 2026-07-03 | StatusTag now has a fixed 148px width so all statuses align equally. ConfirmModal rebuilt to the new design with 3 variants (Cancel+Confirm, danger Cancel+Delete, single Close) plus custom labels, Escape/backdrop close and body scroll lock; DeleteModal is now a thin danger wrapper; previewed on /components |
| `0.7.0.47` | 2026-07-03 | PrimaryButton and SecondaryButton label weight changed from extrabold (800) to semibold (600) |
| `0.7.0.46` | 2026-07-03 | New global toast system: StatusToast restyled to the new design (dedicated icons.info/success/warning/error status icons), toastStore + ToastHost stack bottom-right with slide in/out, 5s auto-dismiss, toasts push up as older ones leave; Projects/New Project pages migrated off their local toast viewports; toast triggers previewed on /components |
| `0.7.0.45` | 2026-07-03 | Formalized Position role names (Full Stack/Frontend/Backend Engineer, UI/UX Specialist, Database/System Architect, DevOps Engineer, Project Manager, Quality Assurance Engineer); Project Detail hides sections without data (Preview, Overview, Feasibility/Target Users, Features, Challenges & Lessons) |
| `0.7.0.44` | 2026-07-03 | Rebuilt the Add/Edit Project page to the new flat section design (header with language/theme/back, AT A GLANCE dates + removable role cards, SUMMARY textareas, dynamic FEATURES rows, ARCHITECTURE upload buttons, STACK selects + removable chips, PREVIEW slots, CHALLENGES/LESSONS title+detail rows, LINK section, submit); the page hides the navbar, PREVIEW slots can delete and reorder images (move left/right), and drops the old tab-panel design and the timeline milestones editor (milestone data is preserved) |
| `0.7.0.43` | 2026-07-03 | Login/Register pages hide the navbar and fill the viewport: AuthCard header row gains a Back PrimaryButton (arrowBack, returns to the redirect origin) and the form centers vertically per the new Figma auth layout |
| `0.7.0.42` | 2026-07-03 | Project Detail: dynamic island replaced with a bottom-right scroll-to-top ActionButton (new scroll-top action, arrowBack rotated up, appears on any scroll); image view modal removed from the gallery main image and the architecture image; mobile link/back buttons now render as true icon-only PrimaryButtons (square proportions) instead of CSS-hidden labels |
| `0.7.0.41` | 2026-07-03 | Fixed the scrollbar flickering during theme switches: scrollbar colors are now opaque and the theme cross-fade no longer animates the html element that owns the scrollbar. Project Detail Preview header now holds language toggle + theme cycle + Back to projects (icon-only on mobile); the language toggle beside the link buttons is removed |
| `0.7.0.40` | 2026-07-03 | Site-wide thin scrollbar (6px, primary-tinted thumb, transparent track — previously shop-only) with scrollbar-gutter: stable so content no longer shifts when the bar appears. Project Detail hides the navbar and adds a "Back to projects" PrimaryButton (arrowBack icon) opposite the Preview heading, plus a top-right dynamic island (back + language toggle + theme cycle button) that slides in once the AT A GLANCE section scrolls past |
| `0.7.0.39` | 2026-07-03 | About page: added the language toggle to the right of the contact link buttons (wired to i18n locale, replacing the toggle removed from the profile dropdown). Project Detail link buttons now use the shared PrimaryButton. Navbar theme picker open/close now animates symmetrically (ease-in-out), and selecting a theme collapses smoothly first — the theme is applied after the 300ms collapse so the page repaint no longer eats the animation |
| `0.7.0.38` | 2026-07-03 | Removed the language toggle from the profile dropdown; Project Detail: language toggle moved right of the link buttons, icons switched to the icons config (dice/user/target/featureFlag/github), tintable icons render via CSS mask so they follow the theme, and Features is a full-width 2-column grid (1 column on mobile) |
| `0.7.0.37` | 2026-07-03 | Rebuilt the Project Detail page to the new flat design (Preview gallery, name + link buttons header, AT A GLANCE cards + role chips, Overview/Feasibility/Target Users, Architecture image, Stack chips, Feature rows, Challenges & Lessons cards, footer); drops the old hero/island/reveal design and fixes stale ActionButton/LanguageButton imports |
| `0.7.0.36` | 2026-07-03 | StackTag default (template) group icons are now tinted with the primary color via CSS mask; real project stack icons keep their brand colors. Projects page now scrolls with the document (min-height like About) so the footer is reachable |
| `0.7.0.35` | 2026-07-03 | Revised ProjectImage gallery to the new design: main image on top (16:9, max 542px, 12px radius) with a centered wrapping thumbnail row below that scales down per breakpoint |
| `0.7.0.34` | 2026-07-03 | Fixed the Projects route failing to load: FeatureModal (and portfolio Gallery) still imported the deleted NextBackButton, breaking their chunks; both now use ActionButton |
| `0.7.0.33` | 2026-07-03 | Rebuilt the Projects page to the new design (centered Featured title + card row, All Project heading with subtitle above the table, 1280px container); dropped the old section-band theming vars and the Ai Skills section not present in the new design |
| `0.7.0.32` | 2026-07-03 | Revised FeaturedProjectCard to the new design (416px card, 160px hero, CategoryTag + StackTag row, 3-line description, SecondaryButton actions, tag-aware skeleton; fixes stale ActionButton variant prop) |
| `0.7.0.31` | 2026-07-03 | Rebuilt ProjectTable to the new design: fixed-height panel (544px / 555px mobile), new header/row layout with StatusTag, mobile No+Project+Status view, ActionButton pagination (replaces deleted TableNextBackButton), CheckboxInput filter menu |
| `0.7.0.30` | 2026-07-03 | Revised CategoryTag to the new Projects design (12px radius, divider border, flat surface, built-in shimmer skeleton) and previewed it on /components |
| `0.7.0.29` | 2026-07-03 | Revised StackTag to the new Projects design (12px radius, divider border, per-group icon override via stacks prop, built-in shimmer skeleton) and previewed it on /components |
| `0.7.0.28` | 2026-07-03 | Revised StatusTag to the new Projects design (white surface, status-colored border + 15px dot, 12px radius) and previewed all 4 states on /components |
| `0.7.0.27` | 2026-07-03 | Removed the legacy ShopSidebar (broken ThemeButton import; new shop design has no sidebar) from all shop/admin views |
| `0.7.0.26` | 2026-07-03 | Auth page now renders under the navbar (Figma logged-out shop flow); profile-menu Login/Register redirect back to the page they were opened from |
| `0.7.0.25` | 2026-07-03 | New AuthCard login/register component (OAuth row, revised fields, remember + mode switch) wired into AuthView, keeping existing auth logic |
| `0.7.0.24` | 2026-07-03 | Rebuilt the About page to the new design (banner, profile + lived clock + contact buttons, about, educations, skill chips) and aligned skills config with it |
| `0.7.0.23` | 2026-07-03 | New Home hero (FULLSTACK DEVELOPER + View Projects CTA, responsive); component previews moved to /components (ComponentView) |
| `0.7.0.22` | 2026-07-03 | Revised the footer to the new design: light background, top divider, responsive centered mobile layout |
| `0.7.0.21` | 2026-07-03 | Revised the navbar: logo+menu left group with tab indicators, SHOP replaces CONTACT (CONTACT moves to mobile menu), theme picker with fixed slide icon, text-primary logo/theme icons, profile circle with Login/Register dropdown, responsive hamburger + 219px drawer |
| `0.7.0.20` | 2026-07-03 | Added a circular ActionButton (back/next/skip/play/pause/restart/add/delete/edit/setting) and previewed it on Home |
| `0.7.0.19` | 2026-07-03 | Aligned SearchField with the revised field design (placeholder tone, weight, hover, fluid width) and previewed it on Home |
| `0.7.0.18` | 2026-07-03 | Added a DateField (calendar picker, optional time via with-time) matching the revised field design, previewed on Home |
| `0.7.0.17` | 2026-07-03 | Revised TextareaField to match the new field design (optional label, support text, radius, weights) and previewed it on Home |
| `0.7.0.16` | 2026-07-03 | Revised SelectField to match the new field design: slide arrow (fixes the deleted legacy dropdown icon), TextField-matching input tokens (legacy tone/dark overrides removed), support text, radius, Home preview |
| `0.7.0.15` | 2026-07-03 | Upgraded TextField to the revised design: optional label/placeholder/unit/support text/icon, wrapper-based states, Home preview |
| `0.7.0.14` | 2026-07-03 | Added a StarRating input/display component and previewed it on Home |
| `0.7.0.13` | 2026-07-03 | Added a FilterButton with rotatable slide arrow, count badge active state, mock options dropdown with clear action, and Home preview |
| `0.7.0.12` | 2026-07-03 | Added RadioInput and CheckboxInput primitives (s/m/l sizes) and previewed them on Home |
| `0.7.0.11` | 2026-07-03 | Added an on/off ToggleSwitch primitive with pointer-tilt language toggle refinement and previewed both on Home |
| `0.7.0.10` | 2026-07-03 | Added a liquid-glass EN/TH language toggle button and showcased it on the Home component preview |
| `0.7.0.9` | 2026-07-03 | Refined revised buttons with Figma-style drop shadows, pointer tilt hover, and fill/hug/fixed width modes |
| `0.7.0.8` | 2026-07-03 | Added a central icon config with color-mode metadata and wired current button previews to it |
| `0.7.0.7` | 2026-07-03 | Cleared legacy shared button primitives and turned Home into a preview for the revised button components |
| `0.7.0.6` | 2026-07-03 | Added revised primary and secondary button primitives with icon slots and a button skeleton state |
| `0.7.0.5` | 2026-07-03 | Replaced the icon library with a cleaner public structure and consistent names |
| `0.7.0.4` | 2026-07-02 | Improved typography tokens with mobile sizing and a smaller support text style |
| `0.7.0.3` | 2026-07-02 | Refined the platform color foundation for the new light and dark UI direction |
| `0.7.0.2` | 2026-06-27 | The Review Credit counter on the bot configuration page now appears only under its own feature tab, instead of showing under every feature |
| `0.7.0.1` | 2026-06-26 | The Add / Edit Project page now follows light and dark themes to match the rest of the Projects experience |
| `0.7.0` | 2026-06-25 | Admin Bots list now shows each bot's avatar and a live runtime status badge (online/stopped/errored + uptime), fetched on-demand per row |
| `0.6.9.1` | 2026-06-24 | Fix the production build for the amount-tier role editor (guard array access under strict TS) |
| `0.6.9` | 2026-06-24 | Bot config: amount-tier role rewards are edited as repeatable "amount + role" rows with add/remove, instead of a raw JSON box |
| `0.6.8.3` | 2026-06-24 | Fix: removing a Price Board category button now persists — it saves an explicit empty override so the seeded default no longer re-appears after refresh |
| `0.6.8.2` | 2026-06-24 | Embed Designer: a "ลบปุ่มนี้" control removes unused Price Board category buttons, and the preview now hides categories without a label (matching the bot) |
| `0.6.8.1` | 2026-06-24 | Parse ENUM field options from the raw JSON string the API now sends (dropdown choices) |
| `0.6.8` | 2026-06-24 | The bot config form now renders ENUM fields as a dropdown (used by Bot Presence status / activity type) |
| `0.6.7.3` | 2026-06-23 | The Embed Designer can now edit the tag-line message above each Price Board category embed, with a live preview |
| `0.6.7.2` | 2026-06-23 | The Embed Designer can now style the Price Board category buttons and each category's order-room link button |
| `0.6.7.1` | 2026-06-23 | The Embed Designer can now style the standalone top-up panel button |
| `0.6.7` | 2026-06-23 | The Embed Designer preview now mirrors the real message — actual buttons, menus, and sample data drawn from the bot's own settings (e.g. shows your configured group count) |
| `0.6.6.1` | 2026-06-23 | Fixed dropdown colors in dark mode and scoped the Embed Designer to the selected feature, with the Embed panel shown only when that feature has embeds |
| `0.6.6` | 2026-06-23 | Expanded the Embed Designer with collapsible sections, author/title links, footer date & time, and field reorder/duplicate |
| `0.6.5` | 2026-06-22 | Admins can rename a VPS (display name) from the VPS page |
| `0.6.4` | 2026-06-22 | Refined shop and admin controls with consistent tables, dropdowns, activity sorting, and removed the Guide entry |
| `0.6.3` | 2026-06-22 | The admin VPS page now lists seatless runtimes and lets admins assign them to a free seat |
| `0.6.2` | 2026-06-22 | Added an admin VPS & Runtime page showing which bot sits on which seat, with capacity, maintenance, and seat-move controls |
| `0.6.1` | 2026-06-22 | Added the Runtime "server cabinet" page to buy a hosting seat and move it between bots |
| `0.6.0` | 2026-06-22 | Bots now show a live Online / Offline / Expired badge and you can buy extra permanent bot slots |
| `0.5.9.37` | 2026-06-22 | Added a slimmer custom scrollbar treatment across the Shop experience |
| `0.5.9.36` | 2026-06-22 | Smoothed the shop sidebar collapse animation so closing feels as polished as opening |
| `0.5.9.35` | 2026-06-21 | Refined Changelog wording so the page reads like formal product release notes |
| `0.5.9.34` | 2026-06-21 | Made Changelog entries easier to scan with readable rows and full details |
| `0.5.9.33` | 2026-06-21 | Matched the Changelog page colors and transitions to the Performance dashboard |
| `0.5.9.32` | 2026-06-21 | Redesigned Changelog as a compact release browser with filters, search, sorting, and paging |
| `0.5.9.31` | 2026-06-21 | Improved the admin floating profile menu layout and avatar cropping |
| `0.5.9.30` | 2026-06-21 | Added animated circular admin action buttons and prevented accidental dragging |
| `0.5.9.29` | 2026-06-21 | Added a draggable iOS-style admin profile button that remembers its position |
| `0.5.9.28` | 2026-06-21 | Made the admin profile island visible on guarded admin pages |
| `0.5.9.27` | 2026-06-21 | Kept the admin profile island available even when the main navbar is hidden |
| `0.5.9.26` | 2026-06-21 | Connected the frontend Performance panel to real uptime and browser timing data |
| `0.5.9.25` | 2026-06-21 | Redesigned the admin profile control as a bottom-right island card |
| `0.5.9.24` | 2026-06-21 | Refined the Performance dashboard with clearer colors, motion, cards, and live-status details |
| `0.5.9.23` | 2026-06-21 | Connected the Performance dashboard to live platform health and incident data |
| `0.5.9.22` | 2026-06-21 | Rebuilt Performance as a platform monitoring dashboard with clear live and display data states |
| `0.5.9.21` | 2026-06-21 | Added live browser-session metrics to the public Performance page |
| `0.5.9.20` | 2026-06-21 | Added a public Performance snapshot for website delivery and platform readiness |
| `0.5.9.19` | 2026-06-21 | Improved project category and status tags across light and dark themes |
| `0.5.9.18` | 2026-06-21 | Added responsive glass hover highlights to shared buttons and pagination controls |
| `0.5.9.17` | 2026-06-21 | Improved light-mode readability for shared glass buttons |
| `0.5.9.16` | 2026-06-21 | Made the Projects page respond smoothly to light and dark mode |
| `0.5.9.15` | 2026-06-21 | Smoothed the Project Detail background so hero and content sections feel continuous |
| `0.5.9.14` | 2026-06-21 | Restyled the project image zoom modal to match the dark case-study experience |
| `0.5.9.13` | 2026-06-21 | Removed a duplicate Project Detail call-to-action section |
| `0.5.9.12` | 2026-06-21 | Improved Project Detail media layout for architecture diagrams and gallery images |
| `0.5.9.11` | 2026-06-21 | Redesigned the Project Detail tech stack as labeled glass cells |
| `0.5.9.10` | 2026-06-21 | Matched the Project Detail floating controls to the shared glass style |
| `0.5.9.9` | 2026-06-21 | Moved Project Detail floating controls to a cleaner right-side position |
| `0.5.9.8` | 2026-06-21 | Stabilized the Projects list after returning from a single project page |
| `0.5.9.7` | 2026-06-21 | Added floating Project Detail controls after the hero controls scroll away |
| `0.5.9.6` | 2026-06-21 | Aligned Project Detail hero content to the shared page width |
| `0.5.9.5` | 2026-06-21 | Changed project roles to describe Fujipp's responsibilities on each project |
| `0.5.9.4` | 2026-06-21 | Reworked Project Detail summary metrics into visitor-friendly facts |
| `0.5.9.3` | 2026-06-21 | Improved shared section header contrast |
| `0.5.9.2` | 2026-06-21 | Polished the Project Detail at-a-glance section with stronger hierarchy |
| `0.5.9.1` | 2026-06-21 | Improved Project Detail navigation and compact project link buttons |
| `0.5.9` | 2026-06-21 | Rebuilt Project Detail as an immersive dark case-study page |
| `0.5.8.35` | 2026-06-21 | Aligned the Project Detail top spacing with the fixed navbar |
| `0.5.8.34` | 2026-06-21 | Updated the Project Detail top section layout and header label |
| `0.5.8.33` | 2026-06-20 | Aligned the Projects page top spacing with the fixed navbar |
| `0.5.8.32` | 2026-06-20 | Lowered the global button click sound volume |
| `0.5.8.31` | 2026-06-20 | Restored the Projects AI Skills marquee to full width |
| `0.5.8.30` | 2026-06-20 | Refined shared section header color and section spacing |
| `0.5.8.29` | 2026-06-20 | Added a subtle click sound to enabled button-style controls |
| `0.5.8.28` | 2026-06-20 | Widened the Projects table and restyled filters and pagination |
| `0.5.8.27` | 2026-06-20 | Aligned Projects page section widths with the About page |
| `0.5.8.26` | 2026-06-20 | Matched Contact card actions to the shared glass button style |
| `0.5.8.25` | 2026-06-20 | Restyled the shared secondary button with a glass treatment |
| `0.5.8.24` | 2026-06-20 | Tightened About page spacing so the Gallery meets the footer cleanly |
| `0.5.8.23` | 2026-06-20 | Improved About Gallery heading color without affecting other section headers |
| `0.5.8.22` | 2026-06-20 | Matched the About Gallery section treatment to the About hero |
| `0.5.8.21` | 2026-06-20 | Restyled shared image navigation controls with the glass treatment |
| `0.5.8.20` | 2026-06-20 | Reorganized About skill categories and matched their public icons |
| `0.5.8.19` | 2026-06-20 | Improved About skill icon coloring across layouts |
| `0.5.8.18` | 2026-06-20 | Added missing About skill icon color treatments |
| `0.5.8.17` | 2026-06-20 | Prevented mobile About skill cards from overflowing the viewport |
| `0.5.8.16` | 2026-06-20 | Prevented the About hero 3D model from flashing before animation starts |
| `0.5.8.15` | 2026-06-20 | Prioritized critical About page assets for faster first impressions |
| `0.5.8.14` | 2026-06-20 | Aligned About Education and Gallery sections with the main page container |
| `0.5.8.13` | 2026-06-20 | Redesigned About Skills as full-width server rack cards |
| `0.5.8.12` | 2026-06-20 | Reduced About hero music volume |
| `0.5.8.11` | 2026-06-20 | Refined the About hero lived-time counter format |
| `0.5.8.10` | 2026-06-20 | Changed the About hero lived-time counter to a minute-based format |
| `0.5.8.9` | 2026-06-20 | Added control over the About hero mascot animation loop |
| `0.5.8.8` | 2026-06-20 | Restored About hero music playback with visibility-aware fading |
| `0.5.8.7` | 2026-06-20 | Added a compact About hero lived-time clock |
| `0.5.8.6` | 2026-06-20 | Added a live lived-time counter to the About hero |
| `0.5.8.5` | 2026-06-20 | Updated About hero copy with internship context and personal details |
| `0.5.8.4` | 2026-06-20 | Simplified the About hero role label presentation |
| `0.5.8.3` | 2026-06-20 | Updated the About hero role badge color |
| `0.5.8.2` | 2026-06-20 | Clarified the About hero role and system architecture interest |
| `0.5.8.1` | 2026-06-20 | Refined About hero introduction copy in English and Thai |
| `0.5.8` | 2026-06-20 | Clarified the Fujipp/Fuji personal brand copy |
| `0.5.7.9` | 2026-06-20 | Prevented the About hero 3D mascot from being clipped |
| `0.5.7.8` | 2026-06-20 | Simplified the About hero eyebrow label |
| `0.5.7.7` | 2026-06-20 | Added a glass style to the shared language switch |
| `0.5.7.6` | 2026-06-20 | Implemented the shared EN/TH language switch variants |
| `0.5.7.5` | 2026-06-20 | Stabilized the desktop About hero height at lower browser zoom levels |
| `0.5.7.4` | 2026-06-20 | Simplified the About hero status line |
| `0.5.7.3` | 2026-06-20 | Added Fujipp/Fuji branding to the About hero status line |
| `0.5.7.2` | 2026-06-20 | Refined About language switching and copy transitions |
| `0.5.7.1` | 2026-06-20 | Refined the About hero with centered mascot, language toggle, and responsive copy |
| `0.5.7` | 2026-06-20 | Redesigned the About hero around the centered 3D mascot |
| `0.5.6` | 2026-06-19 | Added a public Changelog page with area summaries and filters |
| `0.5.5.1` | 2026-06-19 | Added a local development option for calling the hosted backend safely |
| `0.5.5` | 2026-06-19 | Centralized route access checks and added a routed not-found page |
| `0.5.4` | 2026-06-18 | Added admin bot runtime controls and subscription management in bot configuration |
| `0.5.3.7` | 2026-06-18 | Added clearer frontend development commands for local and hosted backend targets |
| `0.5.3.6` | 2026-06-18 | Polished shop headers, dashboard actions, and package card heights |
| `0.5.3.5` | 2026-06-18 | Reworked the shop flow with a guide page, operator dashboard, and clearer purchase summaries |
| `0.5.3.4` | 2026-06-18 | Added shop next-action cards and clearer purchase confirmation copy |
| `0.5.3.3` | 2026-06-18 | Moved admin navigation into the shop operator experience |
| `0.5.3.2` | 2026-06-18 | Added shop lifecycle guidance and improved dark-mode form readability |
| `0.5.3.1` | 2026-06-15 | Made list-style bot settings easier to edit with separate input rows |
| `0.5.3` | 2026-06-15 | Added a Review Credit panel for viewing, setting, and recounting review totals |
| `0.5.2.4` | 2026-06-15 | Added list-style bot settings so messages and reactions no longer require manual JSON |
| `0.5.2.3` | 2026-06-15 | Made admin runtime plan changes reflect correctly on the customer side |
| `0.5.2.2` | 2026-06-15 | Replaced manual runtime extension with a clearer renewal plan selector |
| `0.5.2.1` | 2026-06-15 | Simplified permanent feature subscriptions in the admin user detail page |
| `0.5.2` | 2026-06-15 | Added quick runtime extension and wallet transaction pagination to admin user details |
| `0.5.1` | 2026-06-15 | Added an admin form for creating new feature prices |
| `0.5.0.3` | 2026-06-14 | Restored legacy frontend assets for visitors with cached pages |
| `0.5.0.2` | 2026-06-14 | Improved static asset handling so missing frontend files fail clearly |
| `0.5.0.1` | 2026-06-13 | Improved admin bot transfer owner search for larger user lists |
| `0.5.0` | 2026-06-13 | Added admin bot transfer to move a bot and its settings to another user |
| `0.4.9` | 2026-06-13 | Rebuilt admin bot configuration with feature selection and a full embed editor |
| `0.4.8` | 2026-06-13 | Added editable subscription period dates for admins |
| `0.4.7.5` | 2026-06-13 | Hid main-site chrome on legacy admin pages |
| `0.4.7.4` | 2026-06-13 | Kept admin navigation inside the shop sidebar for a cleaner structure |
| `0.4.7.3` | 2026-06-13 | Added an admin-only entry to the shop sidebar |
| `0.4.7.2` | 2026-06-13 | Fixed admin pricing and subscription table typing for deployment |
| `0.4.7.1` | 2026-06-13 | Added an admin-only entry to the main navigation |
| `0.4.7` | 2026-06-13 | Added the admin dashboard with metrics and recent activity |
| `0.4.6` | 2026-06-13 | Added admin bot list and per-feature bot configuration screens |
| `0.4.5` | 2026-06-13 | Made admin user profiles editable |
| `0.4.4` | 2026-06-13 | Added admin wallet balance, adjustment, and ledger controls |
| `0.4.3` | 2026-06-13 | Added admin subscription management on the user detail page |
| `0.4.2` | 2026-06-13 | Added admin pricing tables for runtime plans and feature prices |
| `0.4.1` | 2026-06-13 | Added the first admin shell, protected routes, and user directory |
| `0.4.0.7` | 2026-06-13 | Improved shop dashboard and form contrast in light mode |
| `0.4.0.6` | 2026-06-13 | Refreshed the Wallet top-up view with clearer balance and amount controls |
| `0.4.0.5` | 2026-06-13 | Improved shared text field label contrast |
| `0.4.0.4` | 2026-06-13 | Refreshed shop package cards with clearer pricing and actions |
| `0.4.0.3` | 2026-06-13 | Renamed the dashboard feature usage column for clearer meaning |
| `0.4.0.2` | 2026-06-10 | Improved shop surface text contrast |
| `0.4.0.1` | 2026-06-10 | Refined Bot Config surfaces, spacing, tabs, and action copy |
| `0.4.0` | 2026-06-10 | Redesigned Bot Config with bot, feature, embed, and Roblox settings sections |
| `0.3.9.1` | 2026-06-10 | Fixed Embed Designer component settings for deployment checks |
| `0.3.9` | 2026-06-10 | Added component appearance editing and preview to Embed Designer |
| `0.3.8` | 2026-06-10 | Added field editing and preview to Embed Designer |
| `0.3.7.4` | 2026-06-10 | Fixed embed cloning in the Embed Designer |
| `0.3.7.3` | 2026-06-10 | Improved Embed Designer load error details |
| `0.3.7.2` | 2026-06-10 | Redirected expired Embed Designer sessions to login |
| `0.3.7.1` | 2026-06-09 | Improved Embed Designer session refresh handling |
| `0.3.7` | 2026-06-09 | Added the Embed Designer page with live Discord-style previews |
| `0.3.6` | 2026-06-09 | Added runtime countdown, auto-renew, and renew-now controls |
| `0.3.5` | 2026-06-09 | Improved bot creation with runtime plan selection, capacity, and error feedback |
| `0.3.4.1` | 2026-06-09 | Fixed shop dashboard feature table typing for deployment |
| `0.3.4` | 2026-06-08 | Refined project cards, detail layouts, and editor panels |
| `0.3.3` | 2026-06-08 | Refined portfolio layouts, gallery framing, and contact presentation |
| `0.3.2` | 2026-06-08 | Stabilized authentication callbacks and shared app chrome |
| `0.3.1` | 2026-06-08 | Added local typography assets and token documentation |
| `0.3.0` | 2026-06-08 | Connected shop views to live backend data |
| `0.2.9.5` | 2026-06-08 | Reused the default shop sidebar on the Wallet page |
| `0.2.9.4` | 2026-06-08 | Corrected Wallet sidebar navigation and labeling |
| `0.2.9.3` | 2026-06-08 | Standardized toast placement |
| `0.2.9.2` | 2026-06-08 | Aligned the Package page layout with the shop experience |
| `0.2.9.1` | 2026-06-08 | Updated feature purchasing to permanent per-bot packages |
| `0.2.9` | 2026-06-08 | Added shop package purchase cards with loading states |
| `0.2.8` | 2026-06-08 | Added the Shop Package page and purchase dialog |
| `0.2.7` | 2026-06-08 | Added dynamic bot configuration forms |
| `0.2.6.1` | 2026-06-08 | Aligned shop wallet cards with the design system |
| `0.2.6` | 2026-06-08 | Redesigned shop wallet balance, top-up, and slip verification cards |
| `0.2.5.4` | 2026-06-08 | Remembered the shop sidebar open state across pages |
| `0.2.5.3` | 2026-06-08 | Refined shop sidebar logo sizing |
| `0.2.5.2` | 2026-06-08 | Reduced shop sidebar wordmark icon size |
| `0.2.5.1` | 2026-06-08 | Refined shop sidebar theme buttons, guest state, and branding |
| `0.2.5` | 2026-06-08 | Redesigned the shop dashboard, sidebar, feature table, and runtime panels |
| `0.2.4.10` | 2026-06-08 | Cleaned authentication callback code after navigation |
| `0.2.4.9` | 2026-06-08 | Removed authentication tokens from the URL after login |
| `0.2.4.8` | 2026-06-08 | Hid app chrome on authentication pages |
| `0.2.4.7` | 2026-06-08 | Stabilized Projects data caching and featured thumbnails |
| `0.2.4.6` | 2026-06-08 | Replaced the navbar wordmark with the Fujipp icon |
| `0.2.4.5` | 2026-06-08 | Refreshed Projects data whenever the page is opened |
| `0.2.4.4` | 2026-06-08 | Aligned Project form category and status controls |
| `0.2.4.3` | 2026-06-08 | Improved Project form certificate field readability |
| `0.2.4.2` | 2026-06-08 | Matched Project timeline calendar icon color to input text |
| `0.2.4.1` | 2026-06-08 | Refined Project timeline editor sizing and icons |
| `0.2.4` | 2026-06-07 | Redesigned Project Add and Edit forms |
| `0.2.3.9` | 2026-06-07 | Improved Project Detail link labels and icon tint |
| `0.2.3.8` | 2026-06-07 | Limited Project Detail link icon tint to selected link types |
| `0.2.3.7` | 2026-06-07 | Improved Project Detail link button icon color |
| `0.2.3.6` | 2026-06-07 | Balanced Project Detail split-panel widths |
| `0.2.3.5` | 2026-06-07 | Balanced Project Detail challenges and learnings columns |
| `0.2.3.4` | 2026-06-07 | Improved Project Detail challenge formatting |
| `0.2.3.3` | 2026-06-07 | Aligned Project Detail challenge and learning text sizes |
| `0.2.3.2` | 2026-06-07 | Refined Project Detail panel headings, dividers, and hierarchy |
| `0.2.3.1` | 2026-06-07 | Rounded the shared language switch button |
| `0.2.3` | 2026-06-07 | Redesigned Project Detail gallery, controls, content panels, and editor cards |
| `0.2.2.2` | 2026-06-07 | Slowed the Projects AI card marquee |
| `0.2.2.1` | 2026-06-07 | Smoothed the Projects AI marquee and tightened featured descriptions |
| `0.2.2` | 2026-06-07 | Redesigned Projects featured cards, table, tags, and AI cards |
| `0.2.1.3` | 2026-06-07 | Strengthened the Home hero title weight |
| `0.2.1.2` | 2026-06-07 | Improved About gallery featured image framing |
| `0.2.1.1` | 2026-06-07 | Fixed About mobile education card clipping |
| `0.2.1` | 2026-06-07 | Redesigned About hero, education, and gallery sections |
| `0.2.0.8` | 2026-06-07 | Increased Contact action icon size |
| `0.2.0.7` | 2026-06-07 | Restored live Discord presence on Contact cards |
| `0.2.0.6` | 2026-06-07 | Restored Contact card open and closed states |
| `0.2.0.5` | 2026-06-07 | Redesigned Contact cards for desktop, tablet, and mobile |
| `0.2.0.4` | 2026-06-07 | Removed the Home hero title glow |
| `0.2.0.3` | 2026-06-07 | Adjusted the Home mobile project button placement |
| `0.2.0.2` | 2026-06-07 | Increased the Home mobile intro label size |
| `0.2.0.1` | 2026-06-07 | Adjusted Home mobile mascot and experience card placement |
| `0.2.0` | 2026-06-07 | Refined the Home mobile layout |
| `0.1.9` | 2026-06-07 | Updated typography tokens and font assets |
| `0.1.8` | 2026-06-05 | Added live demo and website links to project forms and detail pages |
| `0.1.7` | 2026-06-05 | Added frontend backend-target selection for development |
| `0.1.6` | 2026-06-05 | Reorganized frontend code into shared and feature areas |
| `0.1.5` | 2026-06-05 | Standardized public icon and folder naming |
| `0.1.4.2` | 2026-06-04 | Added a development command for the hosted backend |
| `0.1.4.1` | 2026-06-04 | Added production routing and HTTPS support for the single-page app |
| `0.1.4` | 2026-06-04 | Added the first shop dashboard, wallet, and sidebar |
| `0.1.3.2` | 2026-06-04 | Organized frontend views by auth, portfolio, and shop areas |
| `0.1.3.1` | 2026-06-03 | Added a Chat2Date draft recovery helper |
| `0.1.3` | 2026-06-03 | Added certificate and Google assets |
| `0.1.2.1` | 2026-06-03 | Cleaned stack configuration formatting |
| `0.1.2` | 2026-06-03 | Added project portfolio management screens |
| `0.1.1` | 2026-06-02 | Updated shared components, views, and configuration |
| `0.1.0.1` | 2026-06-01 | Saved early frontend progress |
| `0.1.0` | 2026-05-27 | Updated the footer and Contact page |
| `0.0.9` | 2026-05-26 | Updated gallery, language controls, and About page |
| `0.0.8.1` | 2026-05-26 | Added gallery image sources |
| `0.0.8` | 2026-05-26 | Added the About gallery carousel |
| `0.0.7` | 2026-05-26 | Updated the About page and localization |
| `0.0.6` | 2026-05-25 | Refined the navbar and Home page |
| `0.0.5.1` | 2026-05-24 | Synced early frontend work |
| `0.0.5` | 2026-05-24 | Added the navbar, background effect, and style refinements |
| `0.0.4` | 2026-05-24 | Added app navigation and initial views |
| `0.0.3` | 2026-05-24 | Added early app components and documentation |
| `0.0.2.1` | 2026-05-24 | Moved 3D models into the public asset folder |
| `0.0.2` | 2026-05-24 | Added initial frontend views and assets |
| `0.0.1` | 2026-05-23 | Added the Vue app scaffold |
