# LM Deck Tools - Wireframes

## Shared Layout

```
+------------------------------------------------------------------+
|  HEADER                                                          |
|  [swords-pirate] [Home] [Collection] [Card Lists]  [3 copies] [DB]|
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

**Copy counter (planned).** Sits left of the DB button and opens the copies panel
in the DB modal. It is the app's durability promise made visible, so it is
persistent chrome rather than a notification — see `project-vision.md` §2,
Principle 3.

```
  [ 3 copies ]      normal — neutral chrome, no colour
  [ 1 copy   ]      warning state — brass, --color-warning
```

Three rules it must follow:

- **Never green, and never a checkmark.** There is no "Synced ✓" state anywhere
  in this app; the architecture cannot verify currency. The counter reports how
  many copies exist and how stale each is, and nothing more.
- **One copy is a warning**, and the alarm lane is correct here — this genuinely
  is "something is wrong", not "one of several equally-valid kinds". Dismissible
  for the session, never permanently silenceable.
- **Age is part of the reading.** The panel lists each copy with when it was last
  heard from; a copy untouched for 40 days reads as `40 days old`, not as a copy.

```
  Copies: 3
    This device        live
    MacBook            merged 2 days ago
    collection.ydelta  exported 9 days ago
```

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
- **Success green may never be used to assert sync state.** No "Synced ✓", no
  green dot on a paired device, no checkmark on a copy. This is a product
  constraint from `project-vision.md` §2 (Principle 3), not a palette preference:
  the app has no coordinator and therefore cannot know that a copy is current,
  so green would be claiming something untrue. Sync surfaces report *counts and
  ages* in neutral chrome, and escalate to the **warning** lane when only one
  copy exists. Success green keeps its ordinary job — an operation that just
  completed, like a write that landed.

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

## Pointer & Touch

The app has two input models and the layouts above describe the mouse one. The
second is not a smaller version of it — it is a different set of affordances,
selected by a media query rather than a breakpoint (#76).

**`touch:` is the variant, `(hover: none)` is the query.** Both are declared at
the top of `src/app.css`. `pointer: coarse` is the wrong test: the hazard being
guarded against is a control revealed by `:hover`, and what matters is whether
the primary input can hover at all. Tailwind v4 already wraps `hover:` and
`group-hover:` in `(hover: hover)`, so `touch:` is the other half of that pair —
**every hover-revealed control needs a `touch:` branch, or it does not exist on
a phone.** It also converges the platforms: iOS Safari synthesises a `:hover`
on first tap but still reports `(hover: none)`, so iPhone and Android take the
same branch instead of two different broken ones.

**Hidden is not the same as unreachable.** `opacity: 0` does not disable
hit-testing. Every card action in the app was once invisible *and still
tappable*, so a tap meant to inspect a card silently removed a copy from the
collection. Prefer making a control permanently visible over any tap-to-reveal
scheme: a visible control cannot be tapped blind, which fixes the hazard by
construction rather than by a state machine.

**Card overlays become static bars.** `CollectionCard`, `CardListCard` and
`Card` each render *one* control group that is `absolute inset-0` with a
gradient on a mouse and `static` under the art on touch. One DOM node, two
positions — duplicating the buttons per pointer type is how the two copies drift
apart. The collection card's three buttons are laid out as a stepper
(`−` / `2× ✎` / `+`) because a `−` and `+` flanking a live quantity are
self-describing, which two loose icon buttons are not.

**`title` is not a label.** A tooltip needs a hover to exist, so on touch it is
nothing at all. Anything whose meaning lived only in `title` carries either
visible text on touch or an `aria-label`, usually both. Two `+` buttons 40px
apart meaning "add a copy to this list" and "add this card to the collection"
was the case that forced the rule.

**44×44 on coarse pointers.** WCAG 2.5.5. Applied at the component classes
(`.btn`, `.seg`, `.field`) and via `.tap-target` for icon buttons and tabs, not
per call site, so a new control inherits it. `.btn-sm` is included — "small" is
a density choice for a mouse, and no fingertip is small enough to earn an
exception. The exemption the spec grants and this app uses is *inline*: the
footer's three links inside disclaimer sentences are sized by the line-height
of the prose around them and cannot grow without breaking the paragraph.

**`.field` goes to 16px on touch.** Not a sizing choice: below 16px iOS Safari
zooms the whole page on focus and leaves the user panned sideways in a layout
that had no horizontal overflow a moment earlier.

**`dvh`, not `vh`, for anything that must fit the screen.** Mobile Safari's `vh`
is the *expanded* viewport, taller than what is on screen while the URL bar
shows. The DB modal is a bounded flex column (`max-h-[calc(100dvh-2rem)]`,
`shrink-0` chrome, `min-h-0 flex-1` body) rather than a bounded body under an
unbounded header, which is what used to push it past both ends of an iPhone SE.

**Testing.** None of this is reachable from the default Playwright context.
`tests/e2e/mobile.spec.ts` runs under the `mobile` project (iPhone 13,
`hasTouch`) and opens with an assertion that the context really reports
`(hover: none)` — without it every touch assertion in the file would pass
vacuously.

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

The **File DB** tab is not rendered at all where the File System Access API is missing (Firefox, and every browser on iOS/macOS Safari); the In-browser DB tab says why, next to the download/restore controls that replace it there.

Planned tabs, from `docs/durability-convergence-transport.md`: **Copies** (the panel behind the header counter) and **Pair** (QR pairing). Both are described at the end of this section.

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
| Auto-save to a linked file requires desktop Chrome or    |
| Edge 86+, or Chrome on Android 132+. Safari and Firefox  |
| have never supported it, so this browser has no File DB  |
| tab. Download and restore copies here instead.           |
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

### Planned tabs

All from `docs/durability-convergence-transport.md`. Nothing here is built.

```
| === COPIES TAB ===                                       |
|                                                          |
| Copies: 3                                                |
| +------------------------------------------------------+ |
| | This device            live                          | |
| | MacBook (paired)       last heard from 2 days ago    | |
| | collection.ydelta      exported 9 days ago           | |
| +------------------------------------------------------+ |
| [ Save a copy ]  [ Pair a device ]                       |
|                                                          |
| (one-copy state — brass surface, not red, not dismissible |
|  beyond the session):                                    |
| +------------------------------------------------------+ |
| | Your collection exists in one place.  [ Save a copy ] | |
| +------------------------------------------------------+ |
|                                                          |
| -------------------------------------------------------- |
| Browser storage                                          |
|   Persistent: granted / not granted                      |
|   Using 84.2 MB of ~2.1 GB available                     |
|                                                          |
| === PAIR TAB ===                                         |
|                                                          |
| +------------------------------------------------------+ |
| |            [ QR code, 55-100 bytes ]                 | |
| |                                                      | |
| |  Or read this to the other device:                   | |
| |  [ hK3m...  80-140 chars ]         [Copy]            | |
| +------------------------------------------------------+ |
| [ Scan the other device ]                                |
|                                                          |
| Both devices need a camera, or one of you types the code. |
| Works on a shared local network only — nothing is sent    |
| through any server, so there is nothing to fall back to.  |
| One scan per session.                                     |
```

**Import preview must state the operation, not just the file.** Same bytes, two
different results, so the label carries the decision:

```
| +------------------------------------------------------+ |
| | app · version · exported_at · counts                 | |
| | From this collection  ->  MERGE                      | |
| |   Changes from the other device are applied.         | |
| |   Removals there are removals here.                  | |
| |    - or -                                            | |
| | From a different collection  ->  UNION               | |
| |   Nothing is removed. Quantities keep the higher      | |
| |   of the two. Lists are matched by name.             | |
| +------------------------------------------------------+ |
```

**Compaction** sits in the Cache tab next to "clear image cache", as a confirmed
destructive action with copy that says what it costs: it rebuilds the document
from current values, which **breaks lineage** — every other device must re-seed
from it as if it were a new database, and unsynced edits on those devices are
lost. Never automatic, never scheduled. (`persistent-ydoc.md` Decision 3.)

---

## Install Wall + Preview Mode (planned, iOS browser tab)

The most consequential planned screen: on iOS, an uninstalled browser tab shows
a **different app**. Storage there is isolated per Home Screen icon and per
browser with nothing crossing between, so data typed into the Safari tab is
invisible from the installed icon — indistinguishable from data loss. Rather
than warning about the trap, preview mode removes it: the store is in-memory and
**nothing is ever written to the browser's container**.

```
+----------------------------------------------------------+
| PREVIEW — nothing here is being saved.   [ How to install ]|
+----------------------------------------------------------+
|                                                          |
|            (the whole app, fully usable,                 |
|             running against an in-memory store)          |
|                                                          |
+----------------------------------------------------------+
```

Banner is persistent, non-dismissible, and uses the **warning** lane. "How to
install" opens:

```
+----------------------------------------------------------+
| Install LM Deck Tools                              [X]   |
|----------------------------------------------------------|
| On iPhone and iPad, a website's data is deleted after     |
| 7 days without a visit. Installing moves your collection  |
| out of that rule.                                         |
|                                                          |
|   1. Tap [share icon] Share                              |
|   2. Add to Home Screen                                  |
|   3. Open the app from its icon — not from Safari        |
|                                                          |
| Add the icon once. A second icon for the same site is a  |
| third, empty copy of the app and cannot see the first.   |
|                                                          |
| (if a third-party browser is detected — see Q6:)         |
| Your browser may not offer Add to Home Screen. Open      |
| this page in Safari first.                               |
+----------------------------------------------------------+
```

Detection: `display-mode: standalone` or `navigator.standalone` means installed
(full app, any platform); neither plus iOS means the wall. iOS itself is
`navigator.maxTouchPoints > 1` plus a platform check, since iPadOS reports
itself as a Mac.

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
