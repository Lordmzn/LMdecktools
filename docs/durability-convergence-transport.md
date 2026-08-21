# Durability, convergence and transport

**Status: proposed.** Companion to `docs/persistent-ydoc.md` (#47). Amends
`project-vision.md` §4.2 (wrong, see D0) and closes §4.3 / #11.

**Governing constraint: alpha, no active users.** No backward compatibility is
owed. Schema changes are breaking changes and land as such. No dual-write, no
staged cutover, no legacy stores kept alive, no v1.0 snapshot support. This
removes roughly half the work #47 scoped and reorders everything below: build on
the final schema first, then build on top of it.

---

## 1. Problem

Three problems, previously fused, in strict dependency order.

| | Question | Status |
| --- | --- | --- |
| **Durability** | Does the data exist next week? | Open |
| **Convergence** | Do two replicas that both changed agree? | Designed in #47 |
| **Transport** | How do bytes move between devices? | Open, tractable, plural |

"The most recent file" is a centralised concept: it presumes a total order over
states, and a total order requires a coordinator. There is no coordinator. The
question stops being asked. What replaces it: a device is never *wrong*, only
*behind*, and "behind" is monotonic and self-repairing.

---

## 2. Durability

### D0 — Correct the browser-support claim

Safari 15.2 shipped the **Origin Private File System** — a sandbox the user
cannot see. It did not ship the pickers, and they remain absent on macOS,
iPadOS and iOS. Firefox has never shipped them. Chrome for Android *did* ship
them, in 132 (January 2025).

| | Chrome desk | Safari desk | Firefox desk | iPhone | Android |
| --- | --- | --- | --- | --- | --- |
| `showSaveFilePicker` | 86+ | — | — | — | 132+ ¹ |
| `showDirectoryPicker` | 86+ | — | — | — | 132+ ¹ |

¹ Shipped, and degraded. Android backs handles with content URIs, which have
**no atomic write and no rename**. The Intent to Ship also records that MIME
filters are ignored and that *save-as cannot create new files, only select
existing ones* — which is precisely what T3 asks of it. Treat the Android
column as unverified until it is measured on a device (Q8).

**"Bring Your Own Cloud" has never run on an iPhone.** On Android it runs as
far as that caveat allows and no further.

An earlier draft of this section called the API desktop-Chromium-only. That was
wrong, and the correction matters: with Android in scope the phone is not
necessarily a pure replica, and S1's anchor/replica split is a durability
argument rather than a capability one.

The last surviving instance of the old "Safari 15.2+" claim is
`db_no_fs_access` in `messages/en.json` and `messages/it-it.json` — the only
user-visible one, and M0's first fix. The docs in this repo were corrected when
this document landed; `project-vision.md` §4.2 had already been corrected
in #58.

### D1 — Durability is a copy count, not a storage setting

`navigator.storage.persist()` defends against eviction under disk pressure.
That is not what kills collections.

| Threat | `persist()` | Native app |
| --- | --- | --- |
| Eviction under disk pressure | yes | yes |
| Safari 7-day ITP timer | undocumented | yes |
| User clears browsing data | **no** | yes |
| User deletes the icon / uninstalls | **no** | **no** |
| Device lost, stolen, reset | **no** | **no** |
| User buys a new phone | **no** | **no** |

Half of these are unaddressable by any storage API on any platform. Single-device
storage is not durable and cannot be made so. Native apps appear durable because
they borrow durability from a cloud backend (refused by §2 Principle 1) or from
platform backup (available without going native).

**Durability is the number of independent copies.** That is the only promise this
architecture can keep:

> Your data exists in as many places as you have put it. The app reports how
> many, and how old each is, and never lets you reach one by accident.

**The copy-count invariant:**

```
Copies: 3
  This device        live
  MacBook            merged 2 days ago
  collection.ydelta  exported 9 days ago
```

```
Copies: 1
Your collection exists in one place.   [ Save a copy ]
```

- **First-run gate.** After the first meaningful import — a decklist, 50 cards —
  require a second copy before the session ends. A file in Downloads counts. A
  paired device counts. A step, not a settings page.
- **Count and age in the header.** A copy nobody refreshed in 40 days is reported
  as 40 days old, not as a copy.
- **One copy is a warning state.** Persistent, dismissible per session, never
  permanently silenced.
- **Never "Synced ✓".** It claims currency the architecture cannot verify. "Last
  heard from" is the honest form.

### D2 — Request persistence everywhere anyway

`navigator.storage.persist()` on every load. Free on Chromium, one prompt on
Firefox, best-effort on WebKit where the grant does not survive a browser
restart. Report `persisted()` and `estimate()` in the DB modal.

A floor, not the answer. WebKit ITP deletes all script-writable storage after 7
days without interaction: IndexedDB, LocalStorage, SessionStorage, media keys,
service worker registrations and caches. Both the collection database and
`image-cache.ts` are in scope. Seven days between sessions is the median rhythm
for a deck tool.

### D3 — Ship a manifest; installation is a storage feature

Home Screen web apps sit outside Safari with their own days-of-use counter, and
Apple's tracking-prevention documentation states their first-party data is not
expected to be deleted. Installation converts the 7-day timer into indefinite
storage. That is the reason — not app-store presence.

Second payoff, Android only: `share_target` in the manifest makes the installed
app a destination in the OS share sheet. Requires a service worker with a fetch
handler. The §4.1 decision to cache images via `caches.open()` without a service
worker stands; a fetch-handler shell coexists with it.

Cost: `manifest.webmanifest`, existing icons, minimal service worker.

### D4 — On iOS, the browser context is a different app

Storage on iOS is isolated three ways: Safari has one container, each Home Screen
icon has its own, and cookies, LocalStorage and IndexedDB cross none of them.
Data entered in the Safari tab is invisible from the installed icon, which is
indistinguishable from data loss.

**Decision: do not let data enter the Safari container at all.** Detect the
context and change what the app *is*:

| Context | Detection | App shows |
| --- | --- | --- |
| Installed (any platform) | `matchMedia('(display-mode: standalone)')` **or** `navigator.standalone === true` | Full app |
| iOS browser tab | neither, and iOS detected | **Install wall + preview mode** |
| Other browsers | neither | Full app |

iOS detection: `navigator.maxTouchPoints > 1` combined with a platform check,
since iPadOS reports itself as Mac.

**Preview mode** runs the whole UI against an in-memory store with no IndexedDB
writes, under a persistent banner: *Preview — install to keep your data.* A
visitor from a forum link can still look around; nothing is ever written to the
Safari container, so there is no wrong container to strand data in. The trap is
eliminated by construction rather than by prompt timing.

Cheaper alternative if drive-by trials do not matter: block outright and show
only the install instructions.

**Residual gaps, unsolved by detection:**
- A second icon for the same site creates a third empty container. Say so in the
  install instructions.
- Third-party browsers on iOS may not offer Add to Home Screen; the wall must
  detect this and direct the user to Safari (Q6).

**After install, the loop without any filesystem API:**

| Direction | Mechanism | Lands where |
| --- | --- | --- |
| Out | `<a download>` on a Blob URL | Files → Downloads |
| Out | `navigator.share({files})` | AirDrop, Messages, Mail, Save to Files, iCloud Drive |
| In | `<input type="file">` | Files picker |

Every one is a gesture; no silent autosave exists on any Apple platform. The
iPhone's durability ranking: **install** (removes the timer), **pair** (makes the
phone expendable), **export** (backstop). A cleared phone paired to an anchor is
restored by one QR scan, as a merge with lineage intact.

---

## 3. Convergence

### C0 — Single document, no subdocuments

**Decision: decks stay `Y.Map` entries inside the one `Y.Doc`.** Subdocuments
would allow per-deck transport but cost atomicity across document boundaries —
the CRDT resolves nothing across them, and "add all to collection" spans one.
Rejected. Document Topology in #47 stands as written.

Two properties follow, and they govern §4:

**Updates are opaque, commutative, idempotent.** Any transport that moves bytes
intact is valid. They compose: the same replica can receive the same update by
file, QR and data channel, in any order, twice, and converge.

**Every transport moves whole-document diffs.** Yjs encodes updates as ranges of
`(client, clock)` structs grouped by writing client, not by tree position, so
`encodeStateAsUpdate(doc, sv)` returns everything the peer lacks across the whole
document. With C0 there is no per-deck path and none is coming.

Payload size is therefore governed by the whole document, which makes the
card-facts whitelist load-bearing for share latency and first-sync time, not only
for disk. Measured floor: ~200 B/card, ~428 KB at 2,000 cards.

The sizing is already done — `persistent-ydoc.md` § "How much the payload
actually costs" measured 1,000 cards + 5 decks at **7.1 MB today against 320 KB
whitelisted**, and 5,000 cards + 20 decks at **33.7 MB against 1.5 MB**, through
the real `exportWithMetadata()`. That is 22× on the file, and under C0 the same
22× lands on every QR-bootstrapped first sync and every shared file. **#84 is
therefore a prerequisite of M4, not an optimisation, and it ships before M1.**
**Shipped** — the whitelist is `src/lib/card-fields.ts` and the facts live in the
`card_facts` store; the ~200 B/card floor above is what the document now starts
from.

### C1 — Two tabs are one store and two replicas

| Layer | Count |
| --- | --- |
| Origin / IndexedDB | one |
| `Y.Doc` | two — two heaps, two `clientID`s |

**#47 open question 1, answered: `y-indexeddb` does not bridge them.** It
persists and replays; it carries no cross-tab notification. The primitive is
**BroadcastChannel**. Yjs's network providers bundle one for this reason; the
IndexedDB provider alone leaves the gap.

### C2 — BroadcastChannel is transport zero

```js
doc.on('update', (u, origin) => { if (origin !== bc) bc.postMessage(u) })
bc.onmessage = e => Y.applyUpdate(doc, e.data, bc)
```

~30 lines with teardown. Ships with the document model, not after it: it closes
the phase-0 unknown by construction, validates the transport port before anything
expensive builds on it, and puts the sync path in production immediately.
Supported on all five platforms.

### C3 — Leader election on the write path

`navigator.locks`, exclusive. The holder owns the file handle and the peer
connection; other tabs keep their random `clientID`s and edit freely. Leader
election is for exclusive *resources*, never for a shared identity.

### C4 — `merge.ts` survives

Three reasons, down from four now that v1.0 snapshots are out of scope:

- foreign-lineage documents — a friend's file, a post-compaction file;
- the deliberate `max()` reconciliation Decision 1 leans on;
- anything arriving from a device that was never a peer, which T2 makes routine.

Import classification simplifies to two cases: same-guid document (merge) and
foreign-guid document (union). **The UI must state which one a payload receives** —
same bytes, different results.

Reinforcement for Decision 1: multi-transport sync makes "one person reconciling
the same shelf from two devices" more frequent. LWW handles that correctly;
counters fabricate. The decision gets stronger.

---

## 4. Transport

### T0 — The port

```
Y.encodeStateVector(doc)               "here is what I have"
Y.encodeStateAsUpdate(doc, remoteSV)   "here is what you are missing"
Y.applyUpdate(doc, bytes, origin)      "merge it"
```

NNTP's `IHAVE`/`SENDME`, 1986. Defined with the document model so file semantics
never leak into the store; each transport is then ~100 lines. State vectors are
8 B at one writing client, ~6 B per client after — which is what makes
handshake-then-diff viable over a QR code.

### T1 — QWBP (QR-WebRTC Bootstrap Protocol)

| | Chrome desk | Safari desk | Firefox desk | iPhone | Android |
| --- | --- | --- | --- | --- | --- |
| WebRTC + `getUserMedia` | yes | yes | yes | yes (≥15.1 third-party) | yes |
| QR decode | native 83+ | jsQR | jsQR | jsQR | native |
| Verdict | works¹ | works | works | works | works |

¹ webcam required. Use a wrapper trying native `BarcodeDetector` first, falling
back to jsQR — ~6.8 kB when native is available.

**Why the QR when both are on the same Wi-Fi.** Same network means packets *can*
travel; it supplies neither the address nor proof of ownership. A browser has no
LAN discovery API and no listening socket — a page is a client, so two tabs on
one subnet are mutually invisible. The QR carries **location** (packed ICE
candidates, or an mDNS UUID hostname on Apple platforms) and **identity** (the
32-byte DTLS fingerprint, which keys the channel and authenticates the peer).

Wi-Fi is the data path. The QR is the control path, substituting for the
signaling server. Viable because QWBP compresses signaling from 2,487 bytes to
55–100 — semantic, not DEFLATE: hardcode constants, derive ICE credentials from
the fingerprint via HKDF, binary-pack candidates.

Café Wi-Fi holds strangers, so "same network" is not a trust boundary. Optical
exchange makes physical proximity the authentication factor.

**Serverless boundary:** one local network, both peers connect via host
candidates, nothing external contacted. Cross-network needs STUN. Symmetric NAT
both sides needs TURN — ~10% of connections, enterprise Wi-Fi and CGNAT, absent
on a home LAN.

**Decision: ship with no STUN configured.** Works on the home LAN, says so
plainly otherwise. §5.5 gains no row. Resolves §4.3 blocker (a); (b) was resolved
by #47 Decision 1; (c) is what the document model delivers.

**Three properties:**
- **Both devices need a camera.** A unidirectional scan cannot complete the
  exchange. At 55–100 bytes the payload is 80–140 base64 characters — pasteable,
  typeable, readable aloud. That is the webcam-less path, not a degraded mode.
- **Safari supplies mDNS hostnames only**, so UUID-packed-into-the-IPv6-slot
  encoding is mandatory on Apple platforms. Take the published library; this is
  where a hand-rolled version fails silently on iPhone.
- **Candidates are per-session.** Persistent pairing needs a rendezvous point,
  which reintroduces a server. One scan per session; the channel then carries
  updates at LAN speed.

### T2 — Web Share and file exchange

| | Chrome desk | Safari desk | Firefox desk | iPhone | Android |
| --- | --- | --- | --- | --- | --- |
| `navigator.share({files})` | Win/ChromeOS | yes | — | yes | yes |
| Receiving | file input | file input | file input | Files → picker | Share Target or picker |

Gate on `navigator.canShare({files})`, which runs without transient activation
and can decide whether the button renders.

**This is the project's first deliberate egress of collection data**, and §5.5
has to say so. No host is contacted — the bytes go to the OS share sheet, which
then hands them to AirDrop, Mail or a cloud client of the user's choosing — but
§5.5's sentence "collection contents … are never transmitted" is written against
a world where the only way out was a file the user saved themselves. The share
sheet is user-initiated in exactly the same way and still deserves naming, not a
silent exemption.

**Android:** `share_target` in the manifest and a shared file opens in the app.
**iPhone:** since iOS 17 an AirDropped file with an unrecognised extension saves
to Files; the path is AirDrop → Files → app → Import → picker.

**T2a: omit the `accept` attribute.** iOS ignores filename extensions in
`accept`, its MIME handling is inconsistent (`application/pdf` admits
everything; `image/jpeg, application/pdf` admits only JPEG), and it greys out
files whose extension the OS cannot open across iCloud Drive, Dropbox and
OneDrive alike. A raw binary `.ydelta` is exactly the unpickable case. Filter
after selection in `import-guard.ts`.

**T2b: the share payload is `.json`.** Base64 the update inside an envelope with
`schema_version`, `guid`, `app`. Costs 33%; buys a file every platform will
preview and pass through unmangled, and gives `SUPPORTED_VERSIONS` real work.
C4's two-way classification applies to the decoded payload.

**Why not reuse the CSV export.** Asked, and the answer is structural: the CSV
is a *collection listing* — quantity, name, set, collector number, language, id,
collection only. No card lists, no list settings, no guid, no tombstones, no
update bytes. A shared CSV can only ever be a union import, which is where #46
started, and deletions still would not propagate. T2 exists so the receiving
device becomes a **peer**, and that means moving a CRDT update. CSV keeps its
own job — "take your data to another tool" (#50) — and the two are not
substitutes.

**File extensions, decided once:** `.ydelta` for the T3 per-device files,
`.json` for the share envelope, and `.yjs` retires with the snapshot format it
named. Every doc, message string and the `lm-decktools-backup-<ts>` filename
follows this.

### T3 — One file per device

A shared mutable file in a cloud folder has two writers, and the provider
resolves the collision by renaming one side — Syncthing appends
`.sync-conflict-<date>-<device>` and propagates that file everywhere. Give each
device its own file and the collision never occurs:

```
<guid>/
  <deviceId-A>.ydelta     written only by A
  <deviceId-B>.ydelta     written only by B
```

Read all siblings, write only your own. The CRDT resolves the data conflict;
one-writer-per-file removes the file conflict.

**Decision: adopt the layout, drop the picker as a requirement.**
`showDirectoryPicker()` is needed only to auto-discover siblings. The layout
works with `showSaveFilePicker()` — the user names the file once per device —
and reading siblings is `<input type="file" multiple>`, which works on all five
platforms. Auto-discovery is a Chromium-desktop enhancement.

`deviceId` is a **filename**, stable per device, in the local `metadata` store.
The `Y.Doc` `clientID` stays random per session. Two identities, different
lifetimes; do not let them collapse.

---

## 5. Scope

### S1 — Anchor and replica

| Role | Platform | Rationale |
| --- | --- | --- |
| **Anchor** — durable, always-on, holds the master file | Desktop native (Tauri) | Real filesystem, real backup coverage, no eviction regime |
| **Replica** — expendable, syncs on contact | Phone PWA | Redundancy substitutes for durability |

**What the anchor buys, ranked:**

1. **The data becomes a real file in the user's real filesystem**, which their
   existing backup already covers — Time Machine, File History, Backblaze, a NAS,
   rsync. IndexedDB is covered by none of these in restorable form. This is the
   Delta Chat move applied to storage: parasitise infrastructure the user already
   owns. Strongest durability argument available, requires no server.
2. Silent continuous writes with real file watching — T3 without the picker, on
   every desktop OS rather than Chromium only.
3. No eviction regime. No ITP, no quota, no `persist()`.
4. An always-on LAN peer, so the phone syncs to something that is there.

**What it does not buy:** it does not remove the QR bootstrap. A phone browser
still cannot do mDNS discovery. The alternative is the Kolibri model — the anchor
serves the app over the LAN at `http://<ip>:port` — which costs a second origin
with its own storage container and no secure context. Prototype it; do not assume
it.

**Cost:** Tauri + SvelteKit is a documented first-class pairing (static adapter,
`build/` as `frontendDist`, SSR off). Bundles land in the single-digit-to-low-
double-digit MB range against Electron's 150 MB+. One codebase, one UI, one merge
implementation. Direct download from lordmzn.it — no store, no review, no fee,
AGPL clean.

### S2 — No native mobile

The FSF has documented that the App Store Usage Rules conflict with the GPL and
AGPL; Apple removed GNU Go rather than change its rules, and pulled VLC after a
developer's copyright complaint rather than comply. The settled practical view is
that the App Store and the GPL are incompatible and will not be proven otherwise.

**An AGPL LMdecktools cannot ship on the App Store.** Relicensing the mobile port
is possible as sole copyright holder — VLC's mobile apps exist today because they
were relicensed — and cuts directly against §5.2's positioning. Google Play has
no such conflict, which leaves a fee plus a relicense to reach one of two mobile
platforms and not the other.

**Phones stay PWAs.** Revisit only on evidence of demand that T1 cannot serve.

---

## 6. Roadmap

Alpha ordering: build the final schema first, then build on it. No migration
work, no compatibility shims, no phased cutover. Each milestone leaves the app
working.

### M0 — Correction and context gating · 2 days
- [ ] Fix `db_no_fs_access` in both message catalogues (D0) — the last place the
      "Safari 15.2+" claim still reaches a user
- [ ] Feature-detect the picker; hide the linked-file UI where absent
- [ ] Context detection: `display-mode` / `navigator.standalone` / iOS check (D4)
- [ ] iOS browser tab → install wall + in-memory preview mode
- **Exit:** nothing can be written to the iOS Safari container; no platform is
  promised a capability it lacks

### M1 — Document model · #47, collapsed
- [x] **#84 first** — card-facts whitelist. **Done**, ahead of everything below:
      `card-fields.ts` holds the whitelist, `card_facts` (DB v5) holds the rest.
      The document model inherits it; there is nothing to re-measure here
- [ ] Persistent `Y.Doc` — stable `guid`, per-session `clientID`, tombstones
- [ ] **Breaking schema change.** Drop legacy stores in the same commit. Seed the
      document from scratch; no dual-write, no phased read flip
- [ ] Runes derive from the document
- [ ] Transport port (T0)
- [ ] BroadcastChannel provider (C2) + `navigator.locks` leader (C3)
- **Exit:** the app runs entirely off the document; two tabs converge live

### M2 — Durability · 2 weeks
- [ ] `persist()` on load; `persisted()` + `estimate()` in the DB modal (D2)
- [ ] `manifest.webmanifest`, icons, minimal service worker (D3)
- [ ] Re-cache critical assets on launch
- [ ] `deviceId` in `metadata`; copy registry (kind, label, last-seen)
- [ ] Header widget: count + age per copy; one-copy warning state (D1)
- [ ] First-run gate after first meaningful import
- [ ] `<a download>` export path on every platform
- **Exit:** an installed iOS replica survives 14 days idle with data intact (Q1);
  no user can reach a one-copy state without being told

### M3 — File and share transports
- [ ] T3 one-file-per-device layout on the `showSaveFilePicker` path
- [ ] `<input type="file" multiple>` sibling import
- [ ] T2b `.json` envelope; T2a remove `accept`; two-way classification (C4)
- [ ] `navigator.share({files})` behind `canShare`; Android `share_target`
- [ ] Merge-vs-union stated in the import UI
- **Exit:** a file round-trips with lineage intact and deletions propagate

### M4 — Peer transport
- [ ] QWBP, LAN-only, no STUN configured (T1)
- [ ] QR decode with jsQR fallback; paste/type fallback for webcam-less devices
- [ ] Pairing UI; last-merge time per peer feeds the M2 copy registry
- **Exit:** phone and desktop converge over one scan with no external host
  contacted. **Closes #11**

### M5 — Anchor
- [ ] Tauri shell around the existing SvelteKit build (S1)
- [ ] Native file store; silent writes; file watching
- [ ] QWBP peer on the desktop side
- [ ] Direct download + signing/notarisation for macOS and Windows
- **Exit:** the anchor holds a real file that the user's own backup covers

**Constraints:** M0 is independent and ships immediately. M1 blocks M2–M5. M3 and
M4 are parallel. M5 depends on M1 only. **M2 is the gate on inviting users** —
the copy-count invariant is what makes the app safe to recommend, and until it
ships the alpha stays private.

---

## 7. Open questions

| # | Question | Blocks | Resolution |
| --- | --- | --- | --- |
| Q1 | Does `persist()` measurably defeat the ITP timer on WebKit? | M2 exit | 14-day idle test on a real device, installed icon |
| Q2 | Does an installed iOS replica survive *Clear History and Website Data*? | D4 ranking | Same test rig |
| Q4 | Does `navigator.locks` behave on WebKit across an icon and a Safari tab? | C3 | Separate containers should not contend — confirm |
| Q5 | Is Home Screen web app data included in iCloud device backup? | M2 copy semantics | If yes, an installed iOS replica counts as a stronger copy |
| Q6 | Can third-party iOS browsers add to Home Screen? | M0 install wall | Determines whether the wall says "install" or "open in Safari" |
| Q7 | Does the Kolibri LAN-serve model beat QWBP for phone↔anchor? | M5 | Prototype during M5; second origin is the cost |
| Q8 | Does the Android picker actually support T3 — create a new file, write it repeatedly, survive a session? | D0, T3, S1 | Device or Play-image emulator; DevTools device mode **cannot** answer it |

Q3 — document weight with and without the whitelist — is struck: it was measured
in `persistent-ydoc.md` before this document was written. See C0.

Q8 is the one that changes a design decision rather than confirming one. If
Android's `showSaveFilePicker` cannot create a file, T3 on a phone degrades to
"pick the file you already made on the desktop", and the anchor stops being
optional for anyone who wants file-based sync at all.

---

## 8. Risks

- **The share sheet is not a backup.** A file AirDropped and left in Downloads has
  no lineage tracking and drifts. M2's age counter is what keeps this honest.
- **M4 has more moving parts than anything shipped so far**: camera permission, QR
  fallback, WebRTC state machine, signaling rollback, mDNS packing. Use the
  published library.
- **File writes stay O(document) per change** on the T3 path, and C0 guarantees
  no per-deck path exists. The whitelist is load-bearing for autosave latency,
  share size and first-sync time at once.
- **M5 adds a release pipeline, code signing and notarisation** to a project that
  currently ships one artifact to one static host. That is the real cost, not the
  Rust.
- **Preview mode is a second code path** through the store. Keep it as an
  in-memory adapter behind the same interface, not a branch in the UI, or it will
  drift out of parity with the real store.
- **Alpha licence expires at M2.** Once users are invited, breaking changes stop
  being free. Anything schema-shaped that is still uncertain gets decided before
  M2 ships, not after.

---

## 9. Prior art

| Pattern | Source | Lesson applied |
| --- | --- | --- |
| Convergence without freshness | Usenet/NNTP, FidoNet, NASA Bundle Protocol, LOCKSS | D1's honest promise; never "Synced ✓" |
| Reuse a network the user owns | Delta Chat (IMAP/SMTP), NNCP (USB as a link) | T2 via the OS share sheet; S1 via the user's own backup |
| Proximity as rendezvous | Blockchain Commons UR, Wi-Fi Easy Connect | T1's optical bootstrap and fingerprint auth |
| Human as transport, deliberately | Kolibri (Zeroconf + USB), Willow sideloading | S1's anchor/replica split; Q7 |
| One writer per file | *Local, first, forever*; KeePass | T3's layout, and KeePass's per-entry timestamps + tombstones |
| Conflicts visible, not merged | CouchDB replication, Community Health Toolkit | C4 — keeping the union path is a position, not a compromise |
