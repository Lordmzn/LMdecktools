# LM Deck Tools

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

A Magic: The Gathering deck builder and collection manager. Build decks, track your card collection, and see at a glance which cards you still need.

## Objective

LM Deck Tools gives MTG players a single place to manage their decks and physical card collection. Instead of juggling spreadsheets and separate apps, you can build decks, log what you own, and instantly see which cards are missing — all in the browser with no account required.

## Project Vision

LM Deck Tools is built around three non-negotiable principles that deliberately set it apart from mainstream MTG platforms:

1. **Zero Backend, Zero Cost** — There is no server. The app runs entirely in the browser using IndexedDB for storage and the Scryfall API for card data. No hosting costs, no backend maintenance, sustainable indefinitely.
2. **Absolute Privacy** — No accounts, no tracking, no data collection. Your collection and lists never leave your machine unless you explicitly export them.
3. **User-Controlled Data** — All application state is saved in a single `.yjs` file that you own. Copy it, back it up, move it between computers — no lock-in, no dependence on any external service.

Features that conflict with these principles (cloud sync, social feeds, price tracking, format legality, push notifications) are explicitly out of scope. See [`docs/project-vision.md`](docs/project-vision.md) and the Out of Scope section in [`docs/user-stories.md`](docs/user-stories.md) for details.

## Key Features

### Collection Tracking

- Search the full MTG card database via Scryfall
- Log owned cards with quantities; increment, decrement, or set exact counts
- Filter and sort by name, set, or quantity
- Search results show ownership badges so you know what you already have
- Export your collection as CSV with selectable fields, or copy to clipboard

### Card Lists

- Create, rename, and manage multiple named card lists
- Add cards from Scryfall search results; import/export in standard text format (`4 Lightning Bolt`)
- Per-card owned/missing indicators and an overall completion banner
- Toggle card matching (generic vs. exact printing) and language matching (any vs. strict)
- Compare two card lists side-by-side to spot overlap and differences
- "Add all to collection" to bulk-add every card in a list

### Data Management

- All data stored locally in IndexedDB — no server, no account
- Card images cached via the browser Cache API — instant repeat loads, no Scryfall round-trip
- Link a file on your local filesystem (Chrome/Edge/Safari 15.2+): every change writes silently to your chosen location — place it in a cloud-synced folder for "Bring Your Own Cloud" multi-device access, with no backend and no data leaving your machine
- Export/import card lists and collections as text, CSV, or JSON
- Merge imports with existing data or replace entirely

## Tech Stack

| Layer       | Technology                |
| ----------- | ------------------------- |
| Framework   | SvelteKit 2 / Svelte 5    |
| Styling     | Tailwind CSS 4            |
| Language    | TypeScript 5              |
| Storage     | IndexedDB (browser-local) |
| Card Data   | Scryfall API              |
| Image Cache | Browser Cache API         |
| i18n        | Paraglide (EN, IT)        |
| Testing     | Vitest, Playwright        |
| Build       | Vite 6, pnpm              |
| CI          | GitHub Actions            |

## Getting Started

Requires **Node 22** and **pnpm 11**, both pinned in `.tool-versions`.

```bash
# With asdf: install the pinned toolchain
asdf install

# Or with nvm (Node only, from .nvmrc) + corepack
nvm use && corepack enable

# Install dependencies
pnpm install

# Start dev server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Run tests
pnpm test             # Unit/component tests
pnpm test:e2e         # E2E tests (Playwright)
```

## Project Structure

```
src/
  lib/
    __tests__/      # Unit tests (db, yjs-integration, store)
    components/     # Reusable UI components (Card, SearchBar, Header, etc.)
    store.svelte.ts # Central state management (decks + collection)
    db.ts           # IndexedDB operations
    i18n.ts         # Internationalization
  tests/
    setup.ts        # Test setup (fake-indexeddb, jest-dom)
  routes/
    +page.svelte    # Home / landing page
    collection/     # Collection management page
    card-lists/     # Card list manager and comparison
  app.css           # Global styles
tests/
  e2e/              # Playwright E2E tests
messages/
  en.json           # English translations
  it-it.json        # Italian translations
```

## Routes

| Path                  | Description                                  |
| --------------------- | -------------------------------------------- |
| `/`                   | Home / landing page                          |
| `/collection`         | Collection management                        |
| `/card-lists`         | Card list manager                            |
| `/card-lists/compare` | Side-by-side card list comparison            |
| `/diagnostics`        | Local error journal (linked from the footer) |

Each route is prerendered to real HTML in both English (`/`) and Italian (`/it-it/`).

## Deployment

The build is a folder of static files — any file server will do. See
[`docs/deployment.md`](docs/deployment.md) for the target host, the `.htaccess`
that ships with the build, and how to verify a deploy.

## Built With

Developed with substantial assistance from [Claude Code](https://claude.ai/claude-code) by Anthropic — used for architecture design, feature implementation, code review, and documentation.

## Project Board

Active development is tracked on the [GitHub Project board](https://github.com/users/Lordmzn/projects/2).

## Support

LM Deck Tools is free and open-source. If you find it useful, consider supporting development:

- [GitHub Sponsors](https://github.com/sponsors/Lordmzn) — zero fees, directly supports the developer
- [Ko-fi](https://ko-fi.com/lordmzn) — one-time or recurring support

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
