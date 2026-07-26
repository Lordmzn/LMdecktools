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
	deleteCollectionCard,
	getCollectionCard,
	findCardListByName,
	mergeCards,
	putMetadata,
	getMetadata,
	type CardList,
	type CollectionCard,
	type CardMatching,
	type LanguageMatching
} from './db';

import { exportWithMetadata, importWithMetadata, mergeCardLists } from './yjs-integration';
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

export interface OwnershipCheckResult {
	owned: boolean;
	cards: {
		card: import('./db').Card;
		owned: boolean;
	}[];
}

export interface OwnershipCheckParams {
	cardMatching: CardMatching;
	languageMatching: LanguageMatching;
}

class Store implements StoreInterface {
	// DB state
	dbMode = $state<DBMode>('none');

	// These are plain getters so they always recompute from dbMode (no reactive
	// owner required — works in both templates and test environments).
	get dbLoaded(): boolean {
		return this.dbMode !== 'none';
	}
	get isReadOnly(): boolean {
		return this.dbMode !== 'active';
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

	// Derived ownership check for current list
	listOwnershipCheck = $derived.by((): OwnershipCheckResult => {
		const list = this.currentCardList;
		if (!list) return { owned: true, cards: [] };

		const { cardMatching, languageMatching } = list;

		const cardResults = this.listCards.map((card) => {
			let candidates = this.collection.filter((c) =>
				cardMatching === 'generic' ? c.name === card.name : c.id === card.id
			);

			if (languageMatching === 'strict') {
				candidates = candidates.filter((c) => c.lang === card.lang);
			}

			const totalOwned = candidates.reduce((sum, c) => sum + c.quantity_owned, 0);
			return { card, owned: totalOwned >= card.LM_quantity };
		});

		return {
			owned: cardResults.every((r) => r.owned),
			cards: cardResults
		};
	});
}

// Export a single shared instance
export const store = new Store();

function assertWritable(): void {
	if (store.dbMode !== 'active') {
		throw new Error('Database is read-only. Please select a database to enable writing.');
	}
}

/** Strip Svelte reactive Proxy wrappers so objects can be stored in IndexedDB. */
function toPlainCard(card: any): any {
	return JSON.parse(JSON.stringify(card));
}

// ==================== INITIALIZATION ====================

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
	await Promise.all([loadCardLists(), loadCollection()]);
	await initLinkedFile();
}

/**
 * Open database in read-only peek mode (data visible, writes blocked)
 */
export async function peekDB() {
	db = await openDatabase();
	store.dbMode = 'peek';
	await Promise.all([loadCardLists(), loadCollection()]);
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
	await Promise.all([loadCardLists(), loadCollection()]);
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

// ==================== LINKED FILE ====================

let linkedHandle: FileSystemFileHandle | null = null;

function applyWriteSuccess(timestamp: number): void {
	store.linkedFileLastSaved = timestamp;
	store.linkedFileError = null;
	store.linkedFileWriting = false;
}

function applyWriteError(error: unknown): void {
	console.error('Linked file write error:', error);

	const kind = classifyWriteError(error);
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
	} catch {
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

		// Merge card lists
		const localLists = $state.snapshot(store.savedCardLists) as CardList[];
		const mergedLists = mergeCardLists(localLists, remoteLists);

		await clearDatabase(_db);
		for (const list of mergedLists) {
			await dbSaveCardList(_db, { ...list, id: undefined });
		}

		// Merge collection
		for (const remoteCard of remoteCollection) {
			const existing = await getCollectionCard(_db, remoteCard.id);
			if (existing) {
				await saveCollectionCard(_db, {
					...remoteCard,
					quantity_owned: Math.max(existing.quantity_owned, remoteCard.quantity_owned)
				});
			} else {
				await saveCollectionCard(_db, remoteCard);
			}
		}

		await Promise.all([loadCardLists(), loadCollection()]);
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

export async function mergeFromFile(): Promise<void> {
	if (!linkedHandle || !db) return;

	const fileData = await readFileData(linkedHandle);
	const { cardLists: remoteLists, collection: remoteCollection } = importWithMetadata(fileData);

	// Merge card lists via Yjs CRDT
	const localLists = $state.snapshot(store.savedCardLists) as CardList[];
	const mergedLists = mergeCardLists(localLists, remoteLists);

	// Save merged lists to IDB
	await clearDatabase(db);
	for (const list of mergedLists) {
		await dbSaveCardList(db, { ...list, id: undefined });
	}

	// Merge collection: for each remote card, add or combine quantities
	for (const remoteCard of remoteCollection) {
		const existing = await getCollectionCard(db, remoteCard.id);
		if (existing) {
			await saveCollectionCard(db, {
				...remoteCard,
				quantity_owned: Math.max(existing.quantity_owned, remoteCard.quantity_owned)
			});
		} else {
			await saveCollectionCard(db, remoteCard);
		}
	}

	// Reload store
	await Promise.all([loadCardLists(), loadCollection()]);

	// Write merged result back to file. Reloading the store above fires autosaves,
	// so this must go through the same queue rather than racing them.
	cancelDebouncedWrite();
	await performWrite(linkedHandle);
	store.linkedFileExternalChange = false;
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
	store.dbMode = 'active';

	const buffer = await file.arrayBuffer();
	const data = new Uint8Array(buffer);

	const result = await importDatabase(_db, data, false, onProgress);
	await Promise.all([loadCardLists(), loadCollection()]);
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
	let cardLists: CardList[];
	let collection: CollectionCard[] = [];

	// Try to detect format
	try {
		const decoder = new TextDecoder();
		const jsonString = decoder.decode(data);
		const importData = JSON.parse(jsonString);
		cardLists = importData.cardLists ?? importData.decks ?? [];
		collection = importData.collection ?? [];
	} catch {
		// If JSON parsing fails, try Yjs format
		try {
			const { importWithMetadata } = await import('./yjs-integration');
			const result = importWithMetadata(data);
			cardLists = result.cardLists;
			collection = result.collection;
		} catch {
			throw new Error('Invalid file format. Please use a valid .lmdb or .json export file.');
		}
	}

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
			console.error('Error importing card list:', error);
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
			console.error('Error importing collection card:', error);
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
	const seen = new Set<string>();
	const uniqueNames: string[] = [];
	for (const name of names) {
		const key = name.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			uniqueNames.push(name);
		}
	}

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
		} catch {
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
	onProgress?: (fetched: number, total: number) => void
): Promise<{ found: Map<string, any>; notFound: string[] }> {
	const uniqueIds = [...new Set(ids)];
	const found = new Map<string, any>();
	const notFound: string[] = [];
	const totalBatches = Math.ceil(uniqueIds.length / SCRYFALL_BATCH_SIZE);
	let completedBatches = 0;

	for (let i = 0; i < uniqueIds.length; i += SCRYFALL_BATCH_SIZE) {
		const chunk = uniqueIds.slice(i, i + SCRYFALL_BATCH_SIZE);
		const identifiers = chunk.map((id) => ({ id }));

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
		} catch {
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

	const cardData: CollectionCard = {
		...toPlainCard(card),
		quantity_owned: existingCard ? existingCard.quantity_owned + quantity : quantity
	};

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
		const cardData: CollectionCard = {
			...toPlainCard(existingCard),
			quantity_owned: newQuantity
		};

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

	const cardData: CollectionCard = {
		...toPlainCard(card),
		quantity_owned: quantity
	};

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
	const uniqueNames = [...new Set(parsed.map((p) => p.name.toLowerCase()))].map(
		(lower) => parsed.find((p) => p.name.toLowerCase() === lower)!.name
	);
	const { found } = await fetchCardsByName(uniqueNames, onProgress);

	// 3. Process results
	for (const entry of parsed) {
		const card = found.get(entry.name.toLowerCase());
		if (card) {
			try {
				await updateCollectionQuantity(card, entry.quantity);
				results.success++;
			} catch {
				console.error(`Failed to import ${entry.name}`);
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

	const byId = new Map<string, any>();
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

	let success = 0;
	let failed = 0;
	for (const entry of cards) {
		const card = resolveCard(entry, byId, byName);
		if (card) {
			try {
				await updateCollectionQuantity(card, entry.quantity);
				success++;
			} catch {
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

	const newCards: any[] = [];
	let failed = 0;
	for (const entry of cards) {
		const card = resolveCard(entry, byId, byName);
		if (card) {
			newCards.push({
				id: card.id,
				name: card.name,
				image_uris: card.image_uris,
				card_faces: card.card_faces,
				mana_cost: card.mana_cost,
				type_line: card.type_line,
				LM_quantity: entry.quantity
			});
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
 * Export collection to text
 */
export function exportCollectionToText(fields: string[]) {
	const cards = store.collection;

	// 1. Define how checkbox values map to card properties
	const fieldMap: Record<string, (c: any) => any> = {
		Count: (c) => c.quantity_owned,
		Name: (c) => c.name,
		Edition: (c) => c.set?.toUpperCase(),
		'Collector Number': (c) => c.collector_number,
		Foil: (c) => (c.is_foil ? '(Foil)' : ''),
		Language: (c) => c.lang,
		'Scryfall ID': (c) => c.id // it's the scryfall_id
	};

	let collectionText = `# My Collection\n\n`;

	cards
		.sort((a, b) => a.name.localeCompare(b.name))
		.forEach((card) => {
			// 2. Loop through the selected fields and get value from map
			const lineParts = fields.map((fieldKey) => {
				const getValue = fieldMap[fieldKey];
				// Execute the accessor function, or return empty string if not found
				return getValue ? getValue(card) : '';
			});

			// 3. Join with spaces, filtering out empty values (e.g. non-foils)
			const line = lineParts.join(' ');

			collectionText += `${line}\n`;
		});

	return collectionText;
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

	const updatedList: CardList = JSON.parse(
		JSON.stringify({
			...currentListData,
			name,
			cards,
			updated_at: Date.now()
		})
	);

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
 */
export async function addAllToCollection(): Promise<{ added: number; failed: number }> {
	assertWritable();
	const cards = $state.snapshot(store.listCards) as any[];
	let added = 0;
	let failed = 0;
	for (const card of cards) {
		try {
			await addToCollection(card, card.LM_quantity);
			added++;
		} catch (e) {
			console.error(`Failed to add ${card.name} to collection:`, e);
			failed++;
		}
	}
	return { added, failed };
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
		newCards = [...cards, { ...toPlainCard(card), LM_quantity: 1 }];
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
		newCards[existingIndex] = {
			...toPlainCard(newCards[existingIndex]),
			LM_quantity: newCards[existingIndex].LM_quantity - 1
		};
	} else {
		newCards = cards.filter((_, i) => i !== existingIndex).map(toPlainCard);
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
	const uniqueNames = [...new Set(parsed.map((p) => p.name.toLowerCase()))].map(
		(lower) => parsed.find((p) => p.name.toLowerCase() === lower)!.name
	);
	const { found } = await fetchCardsByName(uniqueNames, onProgress);

	// 3. Build card list from results, merging duplicates by card id
	const cardMap = new Map<string, any>();
	for (const entry of parsed) {
		const card = found.get(entry.name.toLowerCase());
		if (card) {
			const existing = cardMap.get(card.id);
			if (existing) {
				existing.LM_quantity += entry.quantity;
			} else {
				cardMap.set(card.id, {
					id: card.id,
					name: card.name,
					image_uris: card.image_uris,
					card_faces: card.card_faces,
					mana_cost: card.mana_cost,
					type_line: card.type_line,
					LM_quantity: entry.quantity
				});
			}
		} else {
			console.error(`Failed to import ${entry.name}`);
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
