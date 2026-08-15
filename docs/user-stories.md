# LM Deck Tools - User Stories

Status legend: **[done]** = implemented | **[planned]** = not yet implemented

---

## Database Management

- **[done]** As a user, I want to check if a local database exists on launch, so that I can continue where I left off.
- **[done]** As a user, I want to load my existing local database, so that I can access my saved collection and decks.
- **[done]** As a user, I want to create a new empty database, so that I can start fresh without affecting any existing data.
- **[done]** As a user, I want to download a full copy of my database as a `.yjs` file from the In-browser DB section, so that I can manually back up my data. _(#42 — backup and restore sit together there, one click apart, in every browser.)_
- **[done]** As a user arriving with a backup file and no database at all, I want to restore from it without first creating an empty database I do not want, so that recovering on a new machine is the same two clicks as it is anywhere else. _(#42 — restore used to be gated behind an active database and behind Firefox, which closed the path entirely on Chromium.)_
- **[done]** As a user about to restore over a database that already holds something, I want to be asked first and told exactly what will be replaced, so that a misclick on a now-prominent button cannot silently erase my collection. _(#42 — restoring into an empty or absent database asks nothing, since there is nothing to lose.)_
- **[done]** As a user, I want the app to automatically load my local database on return visits after I connect it, so that I don't have to click "Connect" every session.

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

## Export (Collection Export)

- **[done]** As a user, I want to select which fields to include in my export (Count, Name, Edition, Collector #, Foil, Language, Scryfall ID) from the Export tab in the DB modal, so that I only export the data I need.
- **[done]** As a user, I want to see a live preview of my export, so that I can verify the output before downloading.
- **[done]** As a user, I want to download my collection as a CSV file that opens in a spreadsheet with one column per field, so that I can actually work with it there. _(#50 — the file is RFC 4180 CSV; it used to be space-separated text under a `.csv` name.)_
- **[done]** As a user, I want to re-import a collection file this app exported and get the same quantities back, so that "take your data anywhere" holds against our own importer. _(#50)_
- **[done]** As a user, I want to choose a plain-text export instead, so that I can paste `4 Lightning Bolt` lines into other MTG tools. _(#50)_
- **[done]** As a user, I want to copy my export to the clipboard, so that I can quickly paste it somewhere.

---

## Image Caching

- **[done]** As a user, I want card images to be cached in my browser after their first load, so that they display instantly on repeat visits without fetching from Scryfall again.
- **[done]** As a user, I want to see how much storage my image cache uses and be able to clear it, so that I can reclaim browser storage when needed.

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
- **[done]** As a user, I want to compare two card lists to see what they have in common and what differs, so that I can identify overlap.

---

## Importing Lists from Elsewhere

- **[done]** As a user, I want to import a card list by pasting text or uploading a file (plain text, `.dec`, CSV), so that I can bring in lists exported from any other tool.
- **[done]** As a user, I want to import an Archidekt deck by pasting its URL, so that I don't have to export a file first.
- **[done]** As a user, I want to be told which third-party site the app is about to contact before a URL import runs, so that I can decide whether to make that request. _(#49 — Absolute Privacy means every outbound host is disclosed; see `project-vision.md` §5.5.)_
- **[done]** As a user pasting a Moxfield deck URL, I want a clear pointer to Moxfield's own file export, so that I can migrate without the app calling an unofficial API that is blocked anyway. _(#49 — replaced the URL fetch, which failed on CORS in practice.)_

---

## Missing Cards

- **[planned]** As a user, I want a view listing every card my selected list is short of, with the number of copies missing, so that I know exactly what to acquire. _(#48 — ownership is already computed per card; this consolidates it.)_
- **[planned]** As a user, I want to copy or export the missing cards as text, so that I can take the shortfall to a shop, a proxy printer, or another tool.
- **[planned]** As a user, I want a buy link next to each missing card, so that I can acquire it in one click. _(#48 — a static affiliate deep-link; no price data, no third-party script, no request until clicked. See the carve-out under Out of Scope → Card Prices & Market.)_
- **[planned]** As a user, I want the affiliate relationship disclosed where those links appear, so that I know how the project is funded.

---

## File-Based Sync

- **[done]** As a user, I want to link a file on my local filesystem via the OS file picker (`showSaveFilePicker`), so that the app has a designated location to persist my data automatically.
- **[done]** As a user, I want every change I make (adding a card, editing a quantity, updating a list) to be saved silently to the linked file, so that my data is always up to date without any manual action.
- **[done]** As a user, I want to be asked for write permission at most once per browser session (not on every change), so that I am not interrupted by repeated permission dialogs. _(Browsers only grant file access in response to a user gesture, so the prompt cannot be raised silently: on startup the app checks the stored handle, and if the grant has lapsed it shows a "Reconnect" action. Clicking it is the gesture — the pending write is retried afterwards.)_
- **[done]** As a user, I want to see the linked file's name and the time of the last successful save displayed in the DB modal, so that I always know the current sync status. _(The File System Access API exposes only the filename to the page — the browser never reveals the file's path, by design.)_
- **[done]** As a user, I want a "Save Now" button in the DB modal, so that I can trigger a manual save whenever I want without waiting for the next automatic write.
- **[done]** As a user, I want to unlink the current file, so that auto-save stops and I return to browser-only storage without deleting any of my data.
- **[done]** As a user, I want to change the linked file (re-link to a different location), so that I can move my data file without losing the auto-save connection.
- **[done]** As a user, I want the app to detect when the linked file has been changed externally (e.g., synced from another device) and show a toast notification with "Reload" and "Ignore" options, so that I can pull in changes made elsewhere without risk of data loss.
- **[done]** As a user, I want to see a clear error state in the DB modal when the linked file can no longer be found (e.g., it was moved or deleted), so that I understand what happened and can unlink or re-link.
- **[done]** As a user, I want to see a clear error state when a write to the linked file fails mid-session (e.g., disk full, permissions revoked), so that I know my last change may not have been persisted and can act accordingly.
- **[done]** As a user on a browser without the File System Access API, I want the linking controls to be hidden rather than shown-and-broken, so that I am not offered a feature my browser cannot perform. _(#42 — the whole File DB tab is absent there, not just its buttons.)_
- **[done]** As a user, I want to see a note in the DB modal explaining that file linking requires a compatible browser (Chrome 86+, Edge 86+, Safari 15.2+) and is not available in Firefox, so that I understand why the feature is absent rather than assuming it is missing by mistake. _(#42 — the note sits next to Download copy, where the alternative to auto-save actually is.)_
- **[done]** As a user on any browser, I want to restore my database from a previously downloaded `.yjs` file, so that I can recover from data loss whether or not my browser supports auto-save. _(#42 — this was a Firefox-only fallback, so Chromium and Edge had no restore path at all.)_
- **[done]** As a user picking the wrong file to restore from, I want the app to refuse it and tell me why, so that an unrelated `.json` cannot wipe my collection and put nothing back. _(#52 — the file is validated before anything is cleared; an empty export is refused too, since erasing on purpose is what Create New Database is for.)_
- **[done]** As a user about to restore, I want to see which app and version wrote the file, when, and how much it holds, so that I can confirm it is the backup I meant before I overwrite everything. _(#52)_

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
- **[out of scope]** As a user, I want marketplace *integration* — carts, stock levels, listings, or price-driven buy decisions — so that I can trade from inside the app — _requires a priced-data feed and a third-party integration; outside project scope._ **Carve-out:** a static affiliate deep-link (a plain `<a href>` built from data the app already holds, no script, no pixel, no price lookup, no request until the user clicks) is **in scope** and is how the project funds itself — see `project-vision.md` §5.1 and the Missing Cards section above.
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
- **[out of scope]** As a user, I want my collection kept continuously in sync with an account on Moxfield, Archidekt, EDHREC or similar, so that both stay current — _requires an authenticated third-party integration; violates Zero Backend and Absolute Privacy._ One-off **deck import** from those services is a different thing and is in scope — see Importing Lists from Elsewhere.
- **[out of scope]** As a user, I want a sealed or draft simulator, so that I can practice limited formats — _outside project scope._
- **[out of scope]** As a user, I want a booster pack opening simulation, so that I can experience the excitement of opening packs — _outside project scope._
