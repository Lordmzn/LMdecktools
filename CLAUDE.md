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
pnpm test:e2e         # Playwright E2E tests (needs dev server)
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

A singleton `Store` class in `src/lib/store.svelte.ts` using Svelte 5 class-based runes. Exported as `export const store = new Store()`. Components import `store` directly — no context API or Svelte 4 writable stores. Async functions (`initDB`, `addToCollection`, `createNewDeck`, etc.) are exported alongside and mutate `store.*` after DB operations.

### Storage Layer

Hand-rolled IndexedDB wrapper in `src/lib/db.ts` (raw `IDBRequest` callbacks wrapped in Promises). Database `LMdecktools` v4 with four object stores: `card_lists` (autoIncrement; the v2 `decks` store is dropped on upgrade), `collection` (keyed by Scryfall card ID), `metadata` (key/value + timestamps — holds `autoLoadDB` and the linked-file handle), and `error_journal` (autoIncrement, `timestamp` + `category` indexes — added in v4, see Error Journal).

### Card Data

Live Scryfall API calls (`api.scryfall.com/cards/search`, `/cards/named`, and `/cards/collection` for batch lookups). No local card database.

Deck **import** additionally contacts one third-party deck site on explicit user action (`src/lib/import-url.ts`): `archidekt.com/api`, exported as `URL_IMPORT_HOST` so the UI can disclose it next to the URL field before the fetch. The Moxfield fetch (`api2.moxfield.com`) was removed in #49 — it is an unofficial API, CORS-blocked in practice, so a pasted Moxfield URL now returns `moxfieldUrlMessage()` pointing at their file export instead (a function, not a constant, because the text is translated — see i18n). Any new external host must be disclosed in `docs/project-vision.md` §5.5 — the privacy claim depends on that list being exhaustive.

### Collection Export

`src/lib/export-format.ts` holds both collection export formats as pure functions over a card array (`formatCollectionAsCSV`, `formatCollectionAsText`); `exportCollectionToCSV` / `exportCollectionToText` in `store.svelte.ts` are thin wrappers that pass `store.collection`. Keep the formatting logic in the pure module — it is the only part testable without a rune owner.

CSV is RFC 4180 (header row, comma-delimited, CRLF, quotes doubled) and its column names are deliberately the ones `import-parser.ts` resolves via `QUANTITY_ALIASES` / `NAME_ALIASES` / `SET_ALIASES` / `COLLECTOR_ALIASES` / `ID_ALIASES`, so an export re-imports without an importer change (#50) — `export-format.test.ts` asserts that round-trip. The Text format is the space-separated `4 Lightning Bolt` form with a `# My Collection` header, which only `parsePlainText()` accepts; never emit it under a `.csv` extension.

### Error Journal

`src/lib/error-journal.ts` records runtime errors in the `error_journal` store so the diagnostic context survives closing the console (#30). It must never import from `store.svelte.ts` — the dependency runs one way, which is what keeps it testable without a rune owner.

Call sites use `logAppError(category, error, context?)` from `store.svelte.ts`: it echoes to `console.error`, then writes if a DB is open. It never throws, and it deliberately does **not** call `ensureDB()` — opening IndexedDB is the user's choice, and an error is no reason to create a database behind their back. Failures a read-only DB produces by design are not journalled (the `reportFailure` helpers in `collection/+page.svelte` and `card-lists/+page.svelte` skip them) — they are a user-flow message, not a defect.

Global capture: `hooks.client.ts` (`handleError`) plus a `window.onunhandledrejection` listener in `+layout.svelte`, since SvelteKit's hook never sees rejected promises nothing awaits.

Every write prunes to `MAX_ENTRIES` (100) and `MAX_AGE_DAYS` (30). The journal is outside `clearDatabase()` and outside the yjs export payload — it is diagnostics, not user data, so restoring a backup neither wipes it nor carries it between machines.

Reporting goes through `buildGitHubIssueUrl()`, which pre-fills GitHub's issue form (body truncated to ~8000 chars). `github.com` is in the `docs/project-vision.md` §5.5 host table for that reason; the /diagnostics page shows the full body before opening the tab, so nothing leaves the device unseen.

### Routing

SvelteKit file-based routing. Current routes: `/` (home), `/collection`, `/card-lists`, `/card-lists/compare`, `/diagnostics` (linked from the footer, not the main nav).

`src/routes/+layout.ts` sets `prerender = true` (every route is prerendered to real HTML — this is not an SPA-fallback setup) and `trailingSlash = 'always'`. The trailing slash makes the static adapter emit `collection/index.html` instead of `collection.html`, so any plain static host serves every route without rewrite rules. Don't remove it without adding host-side rewrites — `/collection` 404s on a dumb file server otherwise.

### i18n

Paraglide configured with hooks in `hooks.server.ts` (handle) and `hooks.ts` (reroute). Translation catalogues are `messages/en.json` (source) and `messages/it-it.json`; the compiled runtime under `src/lib/paraglide/` is generated by the Vite plugin and **committed**, because `pnpm run check` and CI type-check without running a build.

Every user-facing string goes through it (#39) — components import `* as m from '$lib/paraglide/messages'`. That includes the three lib modules whose messages surface in the UI (`import-guard.ts`, `import-url.ts`, `import-parser.ts`); anything they export that carries such a string must be a function, since a module-level constant would freeze whichever locale loaded first. What stays English on purpose: the CSV column _values_ in `csvFieldOptions` (they are the header the importer resolves, so a translated export must still re-import — #50), and the GitHub issue body built by `error-journal.ts` (it is addressed to the maintainer, not the user).

Key conventions: flat snake*case, prefixed by area (`home*`, `collection*`, `lists*`, `db*`, `diagnostics*`, `common\_`). The message format has no plural rules, so counted messages are split into `_\_one`/`_\_other` and the component picks — **that suffix is reserved for plural forms**, never for a message that merely says "one" (`card_add_single`, not `card_add_one`). Prose broken by inline markup is split into `\_prefix`/`\_suffix` parts rather than embedding HTML in a message.

`src/lib/__tests__/messages.test.ts` is the guard: Paraglide compiles a _missing_ key into a function returning the key name, so an untranslated string ships as `db_restore_title` on the page instead of failing the build. The test asserts both catalogues carry the same keys with the same `{placeholders}`.

Routing: English is served at `/`, Italian at `/it-it/`, and `LanguageSwitcher.svelte` (footer) is what makes the Italian tree reachable — its `hreflang` links are also what the prerender crawler follows, which is why all ten pages (5 routes × 2 locales) end up in `build/`. Drop the switcher and the Italian routes stop being prerendered. The links carry `data-sveltekit-reload` because a client-side navigation would keep the already-loaded language.

### Image Cache

The browser Cache API (`caches.open('lm-decktools-images')`) stores Scryfall image HTTP responses after their first fetch. Subsequent renders read from the cache directly, skipping the network. No service worker required — the `caches` API is available on the window in all modern browsers. Cache management is exposed in the DB Selection Modal: `getImageCacheStats()` returns `{ count, bytes }`, rendered as `412 images · 86.4 MB` (#51). Sizing prefers each response's `Content-Length` and falls back to hydrating the blob, which is O(cache) — so it runs on modal open only, and the result is memoised for the session and reused while the entry count is unchanged (the cache is append-only). `clearImageCache()` drops the memo and goes through `caches.delete()`. A dedicated `src/lib/image-cache.ts` module wraps these operations.

### Yjs Integration

`src/lib/yjs-integration.ts` holds the export/import/merge utilities. Both directions are live: `exportWithMetadata()` writes the Yjs binary format, `importWithMetadata()` reads it, and `importDatabase()` sniffs JSON vs Yjs.

**These are snapshots, not a CRDT.** Every save builds a _fresh_ `Y.Doc` with fresh client IDs, so the file carries no history, no client identity, and no tombstones. Applying one snapshot doc's update to another is therefore not a merge — a key present on both sides resolves to one side's value, dropping the other's. That is why merging goes through `src/lib/merge.ts` instead (#46): an explicit union of lists by name and cards by `id`, quantities resolved to `max()`, local IndexedDB ids preserved, nothing ever cleared or deleted. Deletions consequently never propagate; real CRDT semantics require a persistent `Y.Doc` as the source of truth (#47), which is also the unstated prerequisite for the P2P sync roadmap item (#11).

### Restore Validation

Restoring from a file is destructive — `importDatabase(db, data, merge=false)` calls `clearDatabase()`. Every file therefore goes through `src/lib/import-guard.ts` first (#52), which parses without touching IndexedDB and throws `ImportValidationError` for: a file naming another `app`, a `version` outside `SUPPORTED_VERSIONS`, a file with neither `app` metadata nor a recognisable shape (`cardLists` / `decks` / `collection`), a payload whose `total_lists` / `total_cards` disagree with what decoded, and — destructive path only — a payload with zero lists _and_ zero collection cards. `exportWithMetadata()` writes those declared counts; files from before #52 omit them and are accepted without the check.

Anything that reads a restore file must go through `parseImportFile()` / `assertRestorable()` rather than trusting `JSON.parse`. `inspectImportFile()` runs the same validation for the UI so the DB modal can show `app · version · exported_at · counts` and keep the Restore button disabled until a file passes.

## Testing

### Structure

- `src/lib/__tests__/` — unit tests for lib modules (`db.test.ts`, `yjs-integration.test.ts`, `store.test.ts`)
- `src/lib/components/__tests__/` — component tests (placeholder, expand as needed)
- `tests/e2e/` — Playwright E2E tests (`db-init.spec.ts`)
- `src/tests/setup.ts` — test setup (imports `fake-indexeddb/auto` and `@testing-library/jest-dom/vitest`)

### Gotchas

- **Svelte 5 runes in tests:** `$state`/`$derived` require a reactive owner. The `Store` class cannot be instantiated directly in a plain `.test.ts` — use `@testing-library/svelte` to mount a wrapper component, or mock the module (see `store.test.ts`)
- **fake-indexeddb:** Imported in setup file. Tests that use IndexedDB must close/delete the DB in `afterEach` to avoid state leaking between tests
- **Paraglide imports:** Vitest uses the paraglide Vite plugin (already in `vite.config.ts`) to resolve `$paraglide/runtime` imports
- **E2E DB button:** The DB modal button requires `evaluate((btn) => btn.click())` rather than Playwright's `.click()` due to layout; see `openDBModal` helper in E2E tests

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
