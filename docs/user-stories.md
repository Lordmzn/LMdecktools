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

## Image Caching

- **[planned]** As a user, I want card images to be cached in my browser after their first load, so that they display instantly on repeat visits without fetching from Scryfall again.
- **[planned]** As a user, I want to see how much storage my image cache uses and be able to clear it, so that I can reclaim browser storage when needed.

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
- **[done]** As a user, I want to rename a card list by clicking its title and typing in place, so that I can correct or update the name without opening a separate dialog.
- **[done]** As a user, I want an "Add all to collection" button on the card list view, so that I can bulk-add every card in the list to my collection in one action, incrementing existing quantities.
- **[planned]** As a user, I want to compare two card lists to see what they have in common and what differs, so that I can identify overlap.

---

## File-Based Sync

- **[planned]** As a user, I want to link a file on my local filesystem via the OS file picker (`showSaveFilePicker`), so that the app has a designated location to persist my data automatically.
- **[planned]** As a user, I want every change I make (adding a card, editing a quantity, updating a list) to be saved silently to the linked file, so that my data is always up to date without any manual action.
- **[planned]** As a user, I want the app to request write permission for the linked file once per browser session (not on every change), so that I am not interrupted by repeated permission dialogs.
- **[planned]** As a user, I want to see the linked file's name, path, and the time of the last successful save displayed in the DB modal, so that I always know the current sync status.
- **[planned]** As a user, I want a "Save Now" button in the DB modal, so that I can trigger a manual save whenever I want without waiting for the next automatic write.
- **[planned]** As a user, I want to unlink the current file, so that auto-save stops and I return to browser-only storage without deleting any of my data.
- **[planned]** As a user, I want to change the linked file (re-link to a different location), so that I can move my data file without losing the auto-save connection.
- **[planned]** As a user, I want the app to detect when the linked file has been changed externally (e.g., synced from another device) and show a toast notification with "Reload" and "Ignore" options, so that I can pull in changes made elsewhere without risk of data loss.
- **[planned]** As a user, I want to see a clear error state in the DB modal when the linked file can no longer be found (e.g., it was moved or deleted), so that I understand what happened and can unlink or re-link.
- **[planned]** As a user, I want to see a clear error state when a write to the linked file fails mid-session (e.g., disk full, permissions revoked), so that I know my last change may not have been persisted and can act accordingly.
- **[planned]** As a user, I want to see a note in the DB modal that file linking requires a compatible browser (Chrome 86+, Edge 86+, Safari 15.2+) and is not available in Firefox, so that I understand why the feature may be absent in my browser.

---

## Cross-Device Sync

- **[planned]** As a user, I want to scan a QR code shown by another device running LM Deck Tools, so that the two devices can sync my collection and lists directly over a local network or WebRTC, without any data passing through a server I do not control. _(Experimental — implementation requires a lightweight signaling step and is subject to browser P2P support.)_
- **[planned]** As a user, I want CRDT-based merge semantics during a P2P sync, so that concurrent edits from both devices are reconciled without data loss and without requiring a central server to arbitrate. _(Experimental — depends on the Yjs WebRTC provider; merge behaviour for deletions and quantity changes must be validated before this story is considered done.)_

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
