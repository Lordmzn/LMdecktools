# Persistent Y.Doc as the source of truth

Design for #47. **Status: proposed.** Nothing here is implemented; this document
exists so the decisions are made once, in the open, before a change this large
starts. It settles the three open questions the RFC left (migration, quantity
semantics, document growth) and names four more the RFC did not ask but that
fall out of the same change.

Blocks #11 (P2P QR sync). Supersedes nothing — `docs/project-vision.md` §2
(Principle 3) and §4.3 describe the intended end state; this describes how to
get there.

## The gap

`project-vision.md` says Yjs is the data model. It is not. It is an export
codec.

`exportWithMetadata()` (`src/lib/yjs-integration.ts:207`) builds a **fresh**
`Y.Doc` every time it is called — on every debounced autosave, every manual
save, every backup download. Fresh document means fresh `clientID`, empty
history, no tombstones. `Y.encodeStateAsUpdate()` on it produces a file that
uses the Yjs binary encoding and carries none of the Yjs semantics.

The consequence is not subtle. Two such files are not peers, so applying one's
update to the other resolves a shared key to one side's value and drops the
other's — which is why merging was moved out to `src/lib/merge.ts` in #46 as an
explicit union, and why deletions can never propagate:

```
local: Deck B = [bolt x4] ; remote: Deck B = []  ->  merged: [bolt x4]
```

`y-webrtc` exchanges updates against a shared document history. There is no
shared document history to attach it to. P2P sync is not a feature that can be
added on top of this representation — it needs the representation changed
first.

## Target model

### Document topology

One long-lived document, one stable `guid`, mutated in place:

```
ydoc (guid: stable per database lineage)
├── meta          Y.Map    schema_version, app, created_at, seeded_from
├── collection    Y.Map<scryfall_id, Y.Map>
│                              quantity_owned  +  card facts (below)
└── card_lists    Y.Map<list_id, Y.Map>
                       name, cardMatching, languageMatching,
                       created_at, updated_at, legacy_id?
                       cards: Y.Map<scryfall_id, Y.Map>
                                   LM_quantity  +  card facts
```

Maps, not arrays, at every level. Order is not user-authored anywhere in this
app — lists render sorted, the collection renders filtered — so `Y.Array`'s
sequence CRDT would buy conflict handling for a property nobody edits, at the
cost of a heavier structure. If user-ordered lists ever ship, that list's
ordering becomes a `Y.Array` of card ids alongside the map, not a replacement
for it.

A per-card `Y.Map` rather than a plain object is the load-bearing choice: it
makes "quantity changed" a per-card operation. Today `addCardToList()` rewrites
the entire list row through `saveCardList()` (`src/lib/db.ts:177`), so two
replicas touching two different cards in one deck are a whole-row conflict. Per
card, they commute.

### What goes in the document — and what does not

**Finding, not previously recorded:** the app currently stores whole Scryfall
card objects. `addToCollection()` does `{ ...toPlainCard(card), quantity_owned }`
(`src/lib/store.svelte.ts:863`) and `addCardToList()` does the same
(`:1369`), so `image_uris`, `card_faces`, `legalities`, `prices`, `all_parts`,
`rulings_uri` and the rest land in IndexedDB and, from there, in every `.yjs`
file. `exportWithMetadata()` copies every key of every card, in every list, plus
the collection.

That is wrong in a snapshot and much worse in a CRDT. Scryfall fields are
**immutable third-party facts, not user data**: they never conflict, they never
need reconciling, and putting them in the document means every replica writes
several kilobytes of identical JSON under a different client id, forever, per
card, per list.

So the document carries only what the user authored, plus the minimum needed to
render a card without a network round-trip:

| In the document | Out of the document |
| --- | --- |
| `scryfall_id` (the key) | `image_uris`, `card_faces` |
| `quantity_owned` / `LM_quantity` | `legalities`, `prices`, `rulings_uri` |
| `name`, `set`, `collector_number`, `lang` | `all_parts`, `related_uris`, oracle text |
| `mana_cost`, `type_line` | everything else Scryfall returns |
| list `name` and matching settings | |

The right-hand column moves to a local, non-synced card-facts cache keyed by
scryfall id — the same shape as the existing image cache
(`src/lib/image-cache.ts`), and for the same reason: it is refetchable, so it is
not data worth syncing. A replica that receives a card id it has never seen
fetches the facts from Scryfall's `/cards/collection` batch endpoint, which the
app already calls.

The left-hand column is a **whitelist and must stay one**. The temptation
during implementation will be to spread the Scryfall object and be done; that is
exactly how the current bloat happened.

The whitelist is not cheap even so, which is the argument for keeping it tight.
Measured on `yjs@13.6`: 2,000 collection cards carrying exactly the six
whitelisted fields above encode to **428 KB** — about 200 bytes per card for
roughly 120 bytes of actual string content. A nested `Y.Map` charges per-field
CRDT overhead (each field is an `Item` with its own id and origin), so every
field admitted to the document costs on the order of 30 bytes per card that a
plain object would not. Fields join this list one at a time and never leave.

Cost, stated honestly: a replica that receives unknown card ids while offline
renders them as name-and-quantity until it can reach Scryfall. That is why
`name`, `set` and `collector_number` are in the document at all — enough to show
a readable list and to re-resolve the card later, not enough to render the
image.

### How much the payload actually costs

Measured against 350 real Scryfall cards (MH3 + BLB), whose median serialised
size is **5,184 bytes** each — against 131 bytes for the same card whitelisted.
Run through the real `exportWithMetadata()`, not a reconstruction of it:

| Document | Today's payload | Whitelisted | |
| --- | --- | --- | --- |
| 1,000 collection cards + 5 decks × 60 | **7.1 MB** | 320 KB | 22× |
| 5,000 collection cards + 20 decks × 60 | **33.7 MB** | 1.5 MB | 22× |

Two things follow, and the second is the more urgent.

**This is not a future problem.** `exportWithMetadata()` is what the linked-file
autosave writes today, debounced at 500 ms, rewriting the file whole. A user with
a 1,000-card collection is writing 7 MB to disk on every single card they add or
remove, and spends 76 ms of main-thread time just building the update before the
write starts (288 ms at 5,000 cards). That is a shipped defect in the current
`.yjs` path, independent of anything in this document.

**And the fix is separable from this design.** Stripping the payload to the
whitelist plus a card-facts cache is a change to what gets written; it needs no
CRDT, no migration and no new dependency. It can ship on its own, ahead of #47,
and it is where essentially all of the size win lives. Filed as #84 for exactly
that reason — it should not wait behind a large redesign.

### Identity: lists keyed by id, not name

`cardListsToYDoc()` keys lists by name (`yCardLists.set(cardList.name, yList)`),
and so does the union in `merge.ts`. Locally, lists are keyed by an IndexedDB
`autoIncrement` number that means nothing on another machine.

Neither survives. Name-keying makes a rename indistinguishable from *delete the
old list, create a new one with the same contents* — under real sync that is a
duplicated deck, and under a concurrent rename on two replicas it is two decks.
Numeric local keys are not portable.

Lists get a `crypto.randomUUID()` id, assigned at creation, stable for life.
`name` becomes an ordinary LWW field that can be edited like any other. The old
numeric key is preserved as `legacy_id` through the migration window (see
below) and dropped with it.

Knock-on: `store.currentCardListIndex` is a positional index into
`savedCardLists` (`:119`). Once a remote replica can insert a list, a position
is not a selection — it silently reselects a different deck. It becomes
`currentCardListId: string | null`, with `currentCardList` derived by lookup.
`findCardListByName()` loses its index and becomes a scan, which is fine at this
scale and is the correct semantics anyway: names are not unique.

### Replica identity: persist the guid, never the clientID

The `guid` is document identity and **must** be persisted: the local document
and the linked file are the same logical document, and a guid mismatch is the
signal that a file comes from a foreign lineage (which matters for the merge
path below). `new Y.Doc({ guid })` takes it directly.

The `clientID` is replica identity, and the obvious-looking symmetry — one
stable id per device, stored next to the guid — is a **trap**. It was the
recommendation in the first draft of this document; measurement killed it.

`Doc`'s constructor takes no `clientID` option: it always assigns
`random.uint32()` (`yjs.cjs:463`). The property is public and writable, so
persisting one is easy to do and there is no guard against it. Two tabs of the
same browser are two `Y.Doc` instances and therefore already carry two distinct
clientIDs, which is correct — they are two replicas that can edit concurrently.
Forcing them to share one produces silent, order-dependent data loss:

```
two docs, clientID 999999 each, edited independently, both flushed to storage

  replay A then B  ->  {"bolt":4}
  replay B then A  ->  {"brainstorm":3}
  converged?           false

  control, distinct clientIDs
                   ->  {"bolt":4,"brainstorm":3}
```

The second update is discarded as already-seen, because `(client, clock)` is
supposed to be globally unique and the store has that range. Yjs itself treats a
duplicate clientID as a fault to recover from — on receiving a remote update
attributed to its own client it logs *"Changed the client-id because another
client seems to be using it"* and mints a new one (`yjs.cjs:3379`) — but that
fires only once the collision is observed over a live channel, and it does not
repair items already written under the duplicated id. Two tabs writing to
`y-indexeddb` without a live channel between them never observe it.

And the cost it was meant to avoid is not there. Measured on `yjs@13.6`, the same
2,000-card collection encoded with `Y.encodeStateAsUpdate`:

| Writing clients | Encoded document | State vector |
| --- | --- | --- |
| 1 | 428,568 B | 8 B |
| 50 | 422,629 B | 348 B |
| 300 | 415,629 B | 1,778 B |
| 1,000 | 420,683 B | 5,936 B |

The document does not grow with the client count — structs are grouped by
client, so a client costs one small group header, and that is offset by noise in
how runs merge. Only the **state vector** grows, at ~6 bytes per client, and the
state vector is a sync-handshake message, not what gets stored or written to the
linked file. Sessions that make no edits cost exactly zero: 500 read-only
sessions left a document byte-identical at 428,568 B.

So: **let every session mint its own clientID.** It is what Yjs does unaided, it
is correct under multi-tab by construction, and a decade of daily editing adds a
few KB to a handshake message. If the state vector ever becomes a measured
problem for QR-sized payloads in #11, the fix is leader election over
`navigator.locks` — one tab holds an exclusive lock and adopts the persisted id,
the others keep their random ones — not an unconditional shared id.

## Decision 1 — quantities are LWW registers, not counters

The RFC asks whether quantities should be `Y.Map` scalars (last-writer-wins) or
a counter CRDT. **Scalars.**

The case for counters is the offline-additions story: I add 2 copies at home,
you add 3 on the laptop, LWW keeps 3 and loses 2, a PN-counter gets 5.

The case against is stronger, and it is about what a quantity *means*. A
collection quantity is an assertion about a physical stack of cardboard, not an
accumulator. The common concurrent edit is not two people acquiring cards
independently — it is one person reconciling the same shelf from two devices,
or correcting the same mistake twice. A counter sums those: two devices each
recording "I own 4 Bolt" yields 8, and the user has 4. Decrements are worse.
Both devices record "traded away my 4 Bolt" and the counter reaches −4, which
clamps to 0 and then swallows the next four copies acquired. §4.3 flags
decrement semantics as needing validation; this is what it would find.

LWW is wrong in the case where the user performed two genuinely independent
acts. It is right in the case where they performed one act twice. The second is
the common one, and its failure mode (a number is stale) is recoverable by
looking at the shelf, while the counter's failure mode (a number is fabricated)
is not.

**"Last-writer-wins" is a misnomer for half of this, and the half it misnames is
the one that matters.** Measured on `yjs@13.6`:

```
two replicas that have never seen each other both set the same key

  lower clientID writes first   ->  from-HIGH
  higher clientID writes first  ->  from-HIGH

one replica sees the other's write, then overwrites it

  causally ordered              ->  the later edit, regardless of clientID
```

For *causally ordered* writes Yjs is genuinely last-writer-wins. For *concurrent*
writes it is not time-based at all: the higher clientID wins, wall-clock order is
irrelevant, and since a clientID is a random `uint32` minted per session, the
winner is arbitrary — deterministic and identical on every replica, which is what
convergence requires, but not "the most recent edit".

That does not overturn the decision — an arbitrary pick between two assertions
about one shelf is still an assertion about that shelf, and the recovery is still
to look at the shelf. It does mean the UI must never describe sync as "the newest
change wins", because for the case users will actually notice it is untrue. It
also raises the value of a live channel considerably: with one, edits become
causally ordered and the intuitive rule holds. See Decision 2.

Two supports make this liveable:

- **The union merge stays available** as an explicit, user-invoked action with
  the preview from #77 — `max()` semantics for exactly the offline-additions
  case, chosen deliberately rather than applied silently. See "merge.ts does not
  disappear" below.
- **Yjs gives LWW for free.** Zero custom CRDT code, zero custom tests, no
  bespoke convergence proof. For a solo-maintained project that is not a minor
  consideration.

Revisit if, and only if, real use produces reports of silently lost additions
during live P2P sync. The document topology does not have to change to
introduce a counter later: a per-card quantity can become a nested map without
touching list or collection structure. This is a reversible decision, which is
part of why it should be the cheap one now.

## Decision 2 — persistence via y-indexeddb, in its own database

`y-indexeddb` (`IndexeddbPersistence(name, doc)`) becomes the write path for the
document: it appends each update to an object store and periodically compacts
them into a single state. The alternative — hooking `doc.on('update')` and
rewriting `Y.encodeStateAsUpdate()` into the existing `metadata` store — is
O(document) per keystroke, which is precisely the cost the incremental append
exists to avoid. This is one of the few places where the project's usual
preference for a hand-rolled minimal dependency does not pay: the appending and
compaction are the whole value, and they are fiddly.

**Note for whoever implements it:** `y-indexeddb` opens its *own* IndexedDB
database, named after the document, separate from `LMdecktools`. That leaks into
three places that currently assume one database — `checkLocalDatabase()`
(`src/lib/db.ts:50`), `clearDatabase()` (`:122`), and whatever the DB modal
reports as "a database exists". All three need to account for both.

The hand-rolled `db.ts` does not disappear: it keeps `metadata` (auto-load
preference, linked-file handle, document guid) and `error_journal`. Those are
device-local, must not sync, and have no business in a CRDT.

### It needs a BroadcastChannel provider beside it, and that is not cosmetic

`y-indexeddb` has **no cross-tab mechanism at all**. Its source (`9.0.12`)
contains no `BroadcastChannel`, no `storage` listener and no polling: it reads
every stored update once at construction, emits `synced`, and thereafter only
appends. A second tab learns nothing until it is reloaded.

Confirmed in Chrome with two real tabs against one IndexedDB database:

| Step | Tab A | Tab B |
| --- | --- | --- |
| both loaded | clientID 26298 | clientID 59558 — distinct, as expected |
| A adds two entries | 2 entries | **0 entries**, 4.5 s later, log shows only `synced` |
| B adds its own + writes key `bolt` | 3 entries | 2 entries — fully forked |
| both reloaded | 4 entries | 4 entries — **identical** |

The good news is the second half of that table. The fork is safe: every disjoint
write from both tabs survived, and both tabs converged to byte-identical state
once storage replayed both sides. That is the CRDT doing its job, and it is
strictly better than the current code, where two tabs race on whole-row writes.

The bad news is the key both tabs wrote. It resolved to one side, silently, by
the arbitrary rule from Decision 1 — because without a live channel the two
writes are *concurrent*, not ordered. A `BroadcastChannel` provider makes them
causally ordered, at which point the later edit wins and the behaviour matches
what the user expects. So the provider is not a nicety for live-updating a second
tab; it is what converts an arbitrary conflict into an intuitive one, and it
belongs in phase 2 rather than "later".

Worth stating plainly: **two tabs mean the user is exercising the sync path on
day one**, long before #11 ships. Whatever guarantees P2P sync will need, multi-tab
needs first, and multi-tab is free to test.

## Decision 3 — growth is bounded by tombstones and replicas; compaction is explicit and breaks lineage

`Y.encodeStateAsUpdate()` encodes the full document state *including tombstones*
for everything ever deleted. With Yjs's default `gc: true` the deleted content
is collected, but the item identities that make deletion propagate correctly are
retained by design — that is what a tombstone is for, and dropping them is
dropping the feature this whole document exists to enable.

So growth has two sources that matter, and one that turns out not to:

1. **Card facts in the document.** Addressed by the whitelist above. This is by
   far the largest term today and the only one that is pure waste.
2. **Genuine tombstones** — cards removed from decks, decks deleted. Real cost
   of real functionality, and small: a tombstone is bytes, and the app deletes
   at human speed.
3. **Dead clientIDs — not a real term.** The intuition that one client per
   session accumulates in the file is wrong; see the measurements under "Replica
   identity" above. A thousand writing clients over the same content encode to
   the same size as one, and read-only sessions cost nothing at all.

With 1 fixed, 2 is not a problem worth solving and 3 does not exist, so no GC
strategy is needed for ordinary use.

For the pathological case there is one escape hatch, and it must be named
honestly rather than presented as maintenance. **Compaction means building a
fresh document from the current values** — which is exactly what
`exportWithMetadata()` does today, and it destroys lineage: the compacted
document is not a peer of any replica that came before it. Every other device
must re-seed from it as if it were a new database, and any edit made on a
replica that had not synced before the compaction is lost.

That makes it a deliberate, confirmed, rarely-needed action, sitting next to
"clear image cache" in the DB modal, with copy that says what it costs. Not
automatic, not scheduled, and not something the app should ever do on the user's
behalf. (New UI means new keys in both `messages/en.json` and
`messages/it-it.json` — see the i18n rules in `CLAUDE.md`.)

## Migration

Two artifacts exist in the wild and both must survive: local IndexedDB
databases, and `.yjs` files users have saved, linked, or emailed themselves.

### Existing IndexedDB databases

A one-off seed, run once, recorded in the document so it cannot run twice:

1. DB version 4 → 5. No schema change to the existing stores; the upgrade only
   marks the boundary.
2. On first load after the upgrade, read every row from `card_lists` and
   `collection`, and write them into a new document in a single transaction:
   lists get fresh UUIDs with the old numeric key kept as `legacy_id`, card
   fields are filtered to the whitelist, and everything filtered out is written
   to the card-facts cache so nothing needs refetching on day one.
3. Stamp `meta.seeded_from = 'indexeddb-v4'` and `meta.schema_version = 2`.
4. **Leave the v4 stores in place, unread, for one release.** They are the
   rollback path, and they cost nothing but disk. Drop them in DB version 6 once
   the document path has survived contact with real use.

Step 4 is the part that will feel unnecessary and is not. There is no server-side
backup of anyone's collection; a seeding bug discovered a week later has no other
remedy.

### Existing `.yjs` files

Files written before this change declare `metadata.version = '1.0'` and carry no
`meta` map. They have no lineage, no client identity and no tombstones, so they
can only ever be **seeds or unions, never updates**. Applying one with
`Y.applyUpdate` would be the #46 bug again, this time against a document that
matters.

The rule, therefore:

| File | Detected by | Treatment |
| --- | --- | --- |
| v1.0 snapshot | `metadata.version === '1.0'`, no `meta` map | Union via `merge.ts`, with the #77 preview |
| v2 document, same guid | `meta.schema_version === 2`, guid matches | `Y.applyUpdate` — a true merge |
| v2 document, foreign guid | guid differs | Union via `merge.ts` — a different lineage is not a peer |

The third row is the one that is easy to miss. A friend's file, or the user's own
file after a compaction, is a v2 document that is structurally valid and still
not a peer. Guid equality is the test, and it is why the guid has to be stable
and stored.

### The import guard

`src/lib/import-guard.ts` already parses without touching IndexedDB and refuses
files that would destroy a database (#52); that contract holds and gets extended
rather than replaced:

- `SUPPORTED_VERSIONS` gains the v2 document version.
- `parseImportFile()` must classify snapshot vs document vs foreign-lineage
  document — the table above — before any state is touched, so
  `inspectImportFile()` can tell the DB modal which of the three it is holding
  and the user can see whether they are about to merge or to union.
- Restore (`importDatabase(db, data, merge=false)`) is destructive today via
  `clearDatabase()`. With a document, "restore" means *adopt the file's document
  wholesale*, guid and all — replace the local lineage rather than clear stores
  and refill them. Different operation, same destructiveness, same guard.

## What changes in the app

### The store's runes become projections

Today `store.savedCardLists` and `store.collection` are `$state` arrays that
mutators assign to directly, with IndexedDB written alongside. After this, the
document is authoritative and the runes are derived from it:
`observeDeep()` → rebuild the array → assign.

Rebuilding the whole array per change is the right first implementation. At this
scale (thousands of cards) it is cheap, and incremental patching is a source of
subtle divergence bugs for a saving nobody will measure. Coalesce observer
callbacks into a microtask so a batch import fires one rebuild, and revisit only
if profiling says to — particularly on mobile, which #76 has already shown to be
the tighter constraint.

Every mutator changes shape: ~15 functions in `store.svelte.ts` that currently
write IndexedDB and then assign to `$state` instead write to the document and
let the observer do the assigning. The 14 `triggerAutoSave()` call sites collapse
into one `doc.on('update')` subscription — the document knows when it changed,
which is what the manual sprinkling was approximating.

`toPlainCard()`'s JSON round-trip stays, for a different reason: Yjs will not
accept a Svelte reactive proxy any more than IndexedDB will.

`dbMode === 'peek'` (read-only) survives as: load the document, do not attach
persistence, do not attach the file write path. `assertWritable()` is unchanged.

### `merge.ts` does not disappear

The RFC says real merges become `Y.applyUpdate` and "the merge issue disappears
by construction". That is true for same-lineage documents and only for those.
Three cases keep the explicit union alive permanently:

- v1.0 snapshot files, forever — they exist and users have them;
- foreign-lineage v2 documents (a friend's file, a post-compaction file);
- the deliberate `max()` reconciliation that Decision 1 leans on as the answer
  to LWW's failure mode.

So `merge.ts` and the #77 preview are not transitional scaffolding to be deleted
at the end. They become the *union* path, sitting beside the *sync* path, and the
UI has to be honest about which one a given file gets — the two produce
different results from the same file and the user is entitled to know which they
are getting.

### The error journal stays out

`error_journal` is diagnostics, not user data. It is already outside
`clearDatabase()` and outside the export payload, and it stays outside the
document: a synced error journal would carry one device's stack traces to
another, which is both useless and a privacy regression.

## Staging

Five phases, each landable and each leaving the app working. The dual-write
phase is what makes this safe to do at all.

| Phase | Content | Ends when |
| --- | --- | --- |
| 0 | Spike: `y-indexeddb` behaviour, multi-tab, real document sizes | **Done** — see the measurements throughout this document |
| 0.5 | Strip the Scryfall payload to the whitelist + card-facts cache (#84). **Independent of everything below**, ships on its own | `.yjs` files shrink ~22×; autosave stops writing megabytes |
| 1 | Document module, schema, stable guid, seed migration. Document is written but **nothing reads it** — a shadow of IndexedDB | Tests assert the document and the stores agree after every operation |
| 2 | Flip reads: runes derive from the document, mutators write to it. `BroadcastChannel` provider alongside `y-indexeddb`. IndexedDB card stores become legacy | The app runs entirely off the document, and two tabs stay in step |
| 3 | File path writes the real document; import guard learns the three-way classification; union path kept and labelled | A file round-trips with lineage intact and deletions propagate |
| 4 | DB v6 drops the legacy stores | — |

Phase 0.5 is new, and it is the one to do first regardless of whether the rest of
this document is ever built. It carries most of the practical benefit, none of
the risk, and it is currently a live defect.

Phase 1's "shadow" is the whole safety argument: the migration and the document
model get exercised against real user data for a release without being able to
break anything, because nothing reads them yet.

#11 unblocks at the end of phase 3.

## Risks

- **No rollback after phase 4.** Users' own `.yjs` backups are the only remedy,
  which is an argument for making the DB modal nag about a backup before the
  phase 1 upgrade runs.
- **Mobile memory.** A document held live plus derived arrays is more resident
  state than reading rows on demand. #76 established mobile as a real target;
  this should be measured on a phone, not assumed.
- **File writes are already O(document) per change** and stay that way — the
  linked-file path rewrites the whole file. Growth control (Decision 3) is what
  keeps that acceptable, which makes the whitelist load-bearing for autosave
  latency and not only for disk.
- **Scope.** This touches the store, the DB layer, the file layer, the import
  guard, the merge path and the DB modal. It is not a weekend. The phase table
  is the mitigation; a single big-bang PR here would be unreviewable.

## Open questions for the spike

All three are answered; the section is kept so the answers are findable next to
the questions that produced them.

1. ~~Does `y-indexeddb` propagate between two tabs?~~ **No** — it has no
   cross-tab mechanism whatsoever, confirmed by source and by two real tabs in
   Chrome. Tabs fork and reconverge on reload with no data lost, but concurrent
   writes to one key resolve arbitrarily. A `BroadcastChannel` provider is
   required, in phase 2. See Decision 2.
2. ~~What does a realistic document weigh?~~ **7.1 MB at 1,000 cards, 33.7 MB at
   5,000** with today's payload, against 320 KB and 1.5 MB whitelisted — 22×
   either way, measured through the real `exportWithMetadata()`. It does not
   "decide whether the card-facts cache can wait": it is a current defect in the
   shipped autosave path and became phase 0.5. See "How much the payload actually
   costs".
3. ~~Can `doc.clientID` be assigned reliably after construction?~~ **Yes, and it
   must not be.** See "Replica identity: persist the guid, never the clientID".

Everything else in this document is a decision, not a question. If one of them
turns out to be wrong, amend it here with the reason — the value of writing this
down is lost if the reasoning drifts back into commit messages.

## Reproducing the measurements

Every number above came from throwaway scripts against `yjs@13.6` /
`y-indexeddb@9.0.12` and 350 real Scryfall cards, not from estimates. They are
not checked in — the method is short enough to restate, and a stale benchmark in
the tree is worse than none:

- **Document weight**: fetch two set searches from `api.scryfall.com`, synthesise
  N cards by cycling them with unique ids, feed a `{ collection, savedCardLists }`
  shape straight into the real `exportWithMetadata()`, and compare `byteLength`
  with and without the field whitelist.
- **Client count**: build one document by applying updates from N throwaway docs
  writing disjoint keys; compare `Y.encodeStateAsUpdate` and
  `Y.encodeStateVector` byte lengths across N.
- **Conflict rule**: two docs with fixed clientIDs, same key, applied in both
  orders — then the same test with one doc applying the other's update first.
- **Multi-tab**: a page holding `IndexeddbPersistence('spike-doc', doc)` and a
  button that writes a uniquely-keyed entry, opened in two tabs, with a reload at
  the end.
