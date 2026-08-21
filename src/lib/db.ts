/**
 * Database utilities for LM Deck Tools
 * Provides transparent IndexedDB operations with import/export capabilities
 */

import { extractCardFacts, toStoredCollectionCard, toStoredListCard } from './card-fields';
import type { StoredCard } from './card-fields';

export type CardMatching = 'generic' | 'specific';
export type LanguageMatching = 'any' | 'strict';

export interface CardList {
	/**
	 * A `crypto.randomUUID()`, assigned at creation and stable for life (#47).
	 * It used to be an IndexedDB autoIncrement key, which meant nothing on
	 * another machine; keying by name instead made a rename indistinguishable
	 * from delete-and-recreate, which under sync is a duplicated deck.
	 */
	id?: string;
	name: string;
	cards: Card[];
	cardMatching: CardMatching;
	languageMatching: LanguageMatching;
	created_at: number;
	updated_at: number;
}

/**
 * A card in a list, and a card in the collection. Both are `StoredCard` — the
 * six-field Scryfall whitelist of `card-fields.ts` — plus the one quantity the
 * user authored. No index signature on purpose (#84): the open shape is what
 * let whole Scryfall objects into every record. Anything Scryfall returns that
 * is not on the whitelist belongs in the card-facts cache.
 */
export interface Card extends StoredCard {
	LM_quantity: number;
}

export interface CollectionCard extends StoredCard {
	quantity_owned: number;
}

const DB_NAME = 'LMdecktools';
const DB_VERSION = 6;
/**
 * The two stores v6 drops (#47). The user's lists and collection live in the
 * document now; what is left in `LMdecktools` is device-local and must never
 * sync — the auto-load preference, the linked-file handle, the document guid,
 * the error journal and the card-facts cache.
 */
const LEGACY_LISTS_STORE = 'card_lists';
const LEGACY_COLLECTION_STORE = 'collection';
const METADATA_STORE = 'metadata';
export const ERROR_JOURNAL_STORE = 'error_journal';
export const CARD_FACTS_STORE = 'card_facts';

/**
 * Where the database lives. The browser's own store by default; an in-memory
 * factory in preview mode (#87), which is the whole of what makes preview mode
 * safe — an iOS browser tab must never write to a container the installed app
 * cannot read.
 *
 * Swapping the factory rather than the layer above it means preview mode runs
 * the *same* code: same transactions, same v5 upgrade path, same cursors. There
 * is no second implementation to drift out of parity with this one.
 */
let factory: IDBFactory | undefined =
	typeof indexedDB === 'undefined' ? undefined : globalThis.indexedDB;

/** Point every subsequent open at `f`. Preview mode passes an in-memory factory. */
export function useStorageFactory(f: IDBFactory): void {
	factory = f;
}

/** The factory in force, for callers that need to open a database of their own. */
export function storageFactory(): IDBFactory | undefined {
	return factory;
}

/**
 * Whether a named IndexedDB database exists.
 *
 * There are two of them since #47: `LMdecktools` for device-local state, and
 * the one `y-indexeddb` opens for the document. "Is there a database here?" is
 * now a question about both, and the store is what puts the two answers
 * together — `db.ts` has no business knowing about the document.
 */
export async function databaseExists(name: string): Promise<boolean> {
	if (!factory) return false;
	try {
		return factory.databases().then(
			(dbs) => dbs.map((db) => db.name).includes(name),
			() => false
		);
	} catch {
		console.warn("Browser doesn't support indexedDB.databases()");
		return false;
	}
}

/**
 * Check local DB existence
 */
export async function checkLocalDatabase(): Promise<boolean> {
	if (!factory) return false;
	try {
		return factory.databases().then(
			(dbs) => dbs.map((db) => db.name).includes(DB_NAME),
			() => false
		);
	} catch {
		console.warn("Browser doesn't support indexedDB.databases()");
		return false;
	}
}

/**
 * Open or create the IndexedDB database
 */
export async function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		if (!factory) {
			reject(new Error('This browser has no IndexedDB.'));
			return;
		}

		// Whatever a previous open rescued belongs to that open, not this one.
		legacySeed = null;
		const request = factory.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			reject(new Error(`Database error: ${request.error?.message}`));
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			const upgrade = (event.target as IDBOpenDBRequest).transaction;

			// v2 → v3: drop old 'decks' store
			if (db.objectStoreNames.contains('decks')) {
				db.deleteObjectStore('decks');
			}

			// Create metadata store for tracking changes
			if (!db.objectStoreNames.contains(METADATA_STORE)) {
				db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
			}

			// v3 → v4: local error journal (see error-journal.ts). Diagnostics only —
			// deliberately outside clearDatabase() and the export/restore payload.
			if (!db.objectStoreNames.contains(ERROR_JOURNAL_STORE)) {
				const journal = db.createObjectStore(ERROR_JOURNAL_STORE, {
					keyPath: 'id',
					autoIncrement: true
				});
				journal.createIndex('timestamp', 'timestamp', { unique: false });
				journal.createIndex('category', 'category', { unique: false });
			}

			// v4 → v5: card facts move out of the saved records (#84).
			if (!db.objectStoreNames.contains(CARD_FACTS_STORE)) {
				db.createObjectStore(CARD_FACTS_STORE, { keyPath: 'id' });
			}

			// v5 → v6: the lists and the collection become the document (#47).
			if (upgrade) harvestLegacyStores(db, upgrade);
		};
	});
}

/**
 * What the v6 upgrade rescued from the stores it dropped, waiting to be seeded
 * into a fresh document. Read once, by `takeLegacySeed()`.
 */
let legacySeed: { cardLists: CardList[]; collection: CollectionCard[] } | null = null;

/**
 * v5 → v6: read the legacy stores out, then delete them.
 *
 * The alpha owes no backward compatibility and the design says to seed the
 * document from scratch — but "from scratch" and "throw the maintainer's own
 * collection away" are not the same sentence, and the difference costs thirty
 * lines that expire with this upgrade. Nothing here survives it: there is no
 * dual-write, no legacy read path, and after one run the stores do not exist.
 *
 * The rows are stashed rather than converted in place because a versionchange
 * transaction cannot write to a `Y.Doc`; the store seeds from them immediately
 * after the database opens.
 */
function harvestLegacyStores(db: IDBDatabase, upgrade: IDBTransaction): void {
	const hasLists = db.objectStoreNames.contains(LEGACY_LISTS_STORE);
	const hasCollection = db.objectStoreNames.contains(LEGACY_COLLECTION_STORE);
	if (!hasLists && !hasCollection) return;

	const seed: { cardLists: CardList[]; collection: CollectionCard[] } = {
		cardLists: [],
		collection: []
	};

	// A pre-#84 database still holds whole Scryfall objects. The document takes
	// the whitelist only, so the facts are filed on the way past — otherwise the
	// upgrade would send the app back to Scryfall for cards it just read.
	const facts = upgrade.objectStore(CARD_FACTS_STORE);
	const rememberFacts = (card: unknown) => {
		const extracted = extractCardFacts(card);
		if (extracted) facts.put(extracted);
	};

	if (hasCollection) {
		const request = upgrade.objectStore(LEGACY_COLLECTION_STORE).getAll();
		request.onsuccess = () => {
			for (const card of (request.result ?? []) as CollectionCard[]) {
				rememberFacts(card);
				seed.collection.push(toStoredCollectionCard(card));
			}
			db.deleteObjectStore(LEGACY_COLLECTION_STORE);
		};
	}

	if (hasLists) {
		const request = upgrade.objectStore(LEGACY_LISTS_STORE).getAll();
		request.onsuccess = () => {
			for (const list of (request.result ?? []) as CardList[]) {
				seed.cardLists.push({
					...list,
					// The autoIncrement key is not portable; the document assigns a UUID.
					id: undefined,
					cards: (list.cards ?? []).map((card) => {
						rememberFacts(card);
						return toStoredListCard(card);
					})
				});
			}
			db.deleteObjectStore(LEGACY_LISTS_STORE);
		};
	}

	upgrade.oncomplete = () => {
		if (seed.cardLists.length > 0 || seed.collection.length > 0) legacySeed = seed;
	};
}

/**
 * The rescued v5 rows, once. Returns null on a database that never held any —
 * which is every database created from here on.
 */
export function takeLegacySeed(): { cardLists: CardList[]; collection: CollectionCard[] } | null {
	const seed = legacySeed;
	legacySeed = null;
	return seed;
}

/**
 * Update metadata in the database
 */
export async function putMetadata(db: IDBDatabase, key: string, value: any): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(METADATA_STORE, 'readwrite');
		const store = transaction.objectStore(METADATA_STORE);
		const request = store.put({ key, value, timestamp: Date.now() });

		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

/**
 * Get metadata in the database
 */
export async function getMetadata(db: IDBDatabase, key: string): Promise<any> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(METADATA_STORE, 'readonly');
		const store = transaction.objectStore(METADATA_STORE);
		const request = store.get(key);

		request.onsuccess = () => {
			resolve(request.result || null);
		};
		request.onerror = () => reject(request.error);
	});
}
