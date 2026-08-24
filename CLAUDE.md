# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LM Deck Tools — a Magic: The Gathering deck builder and collection manager. Runs entirely in the browser (no backend); all data in IndexedDB. Card data comes from the Scryfall API.

## Commands

```bash
pnpm run dev          # Start dev server
pnpm run build        # Production build (static adapter)
pnpm run preview      # Serve production build
pnpm run check        # Type-check (svelte-kit sync + svelte-check)
pnpm run lint         # Prettier check + ESLint
pnpm run format       # Prettier --write
pnpm test             # Run unit/component tests (Vitest)
pnpm test:watch       # Vitest in watch mode
pnpm test:ui          # Vitest browser UI
pnpm test:e2e         # Playwright E2E tests (starts a dev server and, for pwa.spec.ts, a built preview)
```

Requires Node 22 and pnpm 11 (see `.tool-versions`). With [asdf](https://asdf-vm.com) installed, run `asdf install` in the repo root to get both; `.nvmrc` is kept for CI and `nvm use`.

## Tech Stack

- **SvelteKit 2 / Svelte 5** with runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`)
- **Tailwind CSS v4** (new `@import 'tailwindcss'` syntax, no tailwind.config.js)
- **TypeScript 5** with strict mode
- **Vite 6**, **pnpm** as package manager
- **@sveltejs/adapter-static** — the app is a fully static SPA
- **Paraglide** (`@inlang/paraglide-sveltekit`) for i18n (EN + IT), auto-generated runtime in `src/lib/paraglide/`
- **Vitest 4** + **@testing-library/svelte** for unit/component tests, **fake-indexeddb** for DB mocking
- **Playwright** for E2E tests (Chromium)
- **GitHub Actions** CI runs lint, type-check, unit tests, and E2E on every push/PR

## Architecture

### State Management

A singleton `Store` class in `src/lib/store.svelte.ts` using Svelte 5 class-based runes. Exported as `export const store = new Store()`. Components import `store` directly — no context API or Svelte 4 writable stores.

Since #47 the runes are **projections of the document, not the source of truth**. `store.savedCardLists` and `store.collection` are rebuilt wholesale by an observer, coalesced into a microtask, so a 300-card import is one rebuild rather than three hundred. Three rules follow, and each of them was a bug first:

- **Mutators write to the document and stop.** No assigning to `store.*`, and no `triggerAutoSave()` — the fourteen call sites collapsed into one `doc.on('update')`.
- **Mutators read the document, never the runes** (`liveLists()` / `liveCollection()` / `liveList()`). Between a write and the next microtask the runes are stale, and a mutator reading its own stale projection loses the write before it.
- **Every exported mutator is `async` and settles with the runes rebuilt.** The observer's microtask is queued inside the transaction, so it runs before the caller's continuation. One contract, not two.

`currentCardList` and the `dbLoaded` / `isReadOnly` pair are plain getters rather than `$derived`, deliberately: a `$derived` read outside a reactive owner — which is every test in this repo — keeps returning a list that has just been deleted.

### Storage Layer

**There are two databases** (#47), and forgetting the second one is the mistake this section exists to prevent:

| Database           | Holds                                                                                                                             | Written by                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `LMdecktools` (v6) | device-local state only — `metadata` (auto-load preference, linked-file handle, **document guid**), `error_journal`, `card_facts` | `src/lib/db.ts`                      |
| `lmdecktools-doc`  | the user's lists and collection, as a log of Yjs updates                                                                          | `y-indexeddb`, via `src/lib/ydoc.ts` |

Nothing in `LMdecktools` may ever sync. Everything in the document does.

`src/lib/db.ts` is the hand-rolled wrapper for the first (raw `IDBRequest` callbacks wrapped in Promises) and knows nothing about the second — `databaseExists(name)` is generic, and `localDatabaseExists()` in the store is what puts the two answers together. Anything asking "is there a database here?" goes through the store, not through `checkLocalDatabase()`.

`db.ts` is also where the storage **factory** lives (`useStorageFactory()`), which is what preview mode swaps — see Install Context & Preview Mode. Note that `y-indexeddb` reaches for the global `indexedDB` directly and ignores the factory, which is why preview mode attaches no persistence at all.

The v5 → v6 upgrade drops the `card_lists` and `collection` stores. It reads them out first (`harvestLegacyStores()` → `takeLegacySeed()`) and the store seeds the document from what it rescued: the alpha owes no backward compatibility, but "seed from scratch" and "throw the maintainer's own collection away" are not the same sentence. That code expires with the upgrade — there is no dual-write and no legacy read path.

### Install Context & Preview Mode

`src/lib/install-context.ts` decides, once per session, **which app this is** (#87): `installed` (Home Screen icon or desktop PWA — `display-mode: standalone` or `navigator.standalone`), `ios-browser` (neither, and iOS), or `browser` (everything else). iOS detection is `maxTouchPoints > 1` plus a platform check, because iPadOS reports itself as a Mac. Every function takes an injected environment so the rules are testable without a browser.

An iOS browser tab gets **preview mode**: the whole UI, fully usable, over an in-memory database that dies with the tab. This is not a nicety. Storage on iOS is isolated per browser _and per Home Screen icon_ with nothing crossing between, so a collection typed into the Safari tab is invisible from the installed app — indistinguishable from data loss, and caused by following the install instructions in the wrong order. Prompt timing cannot fix it; the only fix is that the tab never writes.

- **The seam is the factory, not the store.** `db.ts` holds a module-level `IDBFactory` (`useStorageFactory()`); preview mode swaps in `fake-indexeddb`'s, dynamically imported so only iOS visitors download it. Everything above runs unchanged — same `openDatabase()`, same v5 upgrade, same transactions. A hand-written preview store would be a second code path that drifts out of parity, which is exactly what the issue's risk note forbids.
- **Preview is impermanent, not read-only.** `dbMode` is `active`; `store.previewMode` drives the banner and nothing else. Never branch UI on it beyond that.
- **`startSession()` in `store.svelte.ts` is the only startup call**, and it detects context _before_ anything can open IndexedDB. `tryAutoLoadDB()` stays exported but is no longer called from `+layout.svelte`.
- The banner (`PreviewBanner.svelte`) is persistent and non-dismissible by design; `InstallSheet.svelte` carries the two facts detection cannot supply — add the icon **once** (a second icon is a third empty container), and open it from the icon, not the browser.
- The E2E `mobile` project uses an **Android** descriptor: an iPhone user agent now means preview mode, and that project is about pointers and pixel widths. The iOS context has its own project, `ios-browser` / `install-wall.spec.ts`.

### Card Data

Live Scryfall API calls (`api.scryfall.com/cards/search`, `/cards/named`, and `/cards/collection` for batch lookups). No local card database.

Deck **import** additionally contacts one third-party deck site on explicit user action (`src/lib/import-url.ts`): `archidekt.com/api`, exported as `URL_IMPORT_HOST` so the UI can disclose it next to the URL field before the fetch. The Moxfield fetch (`api2.moxfield.com`) was removed in #49 — it is an unofficial API, CORS-blocked in practice, so a pasted Moxfield URL now returns `moxfieldUrlMessage()` pointing at their file export instead (a function, not a constant, because the text is translated — see i18n). Any new external host must be disclosed in `docs/project-vision.md` §5.5 — the privacy claim depends on that list being exhaustive.

### Card Fields & Facts Cache

A stored card is a **whitelist**, defined once in `src/lib/card-fields.ts` (#84): `id`, `name`, `set`, `collector_number`, `lang`, `mana_cost`, `type_line`, `is_foil`, plus the one quantity the user authored (`quantity_owned` / `LM_quantity`). Everything else Scryfall returns — `image_uris`, `card_faces`, `legalities`, `prices`, `all_parts`, oracle text — is an immutable third-party fact, refetchable from `/cards/collection`, and goes to `card_facts` instead: local, never exported, outside `clearDatabase()`, the same rationale as the image cache.

This is not a style preference. Records used to carry the whole Scryfall object, once per collection entry _and_ once per list, which made a 1,000-card database a **7.1 MB** `.yjs` file that the linked-file autosave rewrote whole on every single add — 22× larger than it needed to be, and the same 22× would land on every P2P first sync under #11.

Rules that keep it that way:

- **Never spread a Scryfall object into a stored record.** Go through `toStoredCollectionCard()` / `toStoredListCard()`; they also strip Svelte proxies, so no `JSON.parse(JSON.stringify(...))` round trip is needed. `db.ts` re-applies the whitelist at the write boundary and `exportWithMetadata()` writes it field by field, so a fat record cannot reach disk even if a caller regresses — but do not lean on that.
- **Fields join the whitelist one at a time and never leave.** Under #47 each one costs ~30 B per card forever, in a document that moves in full on every sync.
- **Read facts through `cardFactsOf(card)`** (`store.svelte.ts`), never `card.image_uris`: a card fresh from a search carries its own facts, a card from the database does not. `cardSetLabel()` is the same thing for filters and sorts. `CardArt.svelte` renders the art or the name-and-printing stand-in.
- **The import path does _not_ strip.** `fromYCard()` keeps every field a file carries so `importDatabase()` / `mergeSnapshotIntoDB()` can harvest the facts of a pre-#84 backup on the way in; the write path is what drops them.
- Missing facts are refetched by `hydrateCardFacts()` after every load — batched, paced, fire-and-forget. Until it returns, those cards render as name and quantity. That is the agreed cost, and why `name` / `set` / `collector_number` are in the record at all.

### Collection Export

`src/lib/export-format.ts` holds both collection export formats as pure functions over a card array (`formatCollectionAsCSV`, `formatCollectionAsText`); `exportCollectionToCSV` / `exportCollectionToText` in `store.svelte.ts` are thin wrappers that pass `store.collection`. Keep the formatting logic in the pure module — it is the only part testable without a rune owner.

CSV is RFC 4180 (header row, comma-delimited, CRLF, quotes doubled) and its column names are deliberately the ones `import-parser.ts` resolves via `QUANTITY_ALIASES` / `NAME_ALIASES` / `SET_ALIASES` / `COLLECTOR_ALIASES` / `ID_ALIASES`, so an export re-imports without an importer change (#50) — `export-format.test.ts` asserts that round-trip. The Text format is the space-separated `4 Lightning Bolt` form with a `# My Collection` header, which only `parsePlainText()` accepts; never emit it under a `.csv` extension.

### Error Journal

`src/lib/error-journal.ts` records runtime errors in the `error_journal` store so the diagnostic context survives closing the console (#30). It must never import from `store.svelte.ts` — the dependency runs one way, which is what keeps it testable without a rune owner.

Call sites use `logAppError(category, error, context?)` from `store.svelte.ts`: it echoes to `console.error`, then writes if a DB is open. It never throws, and it deliberately does **not** call `ensureDB()` — opening IndexedDB is the user's choice, and an error is no reason to create a database behind their back. Failures a read-only DB produces by design are not journalled (the `reportFailure` helpers in `collection/+page.svelte` and `card-lists/+page.svelte` skip them) — they are a user-flow message, not a defect.

Global capture: `hooks.client.ts` (`handleError`) plus a `window.onunhandledrejection` listener in `+layout.svelte`, since SvelteKit's hook never sees rejected promises nothing awaits.

Every write prunes to `MAX_ENTRIES` (100) and `MAX_AGE_DAYS` (30). The journal is outside `clearDatabase()` and outside the yjs export payload — it is diagnostics, not user data, so restoring a backup neither wipes it nor carries it between machines.

Reporting goes through `buildGitHubIssueUrl()`, which pre-fills GitHub's issue form (body truncated to ~8000 chars). `github.com` is in the `docs/project-vision.md` §5.5 host table for that reason; the /diagnostics page shows the full body before opening the tab, so nothing leaves the device unseen.

### Feedback Colours

Non-chrome colour is tokenised in `src/app.css` under `@theme` and split into two lanes (#40) — an **alarm** lane (`--color-success` / `--color-warning` / `--color-danger`, each with `-surface` / `-edge` / `-solid`) and a **categorical** lane (`--color-cat-*`, six hues at matched OKLCH lightness for compare columns and diagnostics chips). The full rationale, the values, and the rules for picking a lane are in `docs/wireframes.md` § Feedback Colours.

Two things to know before touching any of it: **never reach for a raw Tailwind hue utility** (`text-amber-400`, `bg-sky-500`) — the tokens exist so a retune is one edit, and inline hues are exactly how `sky` / `emerald` / `purple` once ended up in the app with no token behind them. And **every `-solid` fill takes a `text-slate-950` label**, not white or `slate-100`, which fail AA on them. Warning is brass rather than amber on purpose: amber sat 11° from the brand accent in OKLCH and read as a second, wrong primary.

### Routing

SvelteKit file-based routing. Current routes: `/` (home), `/collection`, `/card-lists`, `/card-lists/compare`, `/diagnostics` (linked from the footer, not the main nav).

`src/routes/+layout.ts` sets `prerender = true` (every route is prerendered to real HTML — this is not an SPA-fallback setup) and `trailingSlash = 'always'`. The trailing slash makes the static adapter emit `collection/index.html` instead of `collection.html`, so any plain static host serves every route without rewrite rules. Don't remove it without adding host-side rewrites — `/collection` 404s on a dumb file server otherwise.

The one page that is _not_ prerendered is `404.html`, produced by `adapter({ fallback: '404.html' })`. It is a client-rendered shell: Apache's `ErrorDocument` serves it for an unknown URL, the router fails to match the path, and `+error.svelte` renders. That page handles runtime errors too, hence its two-branch copy — a 404 is the visitor's address being wrong, anything else is ours.

### Deployment & Page Metadata

Target is `https://www.lordmzn.it/decktools/` on Tophost (shared Apache) — a **subfolder of the main website**, not a subdomain, because Tophost issues certificates for the registered domain only and a subdomain gets the shared node's default certificate. HTTP was not an option: `caches`, `showSaveFilePicker` and `navigator.clipboard` are all secure-context only, so three features would vanish. Full rationale, the parent-`.htaccess` interaction, and the deploy procedure are in **`docs/deployment.md`** — read it before touching `static/.htaccess` or the deploy workflow.

**The app is served from a base path.** `pnpm run dev` and `pnpm run preview` serve it at `/decktools/` too, so that is not a deploy-only concern:

- Every internal link must be `href="{base}/..."` with `base` from `$app/paths`. A bare `href="/collection"` falls outside the base, and Paraglide then treats it as external and leaves it untranslated — it would land on the main site.
- `kit.paths.relative` is set to **`false`**, against SvelteKit's default. With the default, `base` is a relative string (`../..`) whose depth is measured from the localised URL, while Paraglide resolves links against the locale-stripped one — a segment shallower. Every Italian nav link went to the English page. Don't remove it.
- To compare the current path against a literal route, use `appRoute(i18n.route($page.url.pathname), base)` from `src/lib/site.ts`. It strips the base, the locale prefix, and the forced trailing slash — all three of which sit between `$page.url.pathname` and `/collection`.
- E2E specs navigate with **relative** targets (`./collection`); `playwright.config.ts` puts the base in `baseURL`. Anything matching a rendered `href` uses `appHref()` from `tests/e2e/base.ts`.

Three build-time constants **must stay in sync**, and `sitemap.test.ts` fails if they drift: `SITE_URL` + `BASE_PATH` in `src/lib/site.ts` (sitemap, canonical, OG tags), `kit.prerender.origin` and `kit.paths.base` in `svelte.config.js`. The `prerender.origin` one is not optional decoration: prerendering has no request to read a host from, so `url.origin` falls back to the placeholder `http://sveltekit-prerender`, and Paraglide's absolute alternate-language links were shipping it into every page's `<head>` (#25).

Absolute URLs for scrapers come from `absoluteUrl()` in `site.ts`, never from `` `${SITE_URL}${base}` `` — `base` from `$app/paths` is not an absolute path, and concatenating the two produced `https://www.lordmzn.it../../og-image.jpg`.

`static/robots.txt` deploys to `/decktools/robots.txt`, which **no crawler reads** — robots.txt is a domain-root file. It is kept as documentation; the live rules have to go in the main site's `robots.txt`.

Per-page metadata goes through `src/lib/components/PageMeta.svelte` — every route renders one, passing a translated title and description; it emits `<title>`, the description, and the `og:`/`twitter:` mirrors of both. Site-wide tags (canonical, `og:image`, `og:locale`, `twitter:card`) live in `+layout.svelte` instead, and `<link rel="alternate" hreflang>` is emitted by ParaglideJS itself — don't hand-roll those. **A new route needs three things**: a `PageMeta`, a `*_meta_title` / `*_meta_description` pair in _both_ catalogues, and an entry in `ROUTES` in `src/routes/sitemap.xml/+server.ts`. The sitemap is a prerendered endpoint rather than a file in `static/` precisely so it cannot drift from `SITE_URL`, but the route list is still manual.

`static/og-image.jpg` is rendered from `docs/og-image.html` via headless Chrome (command in `docs/deployment.md`). JPEG, not PNG — the film-grain texture costs ~500 KB as a PNG, half the weight of the whole site, against ~75 KB.

### i18n

Paraglide configured with hooks in `hooks.server.ts` (handle) and `hooks.ts` (reroute). Translation catalogues are `messages/en.json` (source) and `messages/it-it.json`; the compiled runtime under `src/lib/paraglide/` is generated by the Vite plugin and **committed**, because `pnpm run check` and CI type-check without running a build.

Every user-facing string goes through it (#39) — components import `* as m from '$lib/paraglide/messages'`. That includes the three lib modules whose messages surface in the UI (`import-guard.ts`, `import-url.ts`, `import-parser.ts`); anything they export that carries such a string must be a function, since a module-level constant would freeze whichever locale loaded first. What stays English on purpose: the CSV column _values_ in `csvFieldOptions` (they are the header the importer resolves, so a translated export must still re-import — #50), and the GitHub issue body built by `error-journal.ts` (it is addressed to the maintainer, not the user).

Key conventions: flat snake*case, prefixed by area (`home*`, `collection*`, `lists*`, `db*`, `diagnostics*`, `common\_`). The message format has no plural rules, so counted messages are split into `_\_one`/`_\_other` and the component picks — **that suffix is reserved for plural forms**, never for a message that merely says "one" (`card_add_single`, not `card_add_one`). Prose broken by inline markup is split into `\_prefix`/`\_suffix` parts rather than embedding HTML in a message.

`src/lib/__tests__/messages.test.ts` is the guard: Paraglide compiles a _missing_ key into a function returning the key name, so an untranslated string ships as `db_restore_title` on the page instead of failing the build. The test asserts both catalogues carry the same keys with the same `{placeholders}`.

Routing: English is served at `/`, Italian at `/it-it/`, and `LanguageSwitcher.svelte` (footer) is what makes the Italian tree reachable — its `hreflang` links are also what the prerender crawler follows, which is why all ten pages (5 routes × 2 locales) end up in `build/`. Drop the switcher and the Italian routes stop being prerendered. The links carry `data-sveltekit-reload` because a client-side navigation would keep the already-loaded language.

### Image Cache

The browser Cache API (`caches.open('lm-decktools-images')`) stores Scryfall image HTTP responses after their first fetch. Subsequent renders read from the cache directly, skipping the network. No service worker required — the `caches` API is available on the window in all modern browsers. There is a service worker since #89, but it is for installability and it **ignores cross-origin requests entirely**, so this cache keeps exactly one owner; see Installability below. (Also worth knowing: WebKit's ITP deletes the Cache API alongside IndexedDB after 7 idle days, so on Apple platforms this cache is a session-scale optimisation, not storage.) Cache management is exposed in the DB Selection Modal: `getImageCacheStats()` returns `{ count, bytes }`, rendered as `412 images · 86.4 MB` (#51). Sizing prefers each response's `Content-Length` and falls back to hydrating the blob, which is O(cache) — so it runs on modal open only, and the result is memoised for the session and reused while the entry count is unchanged (the cache is append-only). `clearImageCache()` drops the memo and goes through `caches.delete()`. A dedicated `src/lib/image-cache.ts` module wraps these operations.

### Installability (#89)

**The manifest and the service worker are a storage feature.** WebKit's tracking prevention deletes every script-writable store — IndexedDB and the image cache alike — after 7 days without interaction, and a week between sessions is an ordinary rhythm for a deck tool. A Home Screen web app sits outside Safari with its own days-of-use counter, and Apple documents its first-party data as not expected to be deleted, so **installing is what converts the 7-day timer into indefinite storage**. Offline support is a by-product. `docs/durability-convergence-transport.md` D3 and `docs/deployment.md` carry the rest.

Three files: `src/routes/manifest.webmanifest/+server.ts`, `src/service-worker.ts`, and `src/lib/service-worker-client.ts`, which registers it from `+layout.svelte`'s `onMount`.

- **The manifest is a prerendered endpoint, not a file in `static/`** — same rationale as `sitemap.xml`. `start_url`, `scope` and every icon path carry `BASE_PATH`, and a hand-written copy drifts silently: nothing throws, nothing logs, the install prompt just stops appearing. `manifest.test.ts` fails instead.
- **`display` must stay `standalone`** — `install-context.ts` detects the installed app with `matchMedia('(display-mode: standalone)')`, which is false under `minimal-ui` or `browser`. Weaken it and an installed Android app falls back to the browser context and preview mode's logic.
- **`id` is fixed and independent of `start_url`.** It is how the browser decides an install is _this_ app rather than a second one, and a second Home Screen icon is a third empty storage container — the failure `InstallSheet.svelte` warns about in prose.
- **The worker never touches cross-origin requests**, so `image-cache.ts` keeps one owner, and its `activate` sweep is prefix-scoped to `lm-decktools-shell-` so it cannot delete `lm-decktools-images`.
- **HTML is network-first, only content-hashed assets are cache-first.** Prerendered pages keep their filename across deploys while pointing at newly hashed assets, so a cache-first shell pins a visitor to an old build. No `skipWaiting()` either: a deploy removes the old build's chunks, so a worker taking over mid-session would 404 a running page's lazy imports.
- **Registration is manual** (`kit.serviceWorker.register: false`). SvelteKit's automatic one also fires in dev, where `$service-worker`'s `build` and `prerendered` are empty — a live fetch handler caching nothing, inside a Playwright suite that runs on `pnpm dev`. `service-worker-client.ts` returns early under `import.meta.env.DEV` for the same reason.
- **Re-caching on launch is the point, not housekeeping.** WebKit's sweep leaves the registration alive and the cache empty; nothing would refill it until a deploy changed `version`. Every launch posts a message asking.
- **The worker may only import `$service-worker` and `$env/static/public`** — a shared constant in `$lib` is a build error, which is why `RECACHE_MESSAGE` is spelled out in both files.
- `tests/e2e/pwa.spec.ts` is **the only spec that runs against the production build** (a second `webServer` in `playwright.config.ts`, port 4174, which builds first so a stale `build/` cannot pass for the current commit). Nothing here exists on the dev server.
- Icons are rendered from `docs/app-icon.html`; the command is in `docs/deployment.md`. `any` and `maskable` are separate images because a maskable icon must keep its content inside a circle of 80% diameter, and one file drawn to that margin looks shrunken everywhere that does not crop. **iOS reads `apple-touch-icon` and ignores manifest icons.**

### Persistent Storage (#88)

`src/lib/storage-persistence.ts` asks for `navigator.storage.persist()` and reads back `persisted()` + `estimate()` for the DB modal. It is the **floor, not durability**: it defends against eviction under disk pressure and against nothing else on the list — clearing browsing data, a deleted icon, a lost or replaced phone, and (undocumented either way) WebKit's 7-day timer all still take everything. Durability is a copy count (D1, #90), which is why no string here may say "your data is safe"; the modal reports the grant and the usage figure and names what the grant does not cover.

- **The request hangs off `openDocument()`'s persisting branch**, not `startSession()`. That is the moment there is something in the container worth keeping, and it is what keeps preview mode out: an iOS browser tab attaches no persistence, so a prompt there would be about a container the app refuses to write to (#87).
- **`persisted()` is checked before `persist()`.** Chromium grants silently from engagement heuristics, but on Firefox the ask is a permission prompt — one on every load is how a user learns to click Deny.
- **Never awaited, never gating.** The answer changes nothing about what the app does, and a browser without the API gets the app unchanged.
- `supported: false` in the report means the browser answers neither call, which the modal renders as _unknown_ — a different fact from _not granted_, and it must stay that way.

### The Document (#47)

`src/lib/ydoc.ts` is the data model and the transport port. One long-lived `Y.Doc` with a stable `guid`, mutated in place:

```
ydoc (guid: stable per database lineage)
├── meta          Y.Map    schema_version, app, guid, created_at
├── collection    Y.Map<scryfall_id, Y.Map>   quantity_owned + whitelist
└── card_lists    Y.Map<list_id, Y.Map>       name, matching, timestamps
                       cards: Y.Map<scryfall_id, Y.Map>  LM_quantity + whitelist
```

`docs/persistent-ydoc.md` settles the model and `docs/durability-convergence-transport.md` settles what sits on top — durability, transports, and the decision to keep Yjs at all. **Read both before changing anything here**; several attractive-looking shortcuts are refuted in them with measurements. What a change to this area has to respect:

- **The guid is stamped inside the document as well as out.** `Y.encodeStateAsUpdate()` does not carry it, so a file would otherwise have no lineage and the import guard could not tell a peer's document from a stranger's.
- **Every session mints its own `clientID`.** Never persist or share one: two tabs sharing a clientID lose data silently and order-dependently.
- **Lists are keyed by `crypto.randomUUID()`**, so a rename stays a rename rather than a delete-and-recreate — which under sync is a duplicated deck. `store.currentCardListId`, never an index: a position is not a selection once a replica can insert a list.
- **Quantities are LWW scalars, never counters.** Two devices each recording "I own 4 Bolt" yield 4, not 8. For _concurrent_ writes Yjs is not time-based at all — the higher clientID wins — so the UI must never describe sync as "the newest change wins".
- **Never spread a Scryfall object in.** Every field admitted costs ~30 B per card forever, in a payload that moves in full on every sync (see Card Fields & Facts Cache). `setIfChanged()` exists for the same reason: every `set` is an `Item` kept forever, so re-asserting an unchanged name on each quantity bump grows every future sync payload.

**The transport port (T0)** is `stateVector` / `updateFor` / `applyRemoteUpdate`, defined with the model so file semantics never leak into the store. Every transport speaks those three calls and nothing else — the linked file, the tab channel, and the peer connection of #11.

**Transport zero is the other tabs** (`src/lib/tab-sync.ts`, C2). Two tabs are one IndexedDB but two `Y.Doc`s with two `clientID`s — two replicas — and `y-indexeddb` does not bridge them: it replays once at construction and thereafter only appends. Without a channel the tabs fork and reconverge on reload, losing nothing but resolving concurrent writes by _higher clientID_ rather than by "later edit". The `BroadcastChannel` is what makes those writes causally ordered, so the app behaves the way the person using it expects. Two things it must keep doing:

- **Never re-broadcast what arrived over the channel** (`BROADCAST_ORIGIN`), or two tabs ping-pong one update forever.
- **The handshake is two-way.** A newcomer posts its state vector; every other tab answers with the difference _and its own state vector_, and the newcomer sends back whatever they lack. A one-way hello leaves the older tab missing the newcomer's history, and the next edit then arrives with a causal gap — at which point Yjs applies the delete set and holds the insert as pending, so the value does not change, it **disappears**. That was a real bug, found by test, and `doc.store.pendingStructs` is checked after every apply as the repair trigger.

**One tab owns the exclusive resources** (`src/lib/leader.ts`, C3): `navigator.locks`, exclusive, never released. The holder owns the linked-file handle and the polling, and will own the peer connection; followers edit freely and their changes reach the file through the leader over the tab channel. Leader election is for exclusive _resources_, never for a shared identity — the `clientID` stays random per session.

**Two operations, one file format.** `merge.ts` is permanent, not scaffolding:

| Payload                                               | Operation                                  | Can it remove?            |
| ----------------------------------------------------- | ------------------------------------------ | ------------------------- |
| Same guid — a replica of this database                | **merge** — `applyRemoteUpdate()`          | yes: tombstones propagate |
| Different guid — a friend's file, a compacted lineage | **union** — `merge.ts`, `max()` quantities | no, never                 |

Same bytes, different results, so **the UI has to say which** — `MergePreview.operation` drives that line in `MergePreviewModal.svelte`. Removals are reported explicitly rather than netted off: they are the one class of change the app could never produce before, so the one users will not expect.

### Restore Validation

Restoring from a file is destructive, and differently so since #47: "restore" now means **adopt the file's lineage wholesale**, guid and all, so the restored database is a replica of the one the file came from rather than a stranger holding the same values. Anything else leaves every other device unable to sync with it.

Every file goes through `src/lib/import-guard.ts` first (#52), which parses without touching IndexedDB and throws `ImportValidationError` for: a file naming another `app`, a `version` outside `SUPPORTED_VERSIONS`, a file with neither `app` metadata nor a recognisable shape (`cardLists` / `decks` / `collection`), a JSON payload whose `total_lists` / `total_cards` disagree with what decoded, a **1.0 snapshot** (refused by name — it has no lineage to adopt), and — destructive path only — a payload with zero lists _and_ zero collection cards.

Anything that reads a restore file must go through `parseImportFile()` / `assertRestorable()` rather than trusting `JSON.parse`. `ImportPayload.guid` is what the two-way classification reads; `inspectImportFile()` runs the same validation for the UI so the DB modal can show `app · version · exported_at · counts` and keep the Restore button disabled until a file passes.

## Testing

### Structure

- `src/lib/__tests__/` — unit tests for lib modules (`ydoc.test.ts`, `db.test.ts`, `store*.test.ts`)
- `src/lib/components/__tests__/` — component tests (placeholder, expand as needed)
- `tests/e2e/` — Playwright E2E tests (`db-init.spec.ts`)
- `src/tests/setup.ts` — test setup (imports `fake-indexeddb/auto` and `@testing-library/jest-dom/vitest`)

### Gotchas

- **Svelte 5 runes in tests:** `$state`/`$derived` require a reactive owner. The `Store` class cannot be instantiated directly in a plain `.test.ts` — use `@testing-library/svelte` to mount a wrapper component, or mock the module (see `store.test.ts`)
- **fake-indexeddb:** Imported in setup file. Tests that touch storage must `await closeDB()` and then `resetDatabases()` (`src/lib/__tests__/reset.ts`) in `afterEach` — **both** databases, because deleting only `LMdecktools` leaves the document's own store to be replayed into the next test. Awaiting `closeDB()` matters too: `deleteDatabase()` behind a live connection blocks silently until something times out.
- **Never open a second connection to `LMdecktools` in a test.** It blocks the `afterEach` delete, and everything after it queues behind a delete that never lands. Go through the store's own functions.
- **The document is the authority in assertions too.** After a mutator resolves the runes are rebuilt, so `store.*` is safe to read; anything asserting on what was _persisted_ decodes the update log (`persistedDocument()` in `tests/e2e/base.ts`).
- **List order is `created_at`, then id.** Two lists created in the same millisecond tie, so fixtures that care must set `created_at` explicitly — never index into `savedCardLists` expecting insertion order.
- **Paraglide imports:** Vitest uses the paraglide Vite plugin (already in `vite.config.ts`) to resolve `$paraglide/runtime` imports
- **E2E DB button:** The DB modal button requires `evaluate((btn) => btn.click())` rather than Playwright's `.click()` due to layout; see `openDBModal` helper in E2E tests
- **`pwa.spec.ts` runs against the production build**, on its own `webServer` (port 4174) that builds first — the only spec that does. There is no service worker on the dev server at all, so anything about the worker, the precache or installability belongs in that spec and nowhere else.

### Adding tests for new user stories

1. **Pure logic** (data transforms, calculations) → unit test in `src/lib/__tests__/`
2. **Component behavior** (UI interactions, prop-driven rendering) → component test in `src/lib/components/__tests__/`
3. **Full user flow** (multi-page, requires browser) → E2E test in `tests/e2e/`

## Project Tracking

Task advancement is tracked via **GitHub Issues** on [`Lordmzn/LMdecktools`](https://github.com/Lordmzn/LMdecktools) and on the [**"LM Deck Tools" GitHub Project** board](https://github.com/users/Lordmzn/projects/2). Each task maps to a GitHub issue; keep issue status current.

- Before starting a task, check if an issue already exists (`gh issue list`); if not, create one with `gh issue create`
- **Always add new issues to the project board** (`gh project item-add 2 --owner Lordmzn --url <issue-url>`)
- Reference the issue number in commit messages (e.g. `fix: resolve silent failure (#12)`)
- Keep issue status current: open issues are in progress or pending; close an issue when the work is merged
- The GitHub Project board reflects issue status — update labels/milestones as needed so the board stays accurate
- Use `gh issue view <number>` to inspect an issue before starting work
