/**
 * Database utilities for LM Deck Tools
 * Provides transparent IndexedDB operations with import/export capabilities
 */

import { extractCardFacts, toStoredCollectionCard, toStoredListCard } from './card-fields';
import type { StoredCard } from './card-fields';

export type CardMatching = 'generic' | 'specific';
export type LanguageMatching = 'any' | 'strict';

export interface CardList {
	id?: number;
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
const DB_VERSION = 5;
const STORE_NAME = 'card_lists';
const COLLECTION_STORE = 'collection';
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
		const request = factory.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			reject(new Error(`Database error: ${request.error?.message}`));
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;

			// v2 → v3: drop old 'decks' store, create 'card_lists' store
			if (db.objectStoreNames.contains('decks')) {
				db.deleteObjectStore('decks');
			}

			// Create card_lists store if it doesn't exist
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				const objectStore = db.createObjectStore(STORE_NAME, {
					keyPath: 'id',
					autoIncrement: true
				});
				objectStore.createIndex('name', 'name', { unique: false });
				objectStore.createIndex('updated_at', 'updated_at', { unique: false });
			}

			// Create collection store if it doesn't exist
			if (!db.objectStoreNames.contains(COLLECTION_STORE)) {
				db.createObjectStore(COLLECTION_STORE, { keyPath: 'id' });
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

			// A database that already holds records has fat ones; a brand-new
			// database (oldVersion 0) has nothing to strip.
			if (event.oldVersion > 0 && event.oldVersion < 5) {
				const upgrade = (event.target as IDBOpenDBRequest).transaction;
				if (upgrade) stripStoredCards(upgrade);
			}
		};
	});
}

/**
 * v4 → v5 migration: rewrite every stored record down to the whitelist, keeping
 * what is stripped as card facts so nothing needs refetching on day one (#84).
 *
 * Runs inside the versionchange transaction, so it either lands with the version
 * bump or not at all — there is no window where the app can read half-migrated
 * records.
 */
function stripStoredCards(transaction: IDBTransaction): void {
	const facts = transaction.objectStore(CARD_FACTS_STORE);

	const rememberFacts = (card: unknown) => {
		const extracted = extractCardFacts(card);
		if (extracted) facts.put(extracted);
	};

	const collectionCursor = transaction.objectStore(COLLECTION_STORE).openCursor();
	collectionCursor.onsuccess = () => {
		const cursor = collectionCursor.result;
		if (!cursor) return;

		const card = cursor.value as CollectionCard;
		rememberFacts(card);
		cursor.update(toStoredCollectionCard(card));
		cursor.continue();
	};

	const listCursor = transaction.objectStore(STORE_NAME).openCursor();
	listCursor.onsuccess = () => {
		const cursor = listCursor.result;
		if (!cursor) return;

		const list = cursor.value as CardList;
		const cards = (list.cards ?? []).map((card) => {
			rememberFacts(card);
			return toStoredListCard(card);
		});
		cursor.update({ ...list, cards });
		cursor.continue();
	};
}

/**
 * Clear all data from the database.
 *
 * User data only: `error_journal` (diagnostics) and `card_facts` (a refetchable
 * cache of Scryfall's own facts, like the image cache) are deliberately left
 * alone. Keeping the facts means a restore right after a clear draws its cards
 * immediately instead of waiting on the network.
 */
export async function clearDatabase(db: IDBDatabase): Promise<void> {
	await Promise.all([
		new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, 'readwrite');
			const store = transaction.objectStore(STORE_NAME);
			const request = store.clear();

			request.onsuccess = () => {
				putMetadata(db, 'last_clear', Date.now());
				resolve();
			};

			request.onerror = () => {
				reject(new Error(`Failed to clear database: ${request.error?.message}`));
			};
		}),
		new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(COLLECTION_STORE, 'readwrite');
			const store = transaction.objectStore(COLLECTION_STORE);
			const request = store.clear();

			request.onsuccess = () => {
				putMetadata(db, 'last_clear', Date.now());
				resolve();
			};

			request.onerror = () => {
				reject(new Error(`Failed to clear database: ${request.error?.message}`));
			};
		})
	]);
}

/**
 * Load all card lists from the database
 */
export async function loadAllCardLists(db: IDBDatabase): Promise<CardList[]> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.getAll();

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onerror = () => {
			reject(new Error(`Failed to load card lists: ${request.error?.message}`));
		};
	});
}

/**
 * Save a card list to the database
 */
export async function saveCardList(db: IDBDatabase, cardList: CardList): Promise<number> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);

		// The whitelist is applied here, at the boundary, and not only by the
		// callers: this is the one place every list write passes through, so a
		// caller holding a fat Scryfall object cannot put one on disk (#84).
		const listToSave = {
			...cardList,
			cards: (cardList.cards ?? []).map((card) => toStoredListCard(card)),
			updated_at: Date.now()
		};

		let request: IDBRequest;
		if (cardList.id) {
			request = store.put(listToSave);
		} else {
			// Remove id so autoIncrement can generate a new key
			const { id: _id, ...listWithoutId } = listToSave;
			request = store.add(listWithoutId);
		}

		request.onsuccess = () => {
			putMetadata(db, 'last_save', Date.now());
			resolve(request.result as number);
		};

		request.onerror = () => {
			reject(new Error(`Failed to save card list: ${request.error?.message}`));
		};
	});
}

/**
 * Delete a card list from the database
 */
export async function deleteCardList(db: IDBDatabase, listId: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readwrite');
		const store = transaction.objectStore(STORE_NAME);
		const request = store.delete(listId);

		request.onsuccess = () => {
			putMetadata(db, 'last_save', Date.now());
			resolve();
		};

		request.onerror = () => {
			reject(new Error(`Failed to delete card list: ${request.error?.message}`));
		};
	});
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

/**
 * Find a card list by name
 */
export async function findCardListByName(db: IDBDatabase, name: string): Promise<CardList | null> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, 'readonly');
		const store = transaction.objectStore(STORE_NAME);
		const index = store.index('name');
		const request = index.get(name);

		request.onsuccess = () => {
			resolve(request.result || null);
		};

		request.onerror = () => {
			reject(new Error(`Failed to find card list: ${request.error?.message}`));
		};
	});
}

/**
 * Merge two card lists, combining quantities for matching cards
 */
export function mergeCards(existing: Card[], incoming: Card[]): Card[] {
	const cardMap = new Map<string, Card>();

	// Add existing cards
	for (const card of existing) {
		cardMap.set(card.id, { ...card });
	}

	// Merge incoming cards
	for (const card of incoming) {
		const existingCard = cardMap.get(card.id);
		if (existingCard) {
			existingCard.LM_quantity += card.LM_quantity;
		} else {
			cardMap.set(card.id, { ...card });
		}
	}

	return Array.from(cardMap.values());
}

/**
 * Create a new empty card list with default values
 */
export function createEmptyCardList(): CardList {
	return {
		name: 'A list',
		cards: [],
		cardMatching: 'generic',
		languageMatching: 'any',
		created_at: Date.now(),
		updated_at: Date.now()
	};
}

// ==================== COLLECTION FUNCTIONS ====================

/**
 * Load all cards from the collection
 */
export async function loadCollection(db: IDBDatabase): Promise<CollectionCard[]> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(COLLECTION_STORE, 'readonly');
		const store = transaction.objectStore(COLLECTION_STORE);
		const request = store.getAll();

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onerror = () => {
			reject(new Error(`Failed to load collection: ${request.error?.message}`));
		};
	});
}

/**
 * Add or update a card in the collection
 */
export async function saveCollectionCard(
	db: IDBDatabase,
	card: CollectionCard
): Promise<CollectionCard> {
	// Stripped at the boundary, as in `saveCardList` — see there (#84).
	const cardToSave = toStoredCollectionCard(card);

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(COLLECTION_STORE, 'readwrite');
		const store = transaction.objectStore(COLLECTION_STORE);
		const request = store.put(cardToSave);

		request.onsuccess = () => {
			resolve(cardToSave);
		};

		request.onerror = () => {
			reject(new Error(`Failed to save card: ${request.error?.message}`));
		};
	});
}

/**
 * Add or update many cards in one transaction.
 *
 * `saveCollectionCard` in a loop costs a transaction per card, which is what
 * made adding a whole list to the collection crawl (#62). One `readwrite`
 * transaction covers the batch; the promise settles when the transaction
 * commits, so a caller that awaits it knows every card is durable.
 *
 * All-or-nothing, as IndexedDB transactions are: if one `put` fails the
 * transaction aborts and nothing in the batch lands. That is the right
 * semantics here — a half-written bulk add is worse than a failed one.
 */
export async function saveCollectionCards(
	db: IDBDatabase,
	cards: CollectionCard[]
): Promise<CollectionCard[]> {
	if (cards.length === 0) return [];

	const cardsToSave = cards.map((card) => toStoredCollectionCard(card));

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(COLLECTION_STORE, 'readwrite');
		const store = transaction.objectStore(COLLECTION_STORE);

		for (const card of cardsToSave) {
			store.put(card);
		}

		transaction.oncomplete = () => {
			resolve(cardsToSave);
		};

		transaction.onerror = () => {
			reject(new Error(`Failed to save cards: ${transaction.error?.message}`));
		};

		transaction.onabort = () => {
			reject(new Error(`Failed to save cards: ${transaction.error?.message ?? 'aborted'}`));
		};
	});
}

/**
 * Delete a card from the collection
 */
export async function deleteCollectionCard(db: IDBDatabase, cardId: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(COLLECTION_STORE, 'readwrite');
		const store = transaction.objectStore(COLLECTION_STORE);
		const request = store.delete(cardId);

		request.onsuccess = () => {
			resolve();
		};

		request.onerror = () => {
			reject(new Error(`Failed to delete card: ${request.error?.message}`));
		};
	});
}

/**
 * Get a specific card from the collection
 */
export async function getCollectionCard(
	db: IDBDatabase,
	cardId: string
): Promise<CollectionCard | null> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(COLLECTION_STORE, 'readonly');
		const store = transaction.objectStore(COLLECTION_STORE);
		const request = store.get(cardId);

		request.onsuccess = () => {
			resolve(request.result || null);
		};

		request.onerror = () => {
			reject(new Error(`Failed to get card: ${request.error?.message}`));
		};
	});
}
