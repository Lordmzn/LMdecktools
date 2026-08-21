import {
	openDatabase,
	clearDatabase,
	checkLocalDatabase,
	loadAllCardLists,
	saveCardList as dbSaveCardList,
	deleteCardList as dbDeleteCardList,
	createEmptyCardList,
	loadCollection as dbLoadCollection,
	saveCollectionCard,
	saveCollectionCards,
	deleteCollectionCard,
	getCollectionCard,
	findCardListByName,
	mergeCards,
	putMetadata,
	getMetadata,
	useStorageFactory,
	type Card,
	type CardList,
	type CollectionCard
} from './db';
import { detectInstallContext, type InstallContext } from './install-context';

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
import { exportWithMetadata, importWithMetadata } from './yjs-integration';
import { mergeCardListSets, mergeCollections } from './merge';
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

// Database reference
let db: IDBDatabase | null = null;

/** Ensure db is open, re-opening if needed (e.g. after HMR or race condition). */
async function ensureDB(): Promise<IDBDatabase> {
	if (!db) {
		db = await openDatabase();
	}
	return db;
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

	// Card list state
	savedCardLists = $state<CardList[]>([]);
	currentCardListIndex = $state(NaN);
	currentCardList = $derived(
		!isNaN(this.currentCardListIndex) ? this.savedCardLists[this.currentCardListIndex] : null
	);
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
 * Load everything the UI reads: the user's data from IndexedDB, then the facts
 * that make it drawable. The refetch of what the cache is missing is deliberately
 * not awaited — it needs the network, and the lists are readable without it.
 */
async function loadCardData(): Promise<void> {
	await Promise.all([loadCardLists(), loadCollection()]);
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
 */
export async function enterPreviewMode() {
	const { IDBFactory: MemoryFactory } = await import('fake-indexeddb');
	useStorageFactory(new MemoryFactory());

	db = await openDatabase();
	store.dbMode = 'active';
	await loadCardData();
}

/**
 * Try to auto-load the local database if the user previously connected it.
 * Called once on app startup from +layout.svelte.
 */
export async function tryAutoLoadDB() {
	if (store.dbMode !== 'none') return;

	const exists = await checkLocalDatabase();
	if (!exists) return;

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
 * Open database in read-only peek mode (data visible, writes blocked)
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

export async function clearDB() {
	const _db = await ensureDB();
	await clearDatabase(_db);
	console.log('clearDB done');
}

/** Close the IndexedDB connection (used in tests to allow deleteDatabase) */
export function closeDB() {
	if (db) {
		db.close();
		db = null;
	}
}

export function exportDB() {
	return exportWithMetadata(store);
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
			await writeWithRetry(handle, exportWithMetadata(store));
			const ts = Date.now();
			updateLastKnownModified(ts);
			applyWriteSuccess(ts);
		} catch (error) {
			applyWriteError(error);
		}
	});
}

function triggerAutoSave(): void {
	if (store.linkedFileStatus !== 'active' || !linkedHandle) return;

	store.linkedFileWriting = true;
	scheduleDebouncedWrite(
		linkedHandle,
		() => exportWithMetadata(store),
		applyWriteSuccess,
		applyWriteError
	);
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
			startPolling(handle, handleExternalChange);
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

	startPolling(handle, handleExternalChange);
}

/**
 * Merge a snapshot read from the linked file into the local database, then
 * reload the store.
 *
 * Additive only: the database is never cleared and no record is deleted, so a
 * card that exists only locally always survives the merge (#46). Only the
 * records the merge actually touches are written back.
 */
async function mergeSnapshotIntoDB(
	_db: IDBDatabase,
	remoteLists: CardList[],
	remoteCollection: CollectionCard[]
): Promise<void> {
	// Read local state from the DB rather than the store: it is authoritative
	// and free of Svelte proxies, which IndexedDB cannot serialize.
	const [localLists, localCollection] = await Promise.all([
		loadAllCardLists(_db),
		dbLoadCollection(_db)
	]);

	// Same as the restore path: a snapshot written before #84 still carries the
	// facts, and this is the last moment they exist before the write strips them.
	await cacheCardFacts([...remoteCollection, ...remoteLists.flatMap((list) => list.cards)], _db);

	const lists = mergeCardListSets(localLists, remoteLists);
	for (const list of lists.changed) {
		await dbSaveCardList(_db, list);
	}

	const collection = mergeCollections(localCollection, remoteCollection);
	for (const card of collection.changed) {
		await saveCollectionCard(_db, card);
	}

	await loadCardData();
}

export async function linkExistingFile(): Promise<void> {
	const _db = await ensureDB();

	const handle = await pickAndLinkExistingFile(_db);
	linkedHandle = handle;
	store.linkedFileName = handle.name;
	store.linkedFileStatus = 'active';
	store.linkedFileError = null;

	// Read existing file and merge into current DB
	try {
		const fileData = await readFileData(handle);
		const { cardLists: remoteLists, collection: remoteCollection } = importWithMetadata(fileData);

		await mergeSnapshotIntoDB(_db, remoteLists, remoteCollection);
	} catch {
		// File may be empty — that's fine, we'll write to it on next save
	}

	const modified = await readFileLastModified(handle);
	updateLastKnownModified(modified);
	store.linkedFileLastSaved = modified;

	startPolling(handle, handleExternalChange);
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
		startPolling(linkedHandle, handleExternalChange);
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
	/** True when the snapshot holds nothing the local database is missing. */
	unchanged: boolean;
}

/**
 * Run the merge without writing anything, to show what it would bring in.
 *
 * `mergeCardListSets` / `mergeCollections` are pure, so this costs one file
 * read and one DB read and touches neither IndexedDB nor the store. The commit
 * path re-reads the file rather than reusing this result: the file could have
 * changed again while the modal was open, and merging the newer snapshot is
 * both cheap and the safer of the two outcomes — the merge is additive either
 * way, so a stale preview can only understate what arrives.
 */
export async function previewMergeFromFile(): Promise<MergePreview | null> {
	if (!linkedHandle || !db) return null;

	const fileData = await readFileData(linkedHandle);
	const { cardLists: remoteLists, collection: remoteCollection } = importWithMetadata(fileData);

	const [localLists, localCollection] = await Promise.all([
		loadAllCardLists(db),
		dbLoadCollection(db)
	]);

	const lists = mergeCardListSets(localLists, remoteLists);
	const collection = mergeCollections(localCollection, remoteCollection);

	return {
		collection: collection.delta,
		lists: lists.details,
		unchanged: lists.details.length === 0 && collection.changed.length === 0
	};
}

export async function mergeFromFile(): Promise<void> {
	if (!linkedHandle || !db) return;

	const fileData = await readFileData(linkedHandle);
	const { cardLists: remoteLists, collection: remoteCollection } = importWithMetadata(fileData);

	await mergeSnapshotIntoDB(db, remoteLists, remoteCollection);

	// Write merged result back to file. Reloading the store above fires autosaves,
	// so this must go through the same queue rather than racing them.
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
 * Load database from a file (JSON or Yjs format).
 * Clears existing data, imports from the file, then reloads the store.
 */
export async function loadFromFile(
	file: File,
	onProgress?: (current: number, total: number) => void
): Promise<{ imported: number; merged: number; errors: number }> {
	const _db = await ensureDB();

	const buffer = await file.arrayBuffer();
	const data = new Uint8Array(buffer);

	// importDatabase validates before it writes; leave dbMode alone until it
	// succeeds, so a rejected file changes nothing at all (#52)
	const result = await importDatabase(_db, data, false, onProgress);
	store.dbMode = 'active';
	await loadCardData();
	await putMetadata(_db, 'autoLoadDB', true);
	triggerAutoSave();
	return result;
}

/**
 * Import database from a file (supports both JSON and Yjs formats)
 * Automatically detects format and handles accordingly
 */
export async function importDatabase(
	db: IDBDatabase,
	data: Uint8Array,
	merge: boolean = false,
	onProgress?: (current: number, total: number) => void
): Promise<{ imported: number; merged: number; errors: number }> {
	// Validate before destroying anything: parseImportFile throws for a file that
	// is not one of our exports, and assertRestorable throws for an empty payload,
	// both before the first write. Restoring is destructive; being wrong is fatal (#52).
	const payload = parseImportFile(data);
	if (!merge) {
		assertRestorable(payload);
	}

	const cardLists = payload.cardLists;
	const collection = payload.collection;

	// A file written before #84 carries whole Scryfall objects. The write path
	// strips them, so harvest the facts on the way in — otherwise restoring an
	// old backup would send the app back to Scryfall for cards it just read.
	await cacheCardFacts([...collection, ...cardLists.flatMap((list) => list.cards)], db);

	let imported = 0;
	let merged = 0;
	let errors = 0;

	if (!merge) {
		await clearDatabase(db);
	}

	// Import card lists
	const total = cardLists.length;
	let current = 0;
	for (const cardList of cardLists) {
		try {
			if (merge) {
				// Check if list with same name exists
				const existing = await findCardListByName(db, cardList.name);
				if (existing) {
					// Merge cards
					const mergedCards = mergeCards(existing.cards, cardList.cards);
					await dbSaveCardList(db, {
						...existing,
						cards: mergedCards,
						updated_at: Date.now()
					});
					merged++;
				} else {
					await dbSaveCardList(db, {
						...cardList,
						id: undefined, // Let autoIncrement assign new ID
						created_at: cardList.created_at || Date.now(),
						updated_at: Date.now()
					});
					imported++;
				}
			} else {
				await dbSaveCardList(db, {
					...cardList,
					id: undefined,
					created_at: cardList.created_at || Date.now(),
					updated_at: Date.now()
				});
				imported++;
			}
		} catch (error) {
			logAppError('import', error, { operation: 'importCardList', listName: cardList.name, merge });
			errors++;
		}
		current++;
		onProgress?.(current, total);
	}

	// Import collection cards
	for (const card of collection) {
		try {
			if (merge) {
				const existing = await getCollectionCard(db, card.id);
				if (existing) {
					await saveCollectionCard(db, {
						...card,
						quantity_owned: existing.quantity_owned + card.quantity_owned
					});
				} else {
					await saveCollectionCard(db, card);
				}
			} else {
				await saveCollectionCard(db, card);
			}
		} catch (error) {
			logAppError('import', error, {
				operation: 'importCollectionCard',
				cardName: card.name,
				merge
			});
			errors++;
		}
	}

	return { imported, merged, errors };
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

/**
 * Load collection from database
 */
export async function loadCollection() {
	const _db = await ensureDB();

	const cards = await dbLoadCollection(_db);
	store.collection = cards;
	return cards;
}

/**
 * Add card to collection
 */
export async function addToCollection(card: any, quantity: number = 1) {
	assertWritable();
	const _db = await ensureDB();

	const existingCard = await getCollectionCard(_db, card.id);

	// The record keeps the whitelist and the quantity; what the search result
	// carries beyond that goes to the facts cache instead (#84).
	const cardData = toStoredCollectionCard(
		card,
		existingCard ? existingCard.quantity_owned + quantity : quantity
	);

	await cacheCardFacts([card], _db);
	await saveCollectionCard(_db, cardData);

	if (existingCard) {
		const newCollection = store.collection.map((c) => (c.id === card.id ? cardData : c));
		store.collection = newCollection;
	} else {
		store.collection = [...store.collection, cardData];
	}

	triggerAutoSave();
	return cardData;
}

/**
 * Remove card from collection
 */
export async function removeFromCollection(card: any, quantity: number = 1) {
	assertWritable();
	const _db = await ensureDB();

	const existingCard = store.collection.find((c) => c.id === card.id);

	if (!existingCard) {
		throw new Error('Card not in collection');
	}

	const newQuantity = existingCard.quantity_owned - quantity;

	if (newQuantity <= 0) {
		// Remove card entirely
		await deleteCollectionCard(_db, card.id);
		const newCollection = store.collection.filter((c) => c.id !== card.id);
		store.collection = newCollection;
		triggerAutoSave();
		return null;
	} else {
		// Update quantity
		const cardData = toStoredCollectionCard(existingCard, newQuantity);

		await saveCollectionCard(_db, cardData);

		const newCollection = store.collection.map((c) => (c.id === card.id ? cardData : c));
		store.collection = newCollection;
		triggerAutoSave();
		return cardData;
	}
}

/**
 * Update card quantity in collection
 */
export async function updateCollectionQuantity(card: any, quantity: number) {
	assertWritable();
	const _db = await ensureDB();

	if (quantity <= 0) {
		return removeFromCollection(card, 9999);
	}

	const cardData = toStoredCollectionCard(card, quantity);

	await cacheCardFacts([card], _db);
	await saveCollectionCard(_db, cardData);

	const existingIndex = store.collection.findIndex((c) => c.id === card.id);
	if (existingIndex >= 0) {
		const newCollection = [...store.collection];
		newCollection[existingIndex] = cardData;
		store.collection = newCollection;
	} else {
		store.collection = [...store.collection, cardData];
	}

	triggerAutoSave();
	return cardData;
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

	// Create a new list, switch to it, then save with the imported cards
	await createNewCardList();
	await saveCardList(listName, newCards);

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

/**
 * Load all card lists from database
 */
export async function loadCardLists() {
	const _db = await ensureDB();

	store.savedCardLists = await loadAllCardLists(_db);

	// A database with no lists stays with no lists — one is created lazily the
	// first time the user adds a card (see addCardToList).
	store.currentCardListIndex = store.savedCardLists.length === 0 ? NaN : 0;
}

/**
 * Create new card list
 */
export async function createNewCardList() {
	assertWritable();
	const _db = await ensureDB();

	const newList = createEmptyCardList();
	const listId = await dbSaveCardList(_db, newList);

	const listWithId = { ...newList, id: listId };
	const newLists = [...store.savedCardLists, listWithId];

	store.savedCardLists = newLists;
	store.currentCardListIndex = newLists.length - 1;

	triggerAutoSave();
	return listWithId;
}

/**
 * Save current card list with given name and cards
 */
export async function saveCardList(name: string, cards: any[]) {
	assertWritable();
	const _db = await ensureDB();

	const index = store.currentCardListIndex;
	const currentListData = store.savedCardLists[index];

	if (!currentListData) throw new Error('No card list selected');

	// `toStoredListCard` is what drops Svelte's reactive proxies here — every
	// whitelisted value is a primitive, so the copy is structured-cloneable
	// without the `JSON.parse(JSON.stringify(...))` round trip this used to make
	// over whole Scryfall objects (#84).
	const updatedList: CardList = {
		...$state.snapshot(currentListData),
		name,
		cards: cards.map((card) => toStoredListCard(card)),
		updated_at: Date.now()
	};

	await dbSaveCardList(_db, updatedList);

	const newLists = [...store.savedCardLists];
	newLists[index] = updatedList;
	store.savedCardLists = newLists;

	triggerAutoSave();
	return updatedList;
}

/**
 * Delete current card list
 */
export async function deleteCardList() {
	assertWritable();
	const _db = await ensureDB();

	const index = store.currentCardListIndex;
	const listToDelete = store.savedCardLists[index];

	if (!listToDelete) {
		throw new Error('No card list selected');
	}

	if (listToDelete.id) {
		await dbDeleteCardList(_db, listToDelete.id);
	}

	const remaining = store.savedCardLists.filter((_, i) => i !== index);
	store.savedCardLists = remaining;
	store.currentCardListIndex = remaining.length === 0 ? NaN : Math.max(0, index - 1);
	triggerAutoSave();
}

/**
 * Add all cards in the current list to the collection, respecting LM_quantity.
 * Returns counts of added and failed cards.
 *
 * Deliberately not `addToCollection` in a loop (#62). That cost two IndexedDB
 * transactions per card, an O(n) copy of `store.collection` per card, and — via
 * the reassignment — a full ownership re-check and grid repaint per card, which
 * is what made a long list appear to cycle through itself. Here the merge
 * happens in memory against the collection we already hold, the whole batch
 * goes to disk in one transaction, and `store.collection` is assigned exactly
 * once, so the UI updates a single time.
 *
 * The batch is all-or-nothing, as an IndexedDB transaction is. The old
 * per-card `try/catch` could only ever have caught DB-level failures that would
 * have taken every other card down too, so nothing partial is lost by this.
 */
export async function addAllToCollection(): Promise<{ added: number; failed: number }> {
	assertWritable();
	// Read the list off plain state rather than the `listCards` derived: this is a
	// mutation path, not a render path, and it is the same value either way.
	const currentList = store.savedCardLists[store.currentCardListIndex];
	const cards = $state.snapshot(currentList?.cards ?? []) as any[];
	if (cards.length === 0) return { added: 0, failed: 0 };

	try {
		const _db = await ensureDB();

		const merge = mergeCardsIntoCollection(
			$state.snapshot(store.collection) as CollectionCard[],
			cards,
			toStoredCollectionCard
		);

		// Only the touched rows need writing; the rest of the collection is untouched.
		await saveCollectionCards(_db, merge.touched);

		store.collection = merge.collection;
		triggerAutoSave();

		return { added: cards.length, failed: 0 };
	} catch (e) {
		logAppError('indexeddb', e, {
			operation: 'addAllToCollection',
			cardCount: cards.length
		});
		return { added: 0, failed: cards.length };
	}
}

/**
 * Update list name
 */
export async function updateListName(name: string) {
	assertWritable();
	return saveCardList(name, $state.snapshot(store.listCards) as any[]);
}

/**
 * Update cardMatching and/or languageMatching params for current list
 */
export async function updateListParams(params: Partial<OwnershipCheckParams>) {
	assertWritable();
	const _db = await ensureDB();

	const index = store.currentCardListIndex;
	const currentListData = store.savedCardLists[index];

	if (!currentListData) throw new Error('No card list selected');

	const updatedList: CardList = {
		...$state.snapshot(currentListData),
		...params,
		updated_at: Date.now()
	};

	await dbSaveCardList(_db, updatedList);

	const newLists = [...store.savedCardLists];
	newLists[index] = updatedList;
	store.savedCardLists = newLists;

	return updatedList;
}

/**
 * Add card to current list
 */
export async function addCardToList(card: any) {
	assertWritable();

	// No list yet (fresh or list-less database): create one on demand
	if (!store.currentCardList) await createNewCardList();

	// Unconditionally, even when the card is already in the list: the list may
	// have come from a file whose facts this device has never seen (#84).
	await cacheCardFacts([card]);

	const cards = store.listCards;
	const name = store.currentCardList?.name || 'Nuovo mazzo';

	const existingIndex = cards.findIndex((item) => item.id === card.id);
	let newCards;

	if (existingIndex !== -1) {
		newCards = [...cards];
		newCards[existingIndex] = {
			...newCards[existingIndex],
			LM_quantity: newCards[existingIndex].LM_quantity + 1
		};
	} else {
		newCards = [...cards, toStoredListCard(card, 1)];
	}

	return saveCardList(name, newCards);
}

/**
 * Remove card from current list
 */
export async function removeCardFromList(card: any) {
	assertWritable();
	const cards = store.listCards;
	const name = store.currentCardList?.name || 'Nuovo mazzo';

	const existingIndex = cards.findIndex((item) => item.id === card.id);
	if (existingIndex === -1) return;

	let newCards;

	if (cards[existingIndex].LM_quantity > 1) {
		newCards = [...cards];
		newCards[existingIndex] = toStoredListCard(
			newCards[existingIndex],
			newCards[existingIndex].LM_quantity - 1
		);
	} else {
		newCards = cards.filter((_, i) => i !== existingIndex);
	}

	return saveCardList(name, newCards);
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

	return saveCardList(newName, newCards);
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
