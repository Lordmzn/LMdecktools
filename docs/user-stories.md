# LM Deck Tools - User Stories

Status legend: **[done]** = implemented | **[planned]** = not yet implemented

---

## Database Management

- **[done]** As a user, I want to check if a local database exists on launch, so that I can continue where I left off.
- **[done]** As a user, I want to load my existing local database, so that I can access my saved collection and decks.
- **[done]** As a user, I want to create a new empty database, so that I can start fresh without affecting any existing data.
- **[done]** As a user, I want to download my local database as a `.yjs` file, so that I can back up my data.
- **[planned]** As a user, I want to import a database from a `.yjs` or `.json` file, so that I can restore a backup or merge external data.

---

## Collection Management

- **[done]** As a user, I want to add cards from Scryfall search results to my collection, so that I can track which cards I own.
- **[done]** As a user, I want to increment a card's quantity with a single click (+1), so that I can quickly add copies.
- **[done]** As a user, I want to decrement a card's quantity with a single click (-1), so that I can quickly remove copies.
- **[done]** As a user, I want to edit a card's quantity to an exact number, so that I can correct counts without repeated clicking.
- **[done]** As a user, I want to see the total number of cards and unique cards in my collection, so that I know the size of my inventory.
- **[done]** As a user, I want to filter my collection by card name or set name, so that I can quickly find specific cards.
- **[done]** As a user, I want to sort my collection by name, quantity, or set, so that I can organize my view.
- **[done]** As a user, I want to see an ownership badge ("Own: N") on search results, so that I know which cards I already have.
- **[done]** As a user, I want to receive a toast notification when I add, remove, or update a card, so that I get feedback on my actions.

---

## Card Search

- **[done]** As a user, I want to search for cards by name using the Scryfall API, so that I can find cards to add to my collection.
- **[done]** As a user, I want to toggle between unique cards and all print versions, so that I can find the exact printing I own.
- **[done]** As a user, I want to see the number of search results, so that I know how many cards matched my query.
- **[done]** As a user, I want a link to Scryfall search syntax documentation, so that I can write advanced queries.

---

## Export

- **[done]** As a user, I want to select which fields to include in my export (Count, Name, Edition, Collector #, Foil, Language, Scryfall ID), so that I only export the data I need.
- **[done]** As a user, I want to see a live preview of my export, so that I can verify the output before downloading.
- **[done]** As a user, I want to download my collection as a CSV file, so that I can use it in spreadsheets or other tools.
- **[done]** As a user, I want to copy my export to the clipboard, so that I can quickly paste it somewhere.

---

## Navigation

- **[done]** As a user, I want to navigate between Home, Collection, and Card Lists pages via tabs, so that I can move through the app easily.
- **[done]** As a user, I want to see which tab is currently active, so that I know where I am in the app.
- **[done]** As a user, I want action buttons (Add Cards, Export) to be disabled when no database is loaded, so that I don't trigger errors.

---

## Card List Manager

- **[done]** As a user, I want to create a new named card list, so that I can start organizing cards.
- **[done]** As a user, I want to add cards to a list from Scryfall search results, so that I can build my list.
- **[done]** As a user, I want to remove cards from a list, so that I can refine its composition.
- **[done]** As a user, I want to switch between multiple saved lists, so that I can manage different card sets.
- **[done]** As a user, I want to import a card list from text, so that I can quickly load a list from the web.
- **[done]** As a user, I want to export a card list as text, so that I can share it with others.
- **[done]** As a user, I want to see a per-card owned/missing indicator, so that I know which cards I still need.
- **[done]** As a user, I want an overall "✓ Owned / ✗ Missing N" banner, so that I can see list completion at a glance.
- **[done]** As a user, I want to toggle "Card Matching" between Generic and Specific, so that I can choose whether any reprint counts or only the exact printing.
- **[done]** As a user, I want to toggle "Language Matching" between Any and Strict, so that I can decide whether language matters when checking ownership.
- **[done]** As a user, I want to delete a card list with a confirmation step, so that I can remove lists I no longer need without accidentally losing data.
- **[planned]** As a user, I want to compare two card lists to see what they have in common and what differs, so that I can identify overlap.

---

## Out of Scope

Status prefix: **[out of scope]** — these features are explicitly excluded because they conflict with the project's core principles: Zero Backend, Absolute Privacy, and User-Controlled Data (see `docs/project-vision.md`).

### User Accounts & Cloud

- **[out of scope]** As a user, I want to register an account and log in, so that my data is tied to an identity — _requires a backend; violates Zero Backend._
- **[out of scope]** As a user, I want my collection and lists to sync automatically across devices, so that I always have the latest data — _requires a backend sync service; violates Zero Backend and Absolute Privacy._
- **[out of scope]** As a user, I want my session to persist via server-side tokens, so that I stay logged in — _requires a backend session store; violates Zero Backend._

### Social Features

- **[out of scope]** As a user, I want to share my deck or list publicly so that other users can browse it — _requires a backend and public data store; violates Zero Backend and Absolute Privacy._
- **[out of scope]** As a user, I want to follow other users and see a social feed, so that I can discover decks — _requires a backend social graph; violates Zero Backend._
- **[out of scope]** As a user, I want to comment on or rate other users' decks, so that I can give feedback — _requires a backend; violates Zero Backend._
- **[out of scope]** As a user, I want a public profile page, so that others can see my collection and decks — _conflicts with Absolute Privacy._

### Card Prices & Market

- **[out of scope]** As a user, I want to see real-time or historical card prices from TCGPlayer or CardMarket, so that I know what my cards are worth — _requires a priced-data backend or third-party integration; outside project scope._
- **[out of scope]** As a user, I want to see the estimated total value of my collection, so that I can track its worth — _depends on price data; outside project scope._
- **[out of scope]** As a user, I want a marketplace link to buy or sell cards, so that I can act on price information — _requires third-party integration; outside project scope._
- **[out of scope]** As a user, I want price alerts or wish-list notifications, so that I know when a card drops in price — _requires a backend notification service; violates Zero Backend._

### Deck Legality & Competitive Analysis

- **[out of scope]** As a user, I want to check whether my deck is legal in a given format (Standard, Modern, Legacy, etc.), so that I can play competitively — _requires maintaining a live legality database; outside project scope._
- **[out of scope]** As a user, I want automated mana-curve analysis and deckbuilding suggestions, so that I can optimize my deck — _outside project scope._
- **[out of scope]** As a user, I want to see current tournament meta analysis, so that I know what decks are performing well — _requires live tournament data; outside project scope._
- **[out of scope]** As a user, I want a sideboard advisor, so that I can tune my sideboard against the meta — _depends on meta data; outside project scope._

### News & Content

- **[out of scope]** As a user, I want to see tournament results and standings, so that I can follow the competitive scene — _outside project scope._
- **[out of scope]** As a user, I want new set announcements and spoilers, so that I know what's coming — _outside project scope._
- **[out of scope]** As a user, I want a card rulings and errata feed, so that I always have the latest official rulings — _outside project scope._
- **[out of scope]** As a user, I want push notifications of any kind, so that I'm alerted to events — _requires a backend notification service; violates Zero Backend._

### Advanced Data Features

- **[out of scope]** As a user, I want my data to sync automatically between devices without manual export/import, so that I don't have to manage files — _requires a backend; violates Zero Backend and User-Controlled Data._
- **[out of scope]** As a user, I want to import my collection from Moxfield, Archidekt, EDHREC, or similar services, so that I can migrate easily — _outside project scope._
- **[out of scope]** As a user, I want a sealed or draft simulator, so that I can practice limited formats — _outside project scope._
- **[out of scope]** As a user, I want a booster pack opening simulation, so that I can experience the excitement of opening packs — _outside project scope._
