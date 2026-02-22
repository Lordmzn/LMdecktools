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
|  | 42 cards (18 unique)            [+ Add Cards]  [Export]    |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  | Your Cards         [Filter cards... ] [Sort by: Name   v]  |  |
|  |--------- --------------------------------------------------|  |
|  |                                                            |  |
|  | +----------+ +----------+ +----------+ +----------+        |  |
|  | |  [img]   | |  [img]   | |  [img]   | |  [img]   |        |  |
|  | |      3x  | |      1x  | |      2x  | |      4x  |        |  |
|  | |----------| |----------| |----------| |----------|        |  |
|  | | Card A   | | Card B   | | Card C   | | Card D   |        |  |
|  | | Set Name | | Set Name | | Set Name | | Set Name |        |  |
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
  Card Name
  Set Name
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
|  | List:  [List name    v]  [Delete List]          [+ New List]   |  |
|  | N cards (N unique)     [+ Add Cards]  [Import]  [Export]   |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |                    [Filter cards... ] [Sort by: Name   v]  |  |
|  |                                                            |  |
|  | +----------+ +----------+ +----------+ +----------+        |  |
|  | |  [img]   | |  [img]   | |  [img]   | |  [img]   |        |  |
|  | |      3x  | |      1x  | |      2x  | |      4x  |        |  |
|  | |----------| |----------| |----------| |----------|        |  |
|  | | Card A   | | Card B   | | Card C   | | Card D   |        |  |
|  | | Set Name | | Set Name | | Set Name | | Set Name |        |  |
|  | +----------+ +----------+ +----------+ +----------+        |  |
|  |                                                            |  |
|  | ✓ Owned / ✗ Missing N                                      |  |
|  |--------- --------------------------------------------------|  |
|  | Card matching: [Generic] / [Specific] Language: [Any] / [Strict] | |
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
