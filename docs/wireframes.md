# LM Deck Tools - Wireframes

## Shared Layout

```
+------------------------------------------------------------------+
|  HEADER                                                          |
|  [swords-pirate] [Home] [Collection] [Card Lists]    [Choose DB] |
+------------------------------------------------------------------+
|                                                                  |
|                        PAGE CONTENT                              |
|                                                                  |
+------------------------------------------------------------------+
|  FOOTER                                                          |
|  (c) 2025 Lord M'zn       [GitHub] [Contribute]                  |
|                            ♥ Support: [GitHub Sponsors] [Ko-fi]   |
+------------------------------------------------------------------+
```

**Header states for DB button:**

- No DB loaded: dark button `[Choose DB v]`
- DB loaded: orange button `[Database v]` with green checkmark on icon
- DB loaded + linked file active: orange button `[Database v]` with green checkmark + small link icon

---

## Homepage (`/`)

```
+------------------------------------------------------------------+
|                                                                  |
|               Welcome to LM Deck Tools                          |
|     Build and manage your Magic: The Gathering                   |
|              decks with ease                                     |
|                                                                  |
|       [Manage Card Lists]      [Manage Collection]               |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|  +------------------+ +------------------+ +------------------+  |
|  |    (chart icon)   | |   (grid icon)    | |  (download icon) |  |
|  |   Card Lists      | | Track Collection | | Import & Export  |  |
|  |                   | |                  | |                  |  |
|  | Create and manage | | Keep track of    | | Easily import    |  |
|  | named card lists, | | which cards you  | | and export your  |  |
|  | check ownership.. | | own...           | | lists...         |  |
|  +------------------+ +------------------+ +------------------+  |
|                                                                  |
+------------------------------------------------------------------+
|                                                                  |
|                    Getting Started                               |
|                                                                  |
|  +---------------------------+ +---------------------------+     |
|  | (1) Add Cards to          | | (2) Create Card Lists     |     |
|  |     Collection            | |     Create lists by       |     |
|  |     Start by adding the   | |     searching for cards,  |     |
|  |     cards you own...      | |     check ownership...    |     |
|  +---------------------------+ +---------------------------+     |
|  +---------------------------+ +---------------------------+     |
|  | (3) Track Ownership       | | (4) Import & Export       |     |
|  |     See at a glance which | |     Use the import/export |     |
|  |     lists are complete... | |     features to backup... |     |
|  +---------------------------+ +---------------------------+     |
|                                                                  |
+------------------------------------------------------------------+
```

---

## Collection Page (`/collection`)

```
+------------------------------------------------------------------+
|                                                                  |
|  +------------------------------------------------------------+  |
|  | My Collection                                              |  |
|  | 42 cards (18 unique)                                       |  |
|  | [Filter cards...] [Sort by: Name v]  [+ Add Cards]         |  |
|  |--------- --------------------------------------------------|  |
|  |                                                            |  |
|  | +----------+ +----------+ +----------+ +----------+        |  |
|  | |  [img]   | |  [img]   | |  [img]   | |  [img]   |        |  |
|  | |      3x  | |      1x  | |      2x  | |      4x  |        |  |
|  | +----------+ +----------+ +----------+ +----------+        |  |
|  |                                                            |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

**Collection card hover overlay:**

```
+----------+
|  [img]   |
|      2x  |
|~~~~~~~~~~|
| [-] [pen] [+] |   <- red / orange / green action buttons
+----------+
```

**Empty states:**

- No DB: "No database selected. Click 'Choose DB' to get started."
- DB loaded, no cards: "No cards in collection yet. Click 'Add Cards' to get started."
- Filter has no matches: "No cards match your filter."

---

## Card Lists Page (`/card-lists`)

```
+------------------------------------------------------------------+
|                                                                  |
|  +------------------------------------------------------------+  |
|  | List:  [List name    v]  [Delete List]          [+ New List]  |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | List Title (editable)                                      |  |
|  | N cards (N unique)                                         |  |
|  | [Filter...] [Sort v] [Add all to collection] [+ Add] [Import] [Export] |  |
|  | Card matching: [Generic]/[Specific]  Language: [Any]/[Strict]  ✓ Owned / ✗ Missing N |  |
|  |--------- --------------------------------------------------|  |
|  |                                                            |  |
|  | +----------+ +----------+ +----------+ +----------+        |  |
|  | |  [img]   | |  [img]   | |  [img]   | |  [img]   |        |  |
|  | |      3x  | |      1x  | |      2x  | |      4x  |        |  |
|  | | ✓ Owned  | | ✗ Missing| | ✓ Owned  | | ✗ Missing|        |  |
|  | +----------+ +----------+ +----------+ +----------+        |  |
|  |                                                            |  |
|  +------------------------------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

**Ownership check params:**

- Card Matching `Generic`: any reprint of that card name in the collection counts
- Card Matching `Specific`: only the exact printing (same Scryfall ID) counts
- Language `Any`: card language is ignored when checking ownership
- Language `Strict`: collection card must have the same language as the list card

**Empty states:**

- No cards in list: "No cards in list yet. Search and add cards from the left panel."

---

## Compare Card Lists Page (`/card-lists/compare`)

```
+------------------------------------------------------------------+
|                                                                  |
|  +------------------------------------------------------------+  |
|  | [<] Compare Lists                                          |  |
|  | List A: [Deck name  v]   List B: [Deck name  v]            |  |
|  | Card matching: [Generic]/[Specific]  Language: [Any]/[Strict] [Export] |
|  | [N only in A]  [N in both]  [N only in B]                  |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  Desktop (lg+): three-column grid                                |
|  +------------------+ +------------------+ +------------------+  |
|  | ONLY IN A (amber)| | IN BOTH (green)  | | ONLY IN B (blue) |  |
|  | [img] Card  4x   | | [img] Card 2/3   | | [img] Card  1x   |  |
|  | [img] Card  1x   | | [img] Card 1/1   | | [img] Card  2x   |  |
|  +------------------+ +------------------+ +------------------+  |
|                                                                  |
|  Mobile: tab bar [Only A | Both | Only B] + single column        |
|                                                                  |
+------------------------------------------------------------------+
```

**"In Both" quantity format:** `quantityA / quantityB cardName`

**Guard state:** If fewer than 2 lists exist, show message with link back to `/card-lists`.

---

## DB Selection Modal

Five-tab toolbar: **[In-browser DB]** **[File DB]** **[Cache]** **[Import]** **[Export]**

The **File DB** tab is not rendered at all where the File System Access API is missing (Firefox); the In-browser DB tab says why, next to the download/restore controls that replace it there.

Auto-load: If the user has previously connected to the local DB, the app auto-loads it on startup (no modal needed). The preference is stored in IndexedDB metadata.

```
+----------------------------------------------------------+
|                                                          |
|        Welcome to LM Deck Tools                         |
|   Choose how to start your MTG collection                |
|                                                          |
| [In-browser DB] [File DB] [Cache] [Import] [Export]      |
|                                     <- toolbar (5 tabs)  |
|                                                          |
| === IN-BROWSER DB TAB ===                                |
|                                                          |
| (if local DB found + not yet connected):                 |
| +------------------------------------------------------+ |
| | [check icon]                                         | |
| | Local database found                                 | |
| |   Total lists: N   Total cards: N                    | |
| |   (read-only preview notice if peeking)              | |
| |   [Connect to local DB]                              | |
| +------------------------------------------------------+ |
|                                                          |
| (if DB already active):                                  |
| +------------------------------------------------------+ |
| | [check icon]                                         | |
| | Local database active                                | |
| |   Total lists: N   Total cards: N                    | |
| +------------------------------------------------------+ |
|                                                          |
| -------------------------------------------------------- |
| +------------------------------------------------------+ |
| | [download icon]                                      | |
| | Download copy                                        | |
| | Full DB (collection + all card lists). A one-off     | |
| | snapshot; File DB keeps saving itself.               | |
| | [Download .yjs file]   (disabled when no DB active)  | |
| +------------------------------------------------------+ |
| -------------------------------------------------------- |
| +------------------------------------------------------+ |
| | [restore icon]                                       | |
| | Restore from file                                    | |
| | Replaces everything stored. Always available —       | |
| | any browser, any dbMode.                             | |
| | [Choose file...  (.yjs, .json)]                      | |
| |   app · version · exported_at · counts  (preview)    | |
| | [Restore from file]                                  | |
| +------------------------------------------------------+ |
| (if !fsAccessSupported):                                 |
| Auto-save requires Chrome 86+, Edge 86+, Safari 15.2+,  |
| so this browser has no File DB tab.                      |
| -------------------------------------------------------- |
| +------------------------------------------------------+ |
| | [+ icon]                                             | |
| | Start from scratch                                   | |
| | Create a new empty database.                         | |
| | [Create New Database]                                | |
| +------------------------------------------------------+ |
|                                                          |
| === FILE DB TAB === (disabled when no DB active;         |
|                      absent when !fsAccessSupported)     |
|                                                          |
| (same linked file states as before — link/unlink/etc.)   |
|                                                          |
| === CACHE TAB ===                                        |
| +------------------------------------------------------+ |
| | [image icon]                                         | |
| | Image Cache                                          | |
| | Cached images: 317                                   | |
| | [Clear Image Cache]                                  | |
| +------------------------------------------------------+ |
|                                                          |
| === IMPORT TAB === (disabled when no DB active)          |
| (card import from File/Paste/URL into Collection or List)|
|                                                          |
| === EXPORT TAB === (disabled when no DB active)          |
| +------------------------------------------------------+ |
| | Export your collection as CSV.                       | |
| | Include Fields:                                      | |
| | [x] Count  [x] Name  [x] Edition  [ ] Collector #   | |
| | [ ] Foil   [ ] Language  [ ] Scryfall ID             | |
| | +--------------------------------------------------+ | |
| | | # My Collection                                  | | |
| | | 3  Lightning Bolt  BRO                           | | |
| | | 1  Counterspell    MH2                           | | |
| | +--------------------------------------------------+ | |
| | [Download File]  [Copy to Clipboard]                 | |
| +------------------------------------------------------+ |
|                                                          |
| Note: You can always export or import your data later.   |
+----------------------------------------------------------+
```

---

## Add Cards to Collection Modal

```
+----------------------------------------------------------+
| Add Cards to Collection                            [X]   |
|----------------------------------------------------------|
|                                                          |
| [magnifier] [Search for cards...         ] [Search]      |
|                                         [unique | all prints] |
|             12 results found                             |
|                                                          |
| +----------+ +----------+ +----------+ +----------+     |
| | [img]    | | [img]    | | [img]    | | [img]    |     |
| |   Own: 3 | |          | |   Own: 1 | |          |     |
| |~~~~~~~~~~| |~~~~~~~~~~| |~~~~~~~~~~| |~~~~~~~~~~|     |
| | [+ Add to Collection] | | [+ Add to Collection] |     |
| +----------+ +----------+ +----------+ +----------+     |
|                                                          |
+----------------------------------------------------------+
```

**Empty state (no search yet):**

```
|             [magnifier icon]                             |
|        Search for cards to add to your list              |
|          Learn Scryfall syntax (link)                    |
```

---

## Edit Quantity Mini-Modal

```
+------------------------------+
| Edit Quantity                 |
| Lightning Bolt               |
|                              |
| Quantity: [ 3        ]       |
|                              |
| [   Save   ]  [  Cancel  ]  |
+------------------------------+
```

---

## Notification Toast

```
                        +---------------------------+
                        | [check] Card added! (3x)  |
                        +---------------------------+
                              (top-right, auto-hides after 3s)
```
