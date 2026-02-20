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
- **[planned]** As a user, I want to compare two card lists to see what they have in common and what differs, so that I can identify overlap.
