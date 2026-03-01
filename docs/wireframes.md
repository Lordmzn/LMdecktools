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
|  (c) 2025 Lord M'zn              [About Us] [Contribute] [Contact]|
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
|  | [Filter cards...] [Sort by: Name v]  [+ Add Cards] [Export]|  |
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

```
+----------------------------------------------------------+
|                                                          |
|        Welcome to LM Deck Tools                         |
|   Choose how to start your MTG collection                |
|                                                          |
| +------------------------------------------------------+ |
| | [check/x icon]                                       | |
| | Local database found / not found                     | |
| |                                                      | |
| | (if found + not loaded):                             | |
| |   Total lists: N   Total cards: N                    | |
| |   [Use Local DB]                                     | |
| |                                                      | |
| | (if found + loaded):                                 | |
| |   Total lists: N   Total cards: N                    | |
| |   [Download local DB]                                | |
| +------------------------------------------------------+ |
|                                                          |
| +------------------------------------------------------+ |
| | [upload icon]                                        | |
| | Import from File                                     | |
| | Import a backup file. Merging is supported.          | |
| | [Choose file...  (.yjs, .json)]                      | |
| | [Import File]                                        | |
| +------------------------------------------------------+ |
|                                                          |
| +------------------------------------------------------+ |
| | [+ icon]                                             | |
| | Start from scratch                                   | |
| | Create a new empty database.                         | |
| | [Create New Database]                                | |
| +------------------------------------------------------+ |
|                                                          |
| +------------------------------------------------------+ |
| | [image icon]                                         | |
| | Image Cache                                          | |
| | Card images are cached locally for faster loading.   | |
| |                                                      | |
| | Cache size: 42 MB  (317 images cached)               | |
| | [Clear Image Cache]                                  | |
| +------------------------------------------------------+ |
|                                                          |
| +------------------------------------------------------+ |
| | [link icon]                                          | |
| | Linked File                                          | |
| |                                                      | |
| | STATE 1 — No file linked (default):                  | |
| |   Automatically save every change to a file          | |
| |   on your computer. Place it in a cloud-synced       | |
| |   folder for cross-device access with no backend.   | |
| |   [Link a File...]                                   | |
| |   Requires Chrome 86+, Edge 86+, or Safari 15.2+.   | |
| |   Not supported in Firefox.                          | |
| |                                                      | |
| | STATE 2 — Active (handle in IDB, permission granted):| |
| |   [green link icon] my-collection.yjs                | |
| |   ~/Dropbox/MTG/my-collection.yjs                    | |
| |   Last saved: 2 min ago                              | |
| |   [Save Now]  [Change File...]  [Unlink]             | |
| |                                                      | |
| | STATE 3 — Reconnect needed                           | |
| |   (handle in IDB, permission = 'prompt'):            | |
| |   [amber link icon] my-collection.yjs                | |
| |   Browser permission needed once per session.        | |
| |   [Reconnect to File]  [Unlink]                      | |
| |                                                      | |
| | STATE 4 — File not found                             | |
| |   (handle in IDB, file deleted or moved):            | |
| |   [red alert icon] File not found                    | |
| |   my-collection.yjs could not be located.            | |
| |   Your data is safe in the browser.                  | |
| |   [Unlink]                                           | |
| |                                                      | |
| | STATE 5 — Write failed (error during session write): | |
| |   [red alert icon] Last save failed: disk full       | |
| |   my-collection.yjs — ~/Dropbox/MTG/                 | |
| |   Your data is safe in the browser.                  | |
| |   [Save Now]  [Unlink]                               | |
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

## Export Modal

```
+----------------------------------------------------------+
| Export                                                    |
| Use this tool to share your collection outside this app. |
| If you need to backup, use the DB management.            |
|                                                          |
| Include Fields:                                          |
| [x] Count    [x] Name     [x] Edition    [ ] Collector # |
| [ ] Foil     [ ] Language  [ ] Scryfall ID               |
|                                                          |
| +------------------------------------------------------+ |
| | # My Collection                                      | |
| | 3  Lightning Bolt  BRO                               | |
| | 1  Counterspell    MH2                               | |
| | ...                                                  | |
| +------------------------------------------------------+ |
|                                                          |
| [Download File]   [Copy to Clipboard]   [Close]         |
+----------------------------------------------------------+
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
