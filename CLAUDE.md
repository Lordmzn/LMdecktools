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

Requires Node 22+ (see `.nvmrc`). Use `nvm use` to switch.

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
Hand-rolled IndexedDB wrapper in `src/lib/db.ts` (raw `IDBRequest` callbacks wrapped in Promises). Database `LMdecktools` v2 with three object stores: `decks` (autoIncrement), `collection` (keyed by Scryfall card ID), `metadata` (timestamps).

### Card Data
Live Scryfall API calls (`api.scryfall.com/cards/search` and `/cards/named`). No local card database.

### Routing
SvelteKit file-based routing. Current routes: `/` (home), `/collection`. The `/decks` route is linked in nav but not yet created.

### i18n
Paraglide configured with hooks in `hooks.server.ts` (handle) and `hooks.ts` (reroute). Translation files in `messages/`. Currently only a stub `hello_world` key — i18n is wired up but not actively used in UI text.

### Yjs Integration
`src/lib/yjs-integration.ts` has CRDT-based export/import/merge utilities. Currently experimental — export uses Yjs binary format but import only handles JSON (Yjs import path is commented out).

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

## Known Issues / WIP

- Several functions in `store.svelte.ts` still reference old Svelte 4 patterns (`get()`, `.set()`) and need refactoring to Svelte 5 runes
- `Store.currentDeck` references `savedDecks` without `this.`
- `updateCollectionQuantity` references undefined `currentCollection` (should be `store.collection`)
- `handleLoadFile` in `DBSelectionModal.svelte` throws "Not implemented"
- `exportWithMetadata` has an early return before the decks section
- Deck Builder features are all planned but not yet implemented (see `docs/user-stories.md`)
