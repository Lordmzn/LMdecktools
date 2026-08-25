import {
	openDatabase,
	checkLocalDatabase,
	databaseExists,
	takeLegacySeed,
	putMetadata,
	getMetadata,
	useStorageFactory,
	type Card,
	type CardList,
	type CollectionCard
} from './db';
import { detectInstallContext, type InstallContext } from './install-context';
import { requestPersistentStorage } from './storage-persistence';
import { getOrCreateDeviceId, getCopyRegistry, recordCopy, type CopyEntry } from './copy-registry';
export type { CopyEntry } from './copy-registry';
import { triggerDownload } from './download';
import { connectTabs, type TabSync } from './tab-sync';
import { claimLeadership, type Leadership } from './leader';
import * as Y from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import {
	DOC_PERSISTENCE_NAME,
	applyRemoteUpdate,
	attachPersistence,
	createDocument,
	createList as docCreateList,
	destroyPersistence,
	observeDocument,
	peekPayload,
	readCollection as docReadCollection,
	readCollectionCard as docReadCollectionCard,
	readList as docReadList,
	readLists as docReadLists,
	readMeta,
	readPayload,
	removeCollectionCard as docRemoveCollectionCard,
	removeList as docRemoveList,
	removeListCard as docRemoveListCard,
	seedDocument,
	setCollectionQuantity as docSetCollectionQuantity,
	setListCardQuantity as docSetListCardQuantity,
	updateFor,
	updateList as docUpdateList,
	upsertCollectionCard as docUpsertCollectionCard,
	upsertListCard as docUpsertListCard,
	type DocumentList
} from './ydoc';

import {
	logError,
	loadErrorJournal as dbLoadErrorJournal,
	clearErrorJournal as dbClearErrorJournal,
	type ErrorCategory,
	type ErrorEntry
} from './error-journal';
import {
	carriesCardFacts,
	extractCardFacts,
	toStoredCollectionCard,
	toStoredListCard,
	type CardFacts
} from './card-fields';
import {
	loadCardFacts as dbLoadCardFacts,
	putCardFacts,
	missingFactIds,
	type CardFactsIndex
} from './card-facts';
import { diffProjections, mergeCardListSets, mergeCollections } from './merge';
import type { CardsDelta, ListMergeDetail } from './merge';
import { parseImportFile, assertRestorable, type ImportPayload } from './import-guard';
import {
	formatCollectionAsCSV,
	formatCollectionAsText,
	buildExportPreview,
	type ExportFormat,
	type ExportPreview
} from './export-format';
import {
	buildCollectionIndex,
	checkOwnership,
	mergeCardsIntoCollection,
	type OwnershipCheckParams,
	type OwnershipCheckResult
} from './collection';
export type { OwnershipCheckParams, OwnershipCheckResult, CollectionIndex } from './collection';
import {
	isFileSystemAccessSupported,
	pickAndLinkNewFile,
	pickAndLinkExistingFile,
	loadStoredHandle,
	unlinkFile as unlinkFileHandle,
	checkPermission,
	requestPermission,
	writeWithRetry,
	enqueueWrite,
	classifyWriteError,
	describeWriteError,
	readFileData,
	readFileLastModified,
	scheduleDebouncedWrite,
	cancelDebouncedWrite,
	startPolling,
	stopPolling,
	updateLastKnownModified,
	type LinkedFileStatus
} from './linked-file';
export type { LinkedFileStatus } from './linked-file';
export { isFileSystemAccessSupported } from './linked-file';

// Device-local database: the auto-load preference, the linked-file handle, the
// document guid, the error journal, the card-facts cache. No user data (#47).
let db: IDBDatabase | null = null;

/** Ensure db is open, re-opening if needed (e.g. after HMR or race condition). */
async function ensureDB(): Promise<IDBDatabase> {
	if (!db) {
		db = await openDatabase();
	}
	return db;
}

// ==================== THE DOCUMENT (#47) ====================

/**
 * The user's lists and collection, as one long-lived `Y.Doc`.
 *
 * Authoritative: `store.savedCardLists` and `store.collection` are projections
 * of it, rebuilt by an observer. Mutators write here and let the observer do the
 * assigning, which is why there is no longer a `triggerAutoSave()` at fourteen
 * call sites — the document knows when it changed.
 */
let doc: Y.Doc | null = null;
let persistence: IndexeddbPersistence | null = null;
let stopObserving: (() => void) | null = null;
let tabs: TabSync | null = null;
let leadership: Leadership | null = null;

/** The guid lives in device-local metadata; the lineage it names lives in the document. */
const GUID_KEY = 'documentGuid';

function requireDoc(): Y.Doc {
	if (!doc) throw new Error('No document is open.');
	return doc;
}

/**
 * The document's own view of the data, for the mutators.
 *
 * They must not read `store.*`: the runes are rebuilt on a microtask, so
 * between one write and the next tick they are stale, and a mutator reading its
 * own stale projection would lose the write before it. The runes are for
 * rendering; the document is the authority.
 */
function liveLists(): CardList[] {
	return docReadLists(requireDoc()) as CardList[];
}

function liveCollection(): CollectionCard[] {
	return docReadCollection(requireDoc());
}

function liveList(listId: string | null): DocumentList | null {
	return listId ? docReadList(requireDoc(), listId) : null;
}

/** Rebuild the runes from the document. Whole arrays, coalesced per microtask. */
function projectDocument(): void {
	const current = requireDoc();
	store.savedCardLists = docReadLists(current) as CardList[];
	store.collection = docReadCollection(current);

	// A list can vanish under the selection now — a remote replica may have
	// deleted the one this tab was looking at.
	if (
		store.currentCardListId &&
		!store.savedCardLists.some((l) => l.id === store.currentCardListId)
	) {
		store.currentCardListId = store.savedCardLists[0]?.id ?? null;
	} else if (!store.currentCardListId && store.savedCardLists.length > 0) {
		store.currentCardListId = store.savedCardLists[0].id ?? null;
	}
}

/**
 * Open the document for this session and start projecting it.
 *
 * `persist` is false in two cases: preview mode, where nothing may be written
 * to the browser's container (#87), and peek mode, which is a look at the data
 * without adopting it.
 */
async function openDocument(options: { persist: boolean }): Promise<Y.Doc> {
	if (doc) return doc;

	const _db = await ensureDB();
	const stored = await getMetadata(_db, GUID_KEY);
	const guid = (stored?.value as string | undefined) ?? crypto.randomUUID();

	doc = createDocument(guid);
	if (!stored?.value && options.persist) await putMetadata(_db, GUID_KEY, guid);

	if (options.persist) {
		persistence = attachPersistence(doc);
		await persistence.whenSynced;

		// The moment there is something in the browser's container worth keeping,
		// ask for it to be exempt from eviction under disk pressure (#88). Not
		// awaited: on Firefox this is a permission prompt, and nothing about what
		// the app does next depends on the answer. Preview mode never gets here —
		// it attaches no persistence, so there is nothing to protect.
		void requestPersistentStorage();

		// Same moment: this is where "how many copies exist" starts being able to
		// answer anything (#90). Preview mode never gets here for the same reason —
		// nothing is written to that container, so there is nothing to count.
		store.deviceId = await getOrCreateDeviceId(_db);
		store.copyRegistryEntries = await getCopyRegistry(_db, guid);
	}

	// One-time, expiring with the v6 upgrade: rows rescued from the stores that
	// upgrade dropped. A database created after #47 never has any.
	const seed = takeLegacySeed();
	if (seed) {
		seedDocument(doc, seed);
		await cacheCardFacts([...seed.collection, ...seed.cardLists.flatMap((l) => l.cards)], _db);
	}

	stopObserving?.();
	stopObserving = observeDocument(doc, projectDocument);

	// One subscription in place of fourteen `triggerAutoSave()` calls. Remote
	// applies are excluded: writing back what just arrived is how a merge loop
	// starts.
	doc.on('update', (_update: Uint8Array, origin: unknown) => {
		if (origin === 'file') return;
		triggerAutoSave();
	});

	// The other tabs of this browser are the first transport (C2), and they are
	// live from the moment there is a document — no persistence required, which
	// is why preview mode gets this too.
	tabs = connectTabs(doc);

	// One tab owns the file handle (C3). The rest edit freely and their changes
	// reach the file through the leader, over the channel above.
	if (options.persist) {
		leadership = claimLeadership((isLeader) => {
			store.isLeaderTab = isLeader;
			if (isLeader) {
				// Promoted mid-session — the previous leader may have closed with the
				// file behind the document.
				void initLinkedFile().then(() => triggerAutoSave());
			}
		});
	}

	projectDocument();
	return doc;
}

/**
 * Close the document without destroying anything it has written.
 *
 * The provider's teardown is awaited rather than fired and forgotten: it holds
 * an open IndexedDB connection, and a `deleteDatabase()` behind a live
 * connection blocks — silently, until something times out.
 */
async function closeDocument(): Promise<void> {
	tabs?.disconnect();
	tabs = null;
	leadership?.release();
	leadership = null;
	store.isLeaderTab = false;
	stopObserving?.();
	stopObserving = null;
	await persistence?.destroy();
	persistence = null;
	doc?.destroy();
	doc = null;
}

/** The whole document, as the bytes a file or a peer receives (T0). */
export function documentUpdate(): Uint8Array {
	return updateFor(requireDoc());
}

/** The lineage this database belongs to, for the two-way import classification (C4). */
export function documentGuid(): string | null {
	return doc ? (readMeta(doc).guid ?? doc.guid) : null;
}

/**
 * The live document, for the transports that sit on the port — the
 * BroadcastChannel provider, the peer connection — and for tests that need to
 * count transactions. Null before a database is open.
 */
export function currentDocument(): Y.Doc | null {
	return doc;
}

/** Total number of physical copies in a set of cards (sum of LM_quantity). */
export function countCards(cards: { LM_quantity: number }[]): number {
	return cards.reduce((sum, card) => sum + card.LM_quantity, 0);
}

/** Total number of physical copies across every card list. */
export function countCardsInLists(lists: { cards: { LM_quantity: number }[] }[]): number {
	return lists.reduce((sum, list) => sum + countCards(list.cards), 0);
}

// ==================== STORE ====================
export type DBMode = 'none' | 'peek' | 'active';

export interface StoreInterface {
	dbMode: DBMode;
	dbLoaded: boolean; // derived: dbMode !== 'none' (backward compat)
	isReadOnly: boolean; // derived: dbMode !== 'active'
	savedCardLists: CardList[];
	collection: CollectionCard[];
}

class Store implements StoreInterface {
	// DB state
	dbMode = $state<DBMode>('none');

	/**
	 * Which app this is (#87). Set once by `startSession()`; `'browser'` until
	 * then, since the prerendered HTML is the full app.
	 */
	installContext = $state<InstallContext>('browser');

	/**
	 * Whether this tab owns the exclusive resources — today the linked file,
	 * tomorrow the peer connection (#47, C3). Every tab edits regardless; a
	 * follower's changes reach the file through the leader.
	 */
	isLeaderTab = $state(false);

	// These are plain getters so they always recompute from dbMode (no reactive
	// owner required — works in both templates and test environments).
	get dbLoaded(): boolean {
		return this.dbMode !== 'none';
	}
	get isReadOnly(): boolean {
		return this.dbMode !== 'active';
	}

	/**
	 * Preview mode: the whole app over an in-memory store, nothing written to the
	 * browser's container. Not read-only — the point is that it is fully usable,
	 * only impermanent, so the banner is what tells the user, not disabled UI.
	 */
	get previewMode(): boolean {
		return this.installContext === 'ios-browser';
	}

	// Copy registry (#90): this device's identity and the other copies known
	// for the current lineage. Populated from `openDocument()`'s persisting
	// branch, so both stay empty in preview mode — there is nothing to count.
	deviceId = $state<string | null>(null);
	copyRegistryEntries = $state<CopyEntry[]>([]);

	/**
	 * This device plus every registry entry. 0 until `deviceId` is provisioned —
	 * which only happens on the persisting path, so this is naturally 0 in
	 * preview mode without needing to check `previewMode` separately.
	 */
	get copyCount(): number {
		if (!this.deviceId) return 0;
		return this.copyRegistryEntries.length + 1;
	}

	// Card list state
	savedCardLists = $state<CardList[]>([]);

	/**
	 * The selected list, by id rather than by position (#47).
	 *
	 * It used to be an index into `savedCardLists`. Once a remote replica can
	 * insert or delete a list, a position is not a selection — it silently
	 * reselects a different deck under the user.
	 */
	currentCardListId = $state<string | null>(null);

	// A plain getter, for the same reason `dbLoaded` and `isReadOnly` are: it
	// recomputes on every read, with no reactive owner required. A `$derived`
	// here kept returning a list that had just been deleted whenever it was read
	// outside a component — which is every test in this repo.
	get currentCardList(): CardList | null {
		if (!this.currentCardListId) return null;
		return this.savedCardLists.find((list) => list.id === this.currentCardListId) ?? null;
	}
	listCards = $derived(this.currentCardList?.cards || []);
	listNames = $derived(this.savedCardLists.map((list) => list.name));
	totalCards = $derived(countCards(this.listCards));
	uniqueCards = $derived(this.listCards.length);

	// DB-wide list stats (all lists, not just the selected one)
	totalListCards = $derived(countCardsInLists(this.savedCardLists));

	/**
	 * Scryfall's own facts about the cards on screen — images, faces, set names —
	 * keyed by card id (#84). Cached locally, never saved with the user's data,
	 * refetched when missing. Components read it through `cardFactsOf()`.
	 */
	cardFacts = $state<CardFactsIndex>({});

	// Collection state
	collection = $state<CollectionCard[]>([]);
	totalOwnedCards = $derived(this.collection.reduce((sum, card) => sum + card.quantity_owned, 0));
	uniqueOwnedCards = $derived(this.collection.length);
	isCardOwned(cardId: string) {
		const card = this.collection.find((c) => c.id === cardId);
		return card ? card.quantity_owned : 0;
	}

	// Linked file state
	linkedFileStatus = $state<LinkedFileStatus>('none');
	linkedFileName = $state<string | null>(null);
	linkedFileLastSaved = $state<number | null>(null);
	linkedFileError = $state<string | null>(null);
	linkedFileExternalChange = $state(false);
	linkedFileWriting = $state(false);
	linkedFilePermissionDenied = $state(false);

	/**
	 * The collection indexed for ownership lookups, rebuilt whenever `collection`
	 * changes — once, not once per card in the list (#62).
	 */
	collectionIndex = $derived(buildCollectionIndex(this.collection));

	// Derived ownership check for current list
	listOwnershipCheck = $derived.by((): OwnershipCheckResult => {
		const list = this.currentCardList;
		if (!list) return { owned: true, cards: [] };

		return checkOwnership(this.listCards, this.collectionIndex, list);
	});
}

// Export a single shared instance
export const store = new Store();

function assertWritable(): void {
	if (store.dbMode !== 'active') {
		throw new Error('Database is read-only. Please select a database to enable writing.');
	}
}

// ==================== CARD FACTS (#84) ====================

/**
 * The facts needed to draw a card, wherever they happen to be.
 *
 * A card fresh from a Scryfall search carries its own — that is the object the
 * API just returned. A card loaded from the database carries none, by design:
 * its facts live in the local cache, keyed by id. Components call this rather
 * than reaching for `card.image_uris`, which is only ever set on the first kind.
 */
export function cardFactsOf(card: { id?: string } | null | undefined): CardFacts {
	if (!card?.id) return { id: '' };
	if (carriesCardFacts(card)) return extractCardFacts(card) ?? { id: card.id };
	return store.cardFacts[card.id] ?? { id: card.id };
}

/**
 * How a card's edition reads in a filter or a sort: Scryfall's full set name
 * when the facts cache has it, the set code the record itself carries when it
 * does not. Never blank for a card that has a set (#84).
 */
export function cardSetLabel(card: { id?: string; set?: string } | null | undefined): string {
	return cardFactsOf(card).set_name ?? card?.set?.toUpperCase() ?? '';
}

/**
 * Remember the renderable half of cards we are holding in full, so they still
 * draw after a reload — the write path drops everything but the whitelist (#84).
 *
 * Facts for a given printing never change, so an id already in the index is
 * skipped: bulk paths can hand over a whole fetched batch without re-writing
 * what is already cached. Never throws — this is a cache, and a failed cache
 * write is not a reason to fail the user's edit.
 */
async function cacheCardFacts(cards: unknown[], target: IDBDatabase | null = db): Promise<void> {
	const fresh: CardFacts[] = [];

	for (const card of cards) {
		const facts = extractCardFacts(card);
		if (facts && !store.cardFacts[facts.id]) fresh.push(facts);
	}
	if (fresh.length === 0) return;

	const next = { ...store.cardFacts };
	for (const facts of fresh) next[facts.id] = facts;
	store.cardFacts = next;

	// As with the error journal, no `ensureDB()`: opening a database is the
	// user's choice, and caching an image URL is no reason to make it for them.
	if (!target) return;
	try {
		await putCardFacts(target, fresh);
	} catch (error) {
		logAppError('indexeddb', error, { operation: 'cacheCardFacts', count: fresh.length });
	}
}

/** Every card currently held, list cards and collection alike. */
function allHeldCards(): { id?: string }[] {
	return [...store.collection, ...store.savedCardLists.flatMap((list) => list.cards)];
}

let hydrating = false;

/**
 * Fetch the facts for cards the cache cannot draw — a file restored from
 * another device, or a database whose cache was cleared. Batched through the
 * same `/cards/collection` endpoint the importers use, paced between batches
 * since this runs unattended rather than on a click.
 *
 * Fire-and-forget: until it finishes, those cards render as name and quantity,
 * which is the agreed cost of keeping Scryfall's facts out of the saved file.
 */
export async function hydrateCardFacts(): Promise<void> {
	if (hydrating) return;

	const missing = missingFactIds(allHeldCards(), store.cardFacts);
	if (missing.length === 0) return;

	hydrating = true;
	try {
		const { found } = await fetchCardsByIds(missing, undefined, { pauseMs: 100 });
		await cacheCardFacts([...found.values()]);
	} finally {
		hydrating = false;
	}
}

/** Read the cached facts for everything in this database into memory. */
async function loadCardFactsIndex(): Promise<void> {
	if (!db) return;

	try {
		store.cardFacts = await dbLoadCardFacts(db);
	} catch (error) {
		logAppError('indexeddb', error, { operation: 'loadCardFacts' });
		store.cardFacts = {};
	}
}

/**
 * Load everything the UI reads: the document, then the facts that make it
 * drawable. The refetch of what the cache is missing is deliberately not
 * awaited — it needs the network, and the lists are readable without it.
 */
async function loadCardData(options: { persist?: boolean } = {}): Promise<void> {
	await openDocument({ persist: options.persist ?? true });
	await loadCardFactsIndex();
	void hydrateCardFacts();
}

// ==================== INITIALIZATION ====================

/**
 * The one startup call, from `+layout.svelte` (#87).
 *
 * Detects what the app is running as *before* anything can open IndexedDB, so
 * an iOS browser tab never gets the chance to write to a container the
 * installed app cannot read. Everywhere else this is just `tryAutoLoadDB()`.
 */
export async function startSession() {
	store.installContext = detectInstallContext();

	if (store.installContext === 'ios-browser') {
		await enterPreviewMode();
		return;
	}

	await tryAutoLoadDB();
}

/**
 * Run the app against an in-memory database (#87).
 *
 * `fake-indexeddb` is a complete `IDBFactory` that keeps everything in the
 * heap, so this is the real storage layer — the same `openDatabase()`, the same
 * v5 upgrade, the same transactions — over memory that dies with the tab. That
 * is deliberate: a hand-written preview store would be a second code path
 * through the app and would drift out of parity with the first.
 *
 * The import is dynamic so the ~100 KB only lands on the devices that need it,
 * and the database is opened `active` rather than `peek`, since preview mode is
 * meant to be fully usable — impermanent, not read-only.
 *
 * The document gets no persistence provider here (#47): `y-indexeddb` reaches
 * for the global `indexedDB` rather than the injected factory, so the only way
 * to keep it out of the browser's container is not to attach it at all.
 */
export async function enterPreviewMode() {
	const { IDBFactory: MemoryFactory } = await import('fake-indexeddb');
	useStorageFactory(new MemoryFactory());

	db = await openDatabase();
	store.dbMode = 'active';
	await loadCardData({ persist: false });
}

/**
 * Does this browser already hold something of the user's?
 *
 * Two databases since #47 — device-local state and the document — and either
 * one being present means yes. The DB modal asks through here rather than
 * calling `checkLocalDatabase()` directly, which only ever knew about the
 * first of them.
 */
export async function localDatabaseExists(): Promise<boolean> {
	return (await checkLocalDatabase()) || (await databaseExists(DOC_PERSISTENCE_NAME));
}

/**
 * Try to auto-load the local database if the user previously connected it.
 * Called once on app startup from +layout.svelte.
 */
export async function tryAutoLoadDB() {
	if (store.dbMode !== 'none') return;

	if (!(await localDatabaseExists())) return;

	db = await openDatabase();
	const autoLoad = await getMetadata(db, 'autoLoadDB');
	if (!autoLoad) {
		// DB exists but user never opted in — leave dbMode as 'none'
		// so the modal can peek later if opened.
		db.close();
		db = null;
		return;
	}

	store.dbMode = 'active';
	await loadCardData();
	await initLinkedFile();
}

/**
 * Open database in read-only peek mode (data visible, writes blocked).
 *
 * The document is persisted as usual — peek is about not *mutating* the data,
 * and `assertWritable()` is what enforces that. Reading the stored updates is
 * the entire point of peeking, and `y-indexeddb` is the only thing that can.
 */
export async function peekDB() {
	db = await openDatabase();
	store.dbMode = 'peek';
	await loadCardData();
}

/**
 * Initialize IndexedDB and load data (grants full write access)
 */
export async function initDB() {
	if (store.dbMode === 'peek') {
		store.dbMode = 'active';
		await putMetadata(db!, 'autoLoadDB', true);
		await initLinkedFile();
		return;
	}
	db = await openDatabase();
	store.dbMode = 'active';
	await loadCardData();
	await putMetadata(db!, 'autoLoadDB', true);
	await initLinkedFile();
	console.log('initDB done');
}

/**
 * Erase the user's data.
 *
 * Under the document model this is not a `store.clear()` — it destroys the
 * lineage. A fresh guid follows, because the emptied database is not a replica
 * of the one that came before it: any peer still holding the old lineage must
 * re-seed rather than helpfully syncing everything back.
 *
 * `error_journal` and `card_facts` survive, as they always have — diagnostics
 * and a refetchable cache are not the user's data.
 */
export async function clearDB() {
	const _db = await ensureDB();

	await closeDocument();
	await destroyPersistence();

	const guid = crypto.randomUUID();
	await putMetadata(_db, GUID_KEY, guid);
	await putMetadata(_db, 'last_clear', Date.now());

	store.currentCardListId = null;
	await openDocument({ persist: store.dbMode === 'active' || store.dbMode === 'peek' });
}

/** Close both connections (used in tests to allow deleteDatabase) */
export async function closeDB(): Promise<void> {
	await closeDocument();
	if (db) {
		db.close();
		db = null;
	}
}

/** The whole document — what a linked file holds and what a peer receives. */
export function exportDB(): Uint8Array {
	return documentUpdate();
}

// ==================== COPY REGISTRY (#90) ====================

/** Upsert a copy's last-seen time, keyed to the current lineage. A no-op with no database open. */
async function recordCopySeen(kind: CopyEntry['kind'], id: string, label: string): Promise<void> {
	const guid = documentGuid();
	if (!db || !guid) return;
	store.copyRegistryEntries = await recordCopy(db, guid, { id, kind, label, lastSeen: Date.now() });
}

/** The filename a downloaded backup gets — unrelated to T3's per-device file naming (#91). */
function backupFilename(): string {
	return `lm-decktools-backup-${new Date().toISOString().slice(0, 10)}.yjs`;
}

/** Download a full snapshot and record it as a copy. The `<a download>` path used everywhere else too. */
export async function downloadBackupCopy(): Promise<void> {
	const filename = backupFilename();
	triggerDownload(new Uint8Array(exportDB()), filename, 'application/octet-stream');
	await recordCopySeen('export', 'export', filename);
}

// ==================== ERROR JOURNAL ====================

/**
 * Record an error in the local journal for /diagnostics. Never throws and never
 * blocks the caller — a failure to log must not compound the failure being logged.
 *
 * Deliberately does not call `ensureDB()`: opening IndexedDB is the user's choice
 * (see `tryAutoLoadDB`), and an error is no reason to create a database behind
 * their back. With no DB open, the console is all we get.
 */
export function logAppError(
	category: ErrorCategory,
	error: unknown,
	context?: Record<string, unknown>
): void {
	console.error(`[${category}]`, error, context ?? '');

	if (!db) return;

	logError(db, category, error, context).catch((journalError) => {
		console.error('Failed to write to the error journal:', journalError);
	});
}

/** Entries for the /diagnostics page, newest first. Empty when no DB is open. */
export async function loadErrorJournal(): Promise<ErrorEntry[]> {
	if (!db) return [];
	return dbLoadErrorJournal(db);
}

export async function clearErrorJournal(): Promise<void> {
	if (!db) return;
	return dbClearErrorJournal(db);
}

/** Whether the journal is reachable — false means no database has been opened yet. */
export function isErrorJournalAvailable(): boolean {
	return db !== null;
}

// ==================== LINKED FILE ====================

let linkedHandle: FileSystemFileHandle | null = null;

function applyWriteSuccess(timestamp: number): void {
	store.linkedFileLastSaved = timestamp;
	store.linkedFileError = null;
	store.linkedFileWriting = false;

	// The linked file is a copy too — it just refreshes itself instead of aging
	// like an export (#90). Not awaited: nothing downstream depends on when the
	// registry write lands.
	if (store.linkedFileName) void recordCopySeen('linked-file', 'linked-file', store.linkedFileName);
}

function applyWriteError(error: unknown): void {
	const kind = classifyWriteError(error);
	logAppError('linked-file', error, { operation: 'write', kind, fileName: store.linkedFileName });

	if (kind === 'permission') {
		// Access was revoked rather than the write failing — reconnecting
		// re-prompts for permission, which "Retry" cannot do.
		store.linkedFileStatus = 'reconnect';
		store.linkedFilePermissionDenied = false;
		permissionRequested = false;
		stopPolling();
	} else {
		store.linkedFileStatus = kind === 'not-found' ? 'not-found' : 'write-error';
	}

	store.linkedFileError = describeWriteError(error);
	store.linkedFileWriting = false;
}

/** Serialized write of the current store state, with shared status handling. */
function performWrite(handle: FileSystemFileHandle): Promise<void> {
	store.linkedFileWriting = true;
	return enqueueWrite(async () => {
		try {
			await writeWithRetry(handle, documentUpdate());
			const ts = Date.now();
			updateLastKnownModified(ts);
			applyWriteSuccess(ts);
		} catch (error) {
			applyWriteError(error);
		}
	});
}

/**
 * Watch the file for changes made outside this app — leader only.
 *
 * A follower polling would re-read and re-apply what the leader has already
 * applied and broadcast, and would hold a second read of the file open on every
 * tick for nothing.
 */
function startPollingAsLeader(handle: FileSystemFileHandle): void {
	if (leadership && !leadership.isLeader) return;
	startPolling(handle, handleExternalChange);
}

function triggerAutoSave(): void {
	if (store.linkedFileStatus !== 'active' || !linkedHandle) return;
	// Only the leader writes the file (C3). A follower's edit still gets there:
	// it reaches the leader over the tab channel, and the leader's own `update`
	// handler schedules the write.
	if (leadership && !leadership.isLeader) return;

	store.linkedFileWriting = true;
	scheduleDebouncedWrite(linkedHandle, () => documentUpdate(), applyWriteSuccess, applyWriteError);
}

export async function saveNow(): Promise<void> {
	if (store.linkedFileStatus !== 'active' || !linkedHandle) return;

	// Supersede any pending autosave; this write carries the same state.
	cancelDebouncedWrite();
	await performWrite(linkedHandle);
}

function handleExternalChange(): void {
	store.linkedFileExternalChange = true;
}

export async function initLinkedFile(): Promise<void> {
	if (!db || !isFileSystemAccessSupported()) return;

	const handle = await loadStoredHandle(db);
	if (!handle) {
		store.linkedFileStatus = 'none';
		return;
	}

	linkedHandle = handle;
	store.linkedFileName = handle.name;

	try {
		const perm = await checkPermission(handle);
		if (perm === 'granted') {
			store.linkedFileStatus = 'active';
			try {
				const modified = await readFileLastModified(handle);
				updateLastKnownModified(modified);
			} catch {
				// File may not exist yet — that's fine
			}
			startPollingAsLeader(handle);
		} else {
			store.linkedFileStatus = 'reconnect';
		}
	} catch (error) {
		logAppError('linked-file', error, {
			operation: 'initLinkedFile',
			fileName: store.linkedFileName
		});
		store.linkedFileStatus = 'not-found';
	}
}

export async function linkFile(): Promise<void> {
	const _db = await ensureDB();

	const handle = await pickAndLinkNewFile(_db);
	linkedHandle = handle;
	store.linkedFileName = handle.name;
	store.linkedFileStatus = 'active';
	store.linkedFileError = null;

	// Write current state to the file immediately
	await performWrite(handle);

	startPollingAsLeader(handle);
}

/**
 * Bring an incoming payload into the document, by whichever of the two
 * operations its lineage calls for (C4).
 *
 * **Same guid** — the file is a replica of this database. Applying its update
 * is a true merge: concurrent edits reconcile, and deletions propagate, because
 * both sides share history and tombstones.
 *
 * **Different guid** — a friend's file, or one from a compacted lineage. Those
 * documents are not peers, so applying the update would adopt a stranger's
 * history wholesale. It goes through the explicit union in `merge.ts` instead,
 * written back as ordinary local edits.
 *
 * Same bytes, different results — which is why the UI has to say which one a
 * file is getting.
 */
async function applyPayloadToDocument(data: Uint8Array): Promise<void> {
	const current = requireDoc();
	const incoming = peekPayload(data);

	if (incoming.guid && incoming.guid === documentGuid()) {
		applyRemoteUpdate(current, data, 'file');
		await cacheCardFacts(allHeldCards(), db ?? undefined);
		return;
	}

	const payload = readPayload(data);

	// A file written before #84 still carries the card facts, and this is the
	// last moment they exist — the document takes the whitelist only.
	await cacheCardFacts(
		[...payload.collection, ...payload.cardLists.flatMap((list) => list.cards)],
		db ?? undefined
	);

	unionIntoDocument(payload.cardLists, payload.collection);
}

/**
 * The union path, written into the document as local edits.
 *
 * Nothing is ever removed here — that is the whole point of the union, and the
 * reason it survives the arrival of a real CRDT.
 */
function unionIntoDocument(remoteLists: CardList[], remoteCollection: CollectionCard[]): void {
	const current = requireDoc();

	const localLists = liveLists();
	const lists = mergeCardListSets(localLists, remoteLists);
	const collection = mergeCollections(liveCollection(), remoteCollection);

	// One transaction: a union is one act, and the observer should rebuild once.
	current.transact(() => {
		for (const list of lists.changed) {
			const existing = localLists.find((l) => l.name === list.name);
			const listId = existing?.id ?? docCreateList(current, list.name, list);
			docUpdateList(current, listId, {
				name: list.name,
				cardMatching: list.cardMatching,
				languageMatching: list.languageMatching
			});
			for (const card of list.cards) {
				docUpsertListCard(current, listId, card, card.LM_quantity);
			}
		}

		for (const card of collection.changed) {
			docUpsertCollectionCard(current, card, card.quantity_owned);
		}
	});
}

export async function linkExistingFile(): Promise<void> {
	const _db = await ensureDB();

	const handle = await pickAndLinkExistingFile(_db);
	linkedHandle = handle;
	store.linkedFileName = handle.name;
	store.linkedFileStatus = 'active';
	store.linkedFileError = null;

	// Read the existing file in, by whichever path its lineage calls for
	try {
		await applyPayloadToDocument(await readFileData(handle));
	} catch {
		// File may be empty — that's fine, we'll write to it on next save
	}

	const modified = await readFileLastModified(handle);
	updateLastKnownModified(modified);
	store.linkedFileLastSaved = modified;

	startPollingAsLeader(handle);
}

export async function unlinkFile(): Promise<void> {
	const _db = await ensureDB();

	cancelDebouncedWrite();
	stopPolling();
	await unlinkFileHandle(_db);
	linkedHandle = null;
	store.linkedFileStatus = 'none';
	store.linkedFileName = null;
	store.linkedFileLastSaved = null;
	store.linkedFileError = null;
	store.linkedFileExternalChange = false;
	store.linkedFileWriting = false;
	store.linkedFilePermissionDenied = false;
	permissionRequested = false;
}

export async function changeFile(): Promise<void> {
	await unlinkFile();
	await linkFile();
}

let permissionRequested = false;

export async function retryWrite(): Promise<void> {
	if (!linkedHandle) return;
	store.linkedFileStatus = 'active';
	store.linkedFileError = null;
	triggerAutoSave();
}

export async function reconnectFile(): Promise<void> {
	if (!linkedHandle) return;

	if (permissionRequested) {
		// Already requested this session — don't re-prompt
		return;
	}

	permissionRequested = true;
	const granted = await requestPermission(linkedHandle);
	if (granted) {
		store.linkedFileStatus = 'active';
		store.linkedFileError = null;
		store.linkedFilePermissionDenied = false;
		try {
			const modified = await readFileLastModified(linkedHandle);
			updateLastKnownModified(modified);
		} catch {
			// File may not exist yet
		}
		startPollingAsLeader(linkedHandle);
		// Retry the write that previously failed
		triggerAutoSave();
	} else {
		store.linkedFilePermissionDenied = true;
	}
}

/** What a merge would bring in, rendered by the preview modal before the user commits (#77). */
export interface MergePreview {
	/** The collection delta. Rendered first, ahead of every list. */
	collection: CardsDelta;
	/** One entry per list the merge would touch, in merge order. */
	lists: ListMergeDetail[];
	/** True when the file holds nothing the local document is missing. */
	unchanged: boolean;
	/**
	 * Which of the two operations this file gets (C4). `merge` can remove things;
	 * `union` never does. The user is entitled to know which — same bytes,
	 * different results.
	 */
	operation: 'merge' | 'union';
}

/**
 * Show what the file would do, without doing it.
 *
 * Both paths are computed without touching the live document. The union is pure
 * arithmetic over two arrays. The merge is run against a **throwaway clone** of
 * the document — the only honest way to preview an operation whose result
 * depends on history and tombstones, and the only way to see the removals a
 * union could never produce.
 *
 * The commit path re-reads the file rather than reusing this result: it may have
 * changed again while the modal was open, and the newer state is the one worth
 * applying.
 */
export async function previewMergeFromFile(): Promise<MergePreview | null> {
	if (!linkedHandle || !doc) return null;

	const fileData = await readFileData(linkedHandle);
	return previewPayload(fileData);
}

/** The preview for a payload from any transport — the linked file, an upload, a peer. */
export function previewPayload(data: Uint8Array): MergePreview {
	const current = requireDoc();
	const before = { collection: liveCollection(), cardLists: liveLists() };

	const incoming = peekPayload(data);

	if (incoming.guid && incoming.guid === documentGuid()) {
		const clone = createDocument(current.guid);
		applyRemoteUpdate(clone, updateFor(current), 'file');
		applyRemoteUpdate(clone, data, 'file');

		const after = {
			collection: docReadCollection(clone),
			cardLists: docReadLists(clone) as CardList[]
		};
		const diff = diffProjections(before, after);
		clone.destroy();

		return {
			collection: diff.collection,
			lists: diff.lists,
			unchanged:
				diff.lists.length === 0 && diff.collection.added === 0 && diff.collection.removed === 0,
			operation: 'merge'
		};
	}

	const payload = readPayload(data);
	const lists = mergeCardListSets(before.cardLists, payload.cardLists);
	const collection = mergeCollections(before.collection, payload.collection);

	return {
		collection: collection.delta,
		lists: lists.details,
		unchanged: lists.details.length === 0 && collection.changed.length === 0,
		operation: 'union'
	};
}

export async function mergeFromFile(): Promise<void> {
	if (!linkedHandle || !doc) return;

	await applyPayloadToDocument(await readFileData(linkedHandle));

	// Write the result back. The apply itself does not trigger an autosave —
	// writing back what just arrived is how a merge loop starts — so the push is
	// explicit here, through the same queue rather than racing it.
	cancelDebouncedWrite();
	await performWrite(linkedHandle);
	store.linkedFileExternalChange = false;
}

/**
 * Read a restore file and validate it without touching the database, so the UI
 * can show what is about to be loaded — and refuse the file — before the user
 * commits to a destructive restore (#52). Throws `ImportValidationError`.
 */
export async function inspectImportFile(file: File): Promise<ImportPayload> {
	const data = new Uint8Array(await file.arrayBuffer());
	const payload = parseImportFile(data);
	assertRestorable(payload);
	return payload;
}

/**
 * Restore from a file: adopt what it holds, in place of what is here.
 *
 * Destructive, and differently so than before. "Restore" no longer means clear
 * the stores and refill them — for a document it means **adopt the file's
 * lineage wholesale**, guid and all, so the restored database is a replica of
 * the one the file came from rather than a stranger holding the same values.
 * Anything else would leave every other device unable to sync with it.
 */
export async function loadFromFile(
	file: File,
	onProgress?: (current: number, total: number) => void
): Promise<{ imported: number; merged: number; errors: number }> {
	const _db = await ensureDB();
	const data = new Uint8Array(await file.arrayBuffer());

	// Validated before anything is destroyed: a file that is not one of ours, or
	// one that decodes to nothing, must not reach the point of clearing (#52).
	const payload = parseImportFile(data);
	assertRestorable(payload);

	const result = await adoptPayload(_db, payload, data, onProgress);

	store.dbMode = 'active';
	await putMetadata(_db, 'autoLoadDB', true);
	await loadCardFactsIndex();
	void hydrateCardFacts();
	triggerAutoSave();
	return result;
}

/**
 * Replace the local lineage with the file's.
 *
 * A document payload is adopted whole — its guid becomes ours, which is what
 * makes the restored database a peer of every other replica of that document.
 * A plain-JSON payload has no lineage to adopt, so it seeds a fresh one.
 */
async function adoptPayload(
	_db: IDBDatabase,
	payload: ImportPayload,
	data: Uint8Array,
	onProgress?: (current: number, total: number) => void
): Promise<{ imported: number; merged: number; errors: number }> {
	// The facts, before the whitelist drops them on the way into the document.
	await cacheCardFacts(
		[...payload.collection, ...payload.cardLists.flatMap((list) => list.cards)],
		_db
	);

	await closeDocument();
	await destroyPersistence();

	const guid = payload.guid ?? crypto.randomUUID();
	await putMetadata(_db, GUID_KEY, guid);
	store.currentCardListId = null;

	const adopted = await openDocument({ persist: true });

	if (payload.format === 'document') {
		applyRemoteUpdate(adopted, data, 'file');
	} else {
		seedDocument(adopted, { collection: payload.collection, cardLists: payload.cardLists });
	}

	onProgress?.(payload.cardLists.length, payload.cardLists.length);
	return { imported: payload.cardLists.length, merged: 0, errors: 0 };
}

/**
 * Import a payload without destroying anything — the additive path, used by the
 * DB modal's merge option. Same two-way classification as the linked file.
 */
export async function importDatabase(
	data: Uint8Array,
	merge: boolean = true,
	onProgress?: (current: number, total: number) => void
): Promise<{ imported: number; merged: number; errors: number }> {
	const _db = await ensureDB();
	const payload = parseImportFile(data);
	if (!merge) assertRestorable(payload);

	if (!merge) return adoptPayload(_db, payload, data, onProgress);

	const before = liveLists().length;

	if (payload.format === 'document') {
		await applyPayloadToDocument(data);
	} else {
		await cacheCardFacts(
			[...payload.collection, ...payload.cardLists.flatMap((list) => list.cards)],
			_db
		);
		unionIntoDocument(payload.cardLists, payload.collection);
	}

	onProgress?.(payload.cardLists.length, payload.cardLists.length);

	const added = Math.max(0, liveLists().length - before);
	return { imported: added, merged: payload.cardLists.length - added, errors: 0 };
}

// ==================== SCRYFALL BATCH FETCH ====================

const SCRYFALL_COLLECTION_URL = 'https://api.scryfall.com/cards/collection';
const SCRYFALL_BATCH_SIZE = 75;

/**
 * Batch-fetch cards by name using Scryfall's /cards/collection endpoint.
 * Deduplicates names (case-insensitive), chunks into batches of 75,
 * and returns a Map keyed by lowercase card name.
 */
async function fetchCardsByName(
	names: string[],
	onProgress?: (fetched: number, total: number) => void
): Promise<{ found: Map<string, any>; notFound: string[] }> {
	// Deduplicate names (case-insensitive)
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch collection, not reactive state
	const seen = new Set<string>();
	const uniqueNames: string[] = [];
	for (const name of names) {
		const key = name.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			uniqueNames.push(name);
		}
	}

	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch collection, not reactive state
	const found = new Map<string, any>();
	const notFound: string[] = [];
	const totalBatches = Math.ceil(uniqueNames.length / SCRYFALL_BATCH_SIZE);
	let completedBatches = 0;

	// Process in chunks of 75
	for (let i = 0; i < uniqueNames.length; i += SCRYFALL_BATCH_SIZE) {
		const chunk = uniqueNames.slice(i, i + SCRYFALL_BATCH_SIZE);
		const identifiers = chunk.map((name) => ({ name }));

		try {
			const response = await fetch(SCRYFALL_COLLECTION_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifiers })
			});

			if (response.ok) {
				const result = await response.json();
				for (const card of result.data ?? []) {
					found.set(card.name.toLowerCase(), card);
				}
				for (const entry of result.not_found ?? []) {
					notFound.push(entry.name);
				}
			} else {
				// Treat all cards in this batch as not found
				notFound.push(...chunk);
			}
		} catch (error) {
			logAppError('scryfall-api', error, {
				operation: 'fetchCardsByName',
				batchSize: chunk.length
			});
			notFound.push(...chunk);
		}

		completedBatches++;
		onProgress?.(completedBatches, totalBatches);
	}

	return { found, notFound };
}

/**
 * Batch-fetch cards by Scryfall ID using /cards/collection endpoint.
 * Returns a Map keyed by card ID.
 */
async function fetchCardsByIds(
	ids: string[],
	onProgress?: (fetched: number, total: number) => void,
	// `pauseMs` is for the unattended caller (fact hydration): a user-triggered
	// import is one deliberate action and goes at full speed, but a background
	// refill of the facts cache should not machine-gun Scryfall on page load.
	options: { pauseMs?: number } = {}
): Promise<{ found: Map<string, any>; notFound: string[] }> {
	const uniqueIds = [...new Set(ids)];
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch collection, not reactive state
	const found = new Map<string, any>();
	const notFound: string[] = [];
	const totalBatches = Math.ceil(uniqueIds.length / SCRYFALL_BATCH_SIZE);
	let completedBatches = 0;

	for (let i = 0; i < uniqueIds.length; i += SCRYFALL_BATCH_SIZE) {
		const chunk = uniqueIds.slice(i, i + SCRYFALL_BATCH_SIZE);
		const identifiers = chunk.map((id) => ({ id }));

		if (i > 0 && options.pauseMs) {
			await new Promise((resolve) => setTimeout(resolve, options.pauseMs));
		}

		try {
			const response = await fetch(SCRYFALL_COLLECTION_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifiers })
			});

			if (response.ok) {
				const result = await response.json();
				for (const card of result.data ?? []) {
					found.set(card.id, card);
				}
				for (const entry of result.not_found ?? []) {
					notFound.push(entry.id);
				}
			} else {
				notFound.push(...chunk);
			}
		} catch (error) {
			logAppError('scryfall-api', error, {
				operation: 'fetchCardsByIds',
				batchSize: chunk.length
			});
			notFound.push(...chunk);
		}

		completedBatches++;
		onProgress?.(completedBatches, totalBatches);
	}

	return { found, notFound };
}

// ==================== COLLECTION FUNCTIONS ====================
//
// Every mutator below writes to the document and stops. The runes are rebuilt
// by the observer, and the linked-file save is triggered by `doc.on('update')`
// — which is why none of these assigns to `store.*` or calls
// `triggerAutoSave()` any more. Fourteen call sites collapsed into one
// subscription; the document knows when it changed.

/** Re-read the collection from the document. */
export async function loadCollection() {
	projectDocument();
	return store.collection;
}

/** Add copies to the collection, on top of whatever is already owned. */
export async function addToCollection(card: any, quantity: number = 1) {
	assertWritable();
	const current = requireDoc();

	await cacheCardFacts([card]);

	const existing = docReadCollectionCard(current, card.id);
	const owned = (existing?.quantity_owned ?? 0) + quantity;
	docUpsertCollectionCard(current, card, owned);

	return toStoredCollectionCard(card, owned);
}

/** Remove copies; the card itself goes when the last one does. */
export async function removeFromCollection(card: any, quantity: number = 1) {
	assertWritable();
	const current = requireDoc();

	const existing = docReadCollectionCard(current, card.id);
	if (!existing) {
		throw new Error('Card not in collection');
	}

	const owned = existing.quantity_owned - quantity;

	if (owned <= 0) {
		// A real deletion, and a propagating one: the document carries a tombstone,
		// so this removal reaches every replica instead of being resurrected by the
		// next merge (#46).
		docRemoveCollectionCard(current, card.id);
		return null;
	}

	docSetCollectionQuantity(current, card.id, owned);
	return toStoredCollectionCard(existing, owned);
}

/** Set the owned count outright — an assertion about the shelf, not an increment. */
export async function updateCollectionQuantity(card: any, quantity: number) {
	assertWritable();

	if (quantity <= 0) {
		return removeFromCollection(card, Number.MAX_SAFE_INTEGER);
	}

	await cacheCardFacts([card]);
	docUpsertCollectionCard(requireDoc(), card, quantity);

	return toStoredCollectionCard(card, quantity);
}

/**
 * Get quantity owned of a specific card
 */
export function getOwnedQuantity(cardId: string) {
	const card = store.collection.find((c) => c.id === cardId);
	return card?.quantity_owned || 0;
}

/**
 * Import collection from text.
 * Uses Scryfall's /cards/collection endpoint to batch-fetch cards (up to 75 per request).
 */
export async function importCollectionFromText(
	text: string,
	onProgress?: (current: number, total: number) => void
) {
	assertWritable();
	const lines = text.split('\n').filter((line) => line.trim());
	const results = { success: 0, failed: 0 };

	// 1. Parse all lines
	const parsed: { quantity: number; name: string }[] = [];
	for (const line of lines) {
		if (line.startsWith('#')) continue;
		const match = line.match(/^(\d+)\s+(.+)$/);
		if (match) {
			parsed.push({ quantity: parseInt(match[1]), name: match[2].trim() });
		}
	}

	// 2. Batch-fetch all unique card names
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch collection, not reactive state
	const uniqueNames = [...new Set(parsed.map((p) => p.name.toLowerCase()))].map(
		(lower) => parsed.find((p) => p.name.toLowerCase() === lower)!.name
	);
	const { found } = await fetchCardsByName(uniqueNames, onProgress);

	// Cache the batch's facts once, ahead of the loop: the per-card writes below
	// keep only the whitelist, and re-extracting per card would be wasted work.
	await cacheCardFacts([...found.values()]);

	// 3. Process results
	for (const entry of parsed) {
		const card = found.get(entry.name.toLowerCase());
		if (card) {
			try {
				await updateCollectionQuantity(card, entry.quantity);
				results.success++;
			} catch (error) {
				logAppError('import', error, {
					operation: 'importCollectionFromText',
					cardName: entry.name,
					quantity: entry.quantity
				});
				results.failed++;
			}
		} else {
			results.failed++;
		}
	}

	triggerAutoSave();
	return results;
}

/**
 * Resolve a ParsedCard to Scryfall card data.
 * Uses the Scryfall ID when available (exact printing), falls back to name lookup.
 * Returns the card keyed by scryfallId or lowercase name for consistent lookup.
 */
async function fetchParsedCards(
	cards: { quantity: number; name: string; scryfallId?: string }[],
	onProgress?: (current: number, total: number) => void
): Promise<{ byId: Map<string, any>; byName: Map<string, any>; notFound: string[] }> {
	const uniqueIds = [...new Set(cards.filter((c) => c.scryfallId).map((c) => c.scryfallId!))];
	const namesWithoutId = cards.filter((c) => !c.scryfallId);
	const uniqueNames = [...new Set(namesWithoutId.map((c) => c.name.toLowerCase()))].map(
		(lower) => namesWithoutId.find((c) => c.name.toLowerCase() === lower)!.name
	);

	const idBatches = uniqueIds.length > 0 ? Math.ceil(uniqueIds.length / SCRYFALL_BATCH_SIZE) : 0;
	const nameBatches =
		uniqueNames.length > 0 ? Math.ceil(uniqueNames.length / SCRYFALL_BATCH_SIZE) : 0;
	const totalBatches = idBatches + nameBatches;
	let completedBatches = 0;

	const reportProgress = () => {
		completedBatches++;
		onProgress?.(completedBatches, totalBatches);
	};

	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch collection, not reactive state
	const byId = new Map<string, any>();
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch collection, not reactive state
	const byName = new Map<string, any>();
	const notFound: string[] = [];

	if (uniqueIds.length > 0) {
		const result = await fetchCardsByIds(uniqueIds, reportProgress);
		for (const [id, card] of result.found) byId.set(id, card);
		notFound.push(...result.notFound);
	}

	if (uniqueNames.length > 0) {
		const result = await fetchCardsByName(uniqueNames, reportProgress);
		for (const [name, card] of result.found) byName.set(name, card);
		notFound.push(...result.notFound);
	}

	return { byId, byName, notFound };
}

/** Look up a card from the fetch results. */
function resolveCard(
	entry: { name: string; scryfallId?: string },
	byId: Map<string, any>,
	byName: Map<string, any>
): any | undefined {
	if (entry.scryfallId) return byId.get(entry.scryfallId);
	return byName.get(entry.name.toLowerCase());
}

/**
 * Import pre-parsed cards into the collection.
 * Uses Scryfall IDs when available (e.g. TopDecked CSV), falls back to name lookup.
 */
export async function importCardsToCollection(
	cards: { quantity: number; name: string; scryfallId?: string }[],
	onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number; notFound: string[] }> {
	assertWritable();

	const { byId, byName, notFound } = await fetchParsedCards(cards, onProgress);
	await cacheCardFacts([...byId.values(), ...byName.values()]);

	let success = 0;
	let failed = 0;
	for (const entry of cards) {
		const card = resolveCard(entry, byId, byName);
		if (card) {
			try {
				await updateCollectionQuantity(card, entry.quantity);
				success++;
			} catch (error) {
				logAppError('import', error, {
					operation: 'importCardsToCollection',
					cardName: entry.name,
					quantity: entry.quantity
				});
				failed++;
			}
		} else {
			failed++;
		}
	}

	triggerAutoSave();
	return { success, failed, notFound };
}

/**
 * Import pre-parsed cards as a new card list.
 * Creates a new list rather than overwriting the current one.
 * Uses Scryfall IDs when available, falls back to name lookup.
 */
export async function importCardsToNewList(
	cards: { quantity: number; name: string; scryfallId?: string }[],
	listName: string,
	onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number; notFound: string[] }> {
	assertWritable();

	const { byId, byName, notFound } = await fetchParsedCards(cards, onProgress);
	await cacheCardFacts([...byId.values(), ...byName.values()]);

	const newCards: Card[] = [];
	let failed = 0;
	for (const entry of cards) {
		const card = resolveCard(entry, byId, byName);
		if (card) {
			newCards.push(toStoredListCard(card, entry.quantity));
		} else {
			failed++;
		}
	}

	// Create a new list, switch to it, then fill it with the imported cards
	const created = await createNewCardList();
	docUpdateList(requireDoc(), created.id!, { name: listName });
	await replaceListCards(created.id!, newCards);

	return { success: newCards.length, failed, notFound };
}

/**
 * Export the collection as RFC 4180 CSV — a header row plus one row per card,
 * using the column names `import-parser.ts` recognises so the file re-imports (#50).
 */
export function exportCollectionToCSV(fields: string[]): string {
	return formatCollectionAsCSV(store.collection, fields);
}

/**
 * Export the collection as space-separated text (`4 Lightning Bolt`) — the form
 * `parsePlainText()` reads and that other MTG tools accept as pasted input.
 */
export function exportCollectionToText(fields: string[]): string {
	return formatCollectionAsText(store.collection, fields);
}

/**
 * The head of an export, for the preview box only (#63). Download and copy go
 * through the full formatters above — a preview is never what lands in a file.
 */
export function exportCollectionPreview(
	fields: string[],
	format: ExportFormat,
	limit?: number
): ExportPreview {
	return buildExportPreview(store.collection, fields, format, limit);
}

// ==================== CARD LIST FUNCTIONS ====================

/** Re-read the lists from the document. */
export async function loadCardLists() {
	projectDocument();
	return store.savedCardLists;
}

/** A new, empty list, selected. Its UUID is stable for life (#47). */
export async function createNewCardList() {
	assertWritable();
	const current = requireDoc();

	const id = docCreateList(current, 'A list');
	store.currentCardListId = id;

	return docReadList(current, id) as CardList;
}

/**
 * Reconcile one list's cards to exactly this array.
 *
 * Per-card operations rather than a whole-row rewrite: two replicas touching
 * two different cards in one deck commute this way, where a row rewrite made
 * them a conflict. Cards absent from `cards` are deleted, which is a tombstone
 * and therefore propagates.
 */
export async function replaceListCards(listId: string, cards: Card[]): Promise<void> {
	const current = requireDoc();

	// A list holds each printing once — it is a map keyed by card id. An import
	// that names the same printing on two lines means four copies plus three,
	// not "three, and forget the four", so duplicates accumulate here rather
	// than the last one silently winning.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch collection, not reactive state
	const incoming = new Map<string, Card>();
	for (const card of cards) {
		const seen = incoming.get(card.id);
		incoming.set(
			card.id,
			seen ? { ...seen, LM_quantity: seen.LM_quantity + card.LM_quantity } : card
		);
	}
	const existing = docReadList(current, listId)?.cards ?? [];

	current.transact(() => {
		for (const card of existing) {
			if (!incoming.has(card.id)) docRemoveListCard(current, listId, card.id);
		}
		for (const card of incoming.values()) {
			docUpsertListCard(current, listId, card, card.LM_quantity);
		}
	});

	// Every mutator settles with the runes already rebuilt: the observer's
	// microtask was queued inside the transaction above, so it runs before this
	// continuation does. Callers get one contract, not two.
	await Promise.resolve();
}

/** Delete the selected list. The tombstone is what makes it stay deleted. */
export async function deleteCardList() {
	assertWritable();

	const listId = store.currentCardListId;
	if (!listId || !liveList(listId)) {
		throw new Error('No card list selected');
	}

	docRemoveList(requireDoc(), listId);
	// The observer picks the next list; clearing here keeps the intervening
	// microtask from rendering a selection that no longer exists.
	store.currentCardListId = null;
}

/**
 * Add every card in the current list to the collection, respecting LM_quantity.
 *
 * One transaction, so the observer rebuilds once and the grid repaints once —
 * the same reason this was a single batched write before (#62), now expressed
 * as a document transaction instead of an IndexedDB one.
 */
export async function addAllToCollection(): Promise<{ added: number; failed: number }> {
	assertWritable();
	const cards = liveList(store.currentCardListId)?.cards ?? [];
	if (cards.length === 0) return { added: 0, failed: 0 };

	try {
		const current = requireDoc();
		const merge = mergeCardsIntoCollection(liveCollection(), cards, toStoredCollectionCard);

		current.transact(() => {
			for (const card of merge.touched) {
				docUpsertCollectionCard(current, card, card.quantity_owned);
			}
		});

		return { added: cards.length, failed: 0 };
	} catch (e) {
		logAppError('indexeddb', e, { operation: 'addAllToCollection', cardCount: cards.length });
		return { added: 0, failed: cards.length };
	}
}

/** Rename the selected list. A rename is a rename: the id does not move. */
export async function updateListName(name: string) {
	assertWritable();
	const listId = store.currentCardListId;
	if (!listId) throw new Error('No card list selected');

	docUpdateList(requireDoc(), listId, { name });
}

/**
 * Update cardMatching and/or languageMatching params for current list
 */
export async function updateListParams(params: Partial<OwnershipCheckParams>) {
	assertWritable();
	const listId = store.currentCardListId;
	if (!listId) throw new Error('No card list selected');

	docUpdateList(requireDoc(), listId, params);
}

/** Add one copy of a card to the current list, creating a list if there is none. */
export async function addCardToList(card: any) {
	assertWritable();

	if (!store.currentCardList) await createNewCardList();
	const listId = store.currentCardListId!;

	// Unconditionally, even when the card is already in the list: the list may
	// have come from a file whose facts this device has never seen (#84).
	await cacheCardFacts([card]);

	const existing = liveList(listId)?.cards.find((item) => item.id === card.id);
	docUpsertListCard(requireDoc(), listId, card, (existing?.LM_quantity ?? 0) + 1);
}

/** Remove one copy; the card itself goes when the last copy does. */
export async function removeCardFromList(card: any) {
	assertWritable();

	const listId = store.currentCardListId;
	if (!listId) return;

	const existing = liveList(listId)?.cards.find((item) => item.id === card.id);
	if (!existing) return;

	if (existing.LM_quantity > 1) {
		docSetListCardQuantity(requireDoc(), listId, card.id, existing.LM_quantity - 1);
	} else {
		docRemoveListCard(requireDoc(), listId, card.id);
	}
}

/**
 * Import list from text.
 * Uses Scryfall's /cards/collection endpoint to batch-fetch cards (up to 75 per request).
 */
export async function importListFromText(
	text: string,
	onProgress?: (current: number, total: number) => void
) {
	assertWritable();

	// No list yet (fresh or list-less database): create one on demand
	if (!store.currentCardList) await createNewCardList();

	const lines = text.split('\n').filter((line) => line.trim());
	let newName = store.currentCardList?.name || 'Nuovo mazzo';

	// 1. Parse all lines
	const parsed: { quantity: number; name: string }[] = [];
	for (const line of lines) {
		if (line.startsWith('#')) {
			newName = line.replace('#', '').trim();
			continue;
		}
		const match = line.match(/^(\d+)\s+(.+)$/);
		if (match) {
			parsed.push({ quantity: parseInt(match[1]), name: match[2].trim() });
		}
	}

	// 2. Batch-fetch all unique card names
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch collection, not reactive state
	const uniqueNames = [...new Set(parsed.map((p) => p.name.toLowerCase()))].map(
		(lower) => parsed.find((p) => p.name.toLowerCase() === lower)!.name
	);
	const { found } = await fetchCardsByName(uniqueNames, onProgress);
	await cacheCardFacts([...found.values()]);

	// 3. Build card list from results, merging duplicates by card id
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- local scratch collection, not reactive state
	const cardMap = new Map<string, Card>();
	for (const entry of parsed) {
		const card = found.get(entry.name.toLowerCase());
		if (card) {
			const existing = cardMap.get(card.id);
			if (existing) {
				existing.LM_quantity += entry.quantity;
			} else {
				cardMap.set(card.id, toStoredListCard(card, entry.quantity));
			}
		} else {
			logAppError('scryfall-api', `Card not found: ${entry.name}`, {
				operation: 'importListFromText',
				cardName: entry.name
			});
		}
	}
	const newCards = [...cardMap.values()];

	const listId = store.currentCardListId!;
	docUpdateList(requireDoc(), listId, { name: newName });
	await replaceListCards(listId, newCards);

	return docReadList(requireDoc(), listId) as CardList;
}

/**
 * Export current list to text
 */
export function exportListToText() {
	const name = store.currentCardList?.name || 'List';
	const cards = store.listCards;

	let listText = `# ${name}\n\n`;
	cards.forEach((card) => {
		listText += `${card.LM_quantity} ${card.name}\n`;
	});

	return listText;
}
