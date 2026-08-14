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

Hand-rolled IndexedDB wrapper in `src/lib/db.ts` (raw `IDBRequest` callbacks wrapped in Promises). Database `LMdecktools` v3 with three object stores: `card_lists` (autoIncrement; the v2 `decks` store is dropped on upgrade), `collection` (keyed by Scryfall card ID), `metadata` (key/value + timestamps — holds `autoLoadDB` and the linked-file handle).

### Card Data

Live Scryfall API calls (`api.scryfall.com/cards/search`, `/cards/named`, and `/cards/collection` for batch lookups). No local card database.

Deck **import** additionally contacts third-party deck sites on explicit user action (`src/lib/import-url.ts`): `archidekt.com/api` and `api2.moxfield.com`. The Moxfield endpoint is an unofficial API that is CORS-blocked in practice and is slated for removal (#49). Any new external host must be disclosed in `docs/project-vision.md` §5.4 — the privacy claim depends on that list being exhaustive.

### Routing

SvelteKit file-based routing. Current routes: `/` (home), `/collection`, `/card-lists`, `/card-lists/compare`.

`src/routes/+layout.ts` sets `prerender = true` (every route is prerendered to real HTML — this is not an SPA-fallback setup) and `trailingSlash = 'always'`. The trailing slash makes the static adapter emit `collection/index.html` instead of `collection.html`, so any plain static host serves every route without rewrite rules. Don't remove it without adding host-side rewrites — `/collection` 404s on a dumb file server otherwise.

### i18n

Paraglide configured with hooks in `hooks.server.ts` (handle) and `hooks.ts` (reroute). Translation files in `messages/`. Currently only a stub `hello_world` key — i18n is wired up but not actively used in UI text.

### Image Cache

The browser Cache API (`caches.open('lm-decktools-images')`) stores Scryfall image HTTP responses after their first fetch. Subsequent renders read from the cache directly, skipping the network. No service worker required — the `caches` API is available on the window in all modern browsers. Cache management is exposed in the DB Selection Modal: today `getImageCacheStats()` reports only the number of cached entries; byte-size reporting (`StorageManager.estimate()` or summing blob sizes) is still open (#51). Clearing goes through `caches.delete()`. A dedicated `src/lib/image-cache.ts` module wraps these operations.

### Yjs Integration

`src/lib/yjs-integration.ts` holds the export/import/merge utilities. Both directions are live: `exportWithMetadata()` writes the Yjs binary format, `importWithMetadata()` reads it, and `importDatabase()` sniffs JSON vs Yjs.

**These are snapshots, not a CRDT.** Every save builds a _fresh_ `Y.Doc` with fresh client IDs, so the file carries no history, no client identity, and no tombstones. Applying one snapshot doc's update to another is therefore not a merge — a key present on both sides resolves to one side's value, dropping the other's. That is why merging goes through `src/lib/merge.ts` instead (#46): an explicit union of lists by name and cards by `id`, quantities resolved to `max()`, local IndexedDB ids preserved, nothing ever cleared or deleted. Deletions consequently never propagate; real CRDT semantics require a persistent `Y.Doc` as the source of truth (#47), which is also the unstated prerequisite for the P2P sync roadmap item (#11).

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
