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
- DB open read-only ("peek" mode): brass button `[Database v]` — `--color-warning-solid`,
  deliberately **not** the orange primary, see [Feedback Colours](#feedback-colours)

---

## Feedback Colours

The palette is slate + orange: `--color-orange-500` (`#f97316`) is the brand
accent and owns the chrome — primary buttons, active nav, focus rings, the
eyebrow labels, the rope dividers. Everything in this section is about the
colours that are *not* chrome.

Those split into **two lanes**, because they do two unrelated jobs. Deciding
which lane a new piece of UI belongs to is the whole of the design decision;
picking the hex is mechanical afterwards.

### Alarm lane — interrupts

Success, warning, danger. These are supposed to break the visual field: a failed
write, a destructive confirm, a file that needs reconnecting. Blending them into
the chrome would defeat the point, so they stay loud.

| Token | Text | Surface | Edge | Solid fill |
| --- | --- | --- | --- | --- |
| success | `#4ade80` | `#052e16` | `#166534` | `#16a34a` |
| warning | `#e4ca64` | `#2c2303` | `#5a4c14` | `#caac2f` |
| danger | `#f87171` | `#450a0a` | `#991b1b` | `#ef4444` |

Used as `text-success`, `bg-warning-surface`, `border-danger-edge`,
`bg-warning-solid` — Tailwind generates these from `@theme` in `src/app.css`.

**Why warning is brass and not amber.** The obvious choice for a warning on a
dark UI is Tailwind's amber, and that is what shipped originally. It was wrong
here: in OKLCH, `amber-600` sits **11°** from `orange-500`, and it was being used
as a *solid button fill* (the peek-mode DB button, the linked-file toast). At
that distance it does not read as a warning — it reads as a second,
slightly-wrong primary button. Brass at 95° is far enough from the brand to be
unmistakably a different thing.

The same measurement produced a less obvious result worth recording: `red-400`
is 25° from the brand and `amber-400` is 37°, so danger was *closer* to the
accent than warning was. On a warm near-black ground that made the destructive
confirm read as "hot" rather than "stop". Danger keeps its value for now — it is
attached to database operations and quieting it is a usability decision, not a
taste one — but that is the reason to revisit it, not aesthetics.

### Categorical lane — labels

Compare columns, diagnostics category chips, anything that distinguishes without
ranking. Nothing here is wrong and nothing needs attention, so **no value may
look more urgent than its neighbours.**

| Token | Value | Used for |
| --- | --- | --- |
| `cat-parchment` | `#e1c79b` | Compare "only in A"; `linked-file` errors |
| `cat-sea` | `#8adcad` | Compare "in both"; `import` errors |
| `cat-steel` | `#9bcdfc` | Compare "only in B"; `scryfall-api` errors |
| `cat-violet` | `#d0bafa` | `indexeddb` errors |
| `cat-rose` | `#fdb0b1` | `unhandled` errors |
| `cat-stone` | `#bec5cc` | `unknown` errors |

Parchment, sea and steel also carry `-surface`, `-edge` and `-solid` variants,
because the compare columns need a tinted panel and a badge fill:

| Token | Surface | Edge | Solid fill |
| --- | --- | --- | --- |
| `cat-parchment` | `#292010` | `#5a4726` | `#ccac76` |
| `cat-sea` | `#15261c` | `#2f543f` | `#61c28e` |
| `cat-steel` | `#16232f` | `#324d67` | `#6daae3` |

The other three are chip tints only and use opacity modifiers
(`bg-cat-violet/10`, `border-cat-violet/30`).

All six are built to **one recipe** — OKLCH lightness pinned at 0.83, chroma held
below the brand's own 0.187. Matched lightness is what makes them read as a set
rather than as six unrelated accents, and it is the property to preserve if the
scale ever grows. Note that the diagnostics chips are a good illustration of why
this lane exists: every entry in that journal is already an error, so tinting one
category redder than another would rank them by hue rather than by what they are.

### Rules

- **Pick the lane first.** "Is something wrong?" → alarm. "Is this one of
  several equally-valid kinds?" → categorical. A compare column holding cards you
  do not own is *not* a warning.
- **Never use a raw Tailwind hue utility** (`text-amber-400`, `bg-sky-500`) for
  either lane. The tokens exist so a retune is one edit; the diagnostics chips
  previously introduced `sky`, `emerald` and `purple` inline, and those three
  hues then existed nowhere in any token file.
- **Dark labels on solid fills.** Every `-solid` value is light enough that
  white or `slate-100` on it fails AA — this was a real bug, with the compare
  badge at 1.96:1. Use `text-slate-950`, the same rule `.btn-primary` follows.
- **Name variants for the job, not the hue.** `CompareColumn` takes
  `onlyA` / `both` / `onlyB`, not `amber` / `green` / `blue`, so the call sites
  do not start lying the next time the palette moves.

Every value above holds AA or better on all three surfaces (`#0a0c10`,
`#0f1218`, `#1a1d26`) and on its own tint background. Contrast is not the
constraint that decides anything here — hue distance from the brand is.

The tokens are defined once in `src/app.css` under `@theme` and mirrored in the
design-system skill at
`.claude/skills/LM Deck Tools Design System/tokens/colors.css`, where `--info`
and `--purple` survive as aliases into the categorical lane (both were single
tokens doing categorical work under older names).

Background and the two alternatives that were designed but not taken — a full
retune of the alarm lane, and a maritime signal-flag palette — are in issue #40.

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
| [-] [pen] [+] |   <- danger / brand / success action buttons
+----------+
```

Action-button fills are `bg-danger-solid`, the orange primary, and
`bg-success-solid`, all with `text-slate-950` labels — see
[Feedback Colours](#feedback-colours).

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
|  | ONLY IN A (parch.)| | IN BOTH (sea)   | | ONLY IN B (steel)|  |
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

**Column colours:** the three columns are categorical labels, not status — see
[Feedback Colours](#feedback-colours). They must stay matched in lightness so no
column reads as more urgent than the others; do not reach for `--color-warning`
or `--color-danger` here just because a column happens to be "missing" cards.

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
