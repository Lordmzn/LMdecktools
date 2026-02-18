# LM Deck Tools

A Magic: The Gathering deck builder and collection manager. Build decks, track your card collection, and see at a glance which cards you still need.

## Objective

LM Deck Tools gives MTG players a single place to manage their decks and physical card collection. Instead of juggling spreadsheets and separate apps, you can build decks, log what you own, and instantly see which cards are missing — all in the browser with no account required.

## Key Features

### Deck Building
- Search the full MTG card database via Scryfall
- Create, edit, and manage multiple decks
- Import/export decks in standard text format (`4 Lightning Bolt`)

### Collection Tracking
- Log owned cards with quantities
- Filter and sort by name, set, or quantity
- Import/export your full collection for backup

### Deck Completion Analysis
- Automatic cross-reference between decks and collection
- Visual indicators: cards you own, cards you need, completion status
- Search results show ownership badges so you know what you already have

### Data Management
- All data stored locally in IndexedDB — no server, no account
- Export/import decks and collections as text or JSON
- Merge imports with existing data or replace entirely

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2 / Svelte 5 |
| Styling | Tailwind CSS 4 |
| Language | TypeScript 5 |
| Storage | IndexedDB (browser-local) |
| Card Data | Scryfall API |
| i18n | Paraglide (EN, IT) |
| Testing | Vitest, Playwright |
| Build | Vite 6, pnpm |
| CI | GitHub Actions |

## Getting Started

Requires **Node 22+** (use `nvm use` to activate the version pinned in `.nvmrc`).

```bash
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
    +page.svelte    # Home / deck builder
    collection/     # Collection management page
  app.css           # Global styles
tests/
  e2e/              # Playwright E2E tests
messages/
  en.json           # English translations
  it-it.json        # Italian translations
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Home page and deck builder |
| `/collection` | Collection management |

## Built With

Developed with substantial assistance from [Claude Code](https://claude.ai/claude-code) by Anthropic — used for architecture design, feature implementation, code review, and documentation.

## License

Private project.
