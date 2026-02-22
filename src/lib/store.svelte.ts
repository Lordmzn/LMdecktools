import {
	openDatabase,
	clearDatabase,
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
	type CardList,
	type CollectionCard,
	type CardMatching,
	type LanguageMatching
} from './db';

import { exportWithMetadata } from './yjs-integration';

// Database reference
let db: IDBDatabase | null = null;

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
	totalCards = $derived(this.listCards.reduce((sum, card) => sum + card.LM_quantity, 0));
	uniqueCards = $derived(this.listCards.length);

	// Collection state
	collection = $state<CollectionCard[]>([]);
	totalOwnedCards = $derived(this.collection.reduce((sum, card) => sum + card.quantity_owned, 0));
	uniqueOwnedCards = $derived(this.collection.length);
	isCardOwned(cardId: string) {
		const card = this.collection.find((c) => c.id === cardId);
		return card ? card.quantity_owned : 0;
	}

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
		// If loadCardLists() ran in peek mode with an empty DB, it skipped
		// createNewCardList(). Re-run now that we have write access.
		if (store.savedCardLists.length === 0) {
			await createNewCardList();
		}
		return;
	}
	db = await openDatabase();
	store.dbMode = 'active';
	await Promise.all([loadCardLists(), loadCollection()]);
	console.log('initDB done');
}

export async function clearDB() {
	if (!db) throw new Error('Database not initialized');
	await clearDatabase(db);
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
	if (!db) throw new Error('Database not initialized');
	return exportWithMetadata(store);
}

/**
 * Load database from a file (JSON or Yjs format).
 * Clears existing data, imports from the file, then reloads the store.
 */
export async function loadFromFile(file: File): Promise<void> {
	if (!db) {
		db = await openDatabase();
	}
	store.dbMode = 'active';

	const buffer = await file.arrayBuffer();
	const data = new Uint8Array(buffer);

	await importDatabase(db, data, false);
	await Promise.all([loadCardLists(), loadCollection()]);
}

/**
 * Import database from a file (supports both JSON and Yjs formats)
 * Automatically detects format and handles accordingly
 */
export async function importDatabase(
	db: IDBDatabase,
	data: Uint8Array,
	merge: boolean = false
): Promise<{ imported: number; merged: number; errors: number }> {
	let cardLists: CardList[];

	// Try to detect format
	try {
		const decoder = new TextDecoder();
		const jsonString = decoder.decode(data);
		const importData = JSON.parse(jsonString);
		cardLists = importData.cardLists ?? importData.decks ?? [];
	} catch {
		// If JSON parsing fails, try Yjs format
		try {
			const { importCardListsFromYjs } = await import('./yjs-integration');
			cardLists = importCardListsFromYjs(data);
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
	}

	return { imported, merged, errors };
}

// ==================== COLLECTION FUNCTIONS ====================

/**
 * Load collection from database
 */
export async function loadCollection() {
	if (!db) throw new Error('Database not initialized');

	const cards = await dbLoadCollection(db);
	store.collection = cards;
	return cards;
}

/**
 * Add card to collection
 */
export async function addToCollection(card: any, quantity: number = 1) {
	assertWritable();
	if (!db) throw new Error('Database not initialized');

	const existingCard = await getCollectionCard(db, card.id);

	const cardData: CollectionCard = {
		...toPlainCard(card),
		quantity_owned: existingCard ? existingCard.quantity_owned + quantity : quantity
	};

	await saveCollectionCard(db, cardData);

	if (existingCard) {
		const newCollection = store.collection.map((c) => (c.id === card.id ? cardData : c));
		store.collection = newCollection;
	} else {
		store.collection = [...store.collection, cardData];
	}

	return cardData;
}

/**
 * Remove card from collection
 */
export async function removeFromCollection(card: any, quantity: number = 1) {
	assertWritable();
	if (!db) throw new Error('Database not initialized');

	const existingCard = store.collection.find((c) => c.id === card.id);

	if (!existingCard) {
		throw new Error('Card not in collection');
	}

	const newQuantity = existingCard.quantity_owned - quantity;

	if (newQuantity <= 0) {
		// Remove card entirely
		await deleteCollectionCard(db, card.id);
		const newCollection = store.collection.filter((c) => c.id !== card.id);
		store.collection = newCollection;
		return null;
	} else {
		// Update quantity
		const cardData: CollectionCard = {
			...toPlainCard(existingCard),
			quantity_owned: newQuantity
		};

		await saveCollectionCard(db, cardData);

		const newCollection = store.collection.map((c) => (c.id === card.id ? cardData : c));
		store.collection = newCollection;
		return cardData;
	}
}

/**
 * Update card quantity in collection
 */
export async function updateCollectionQuantity(card: any, quantity: number) {
	assertWritable();
	if (!db) throw new Error('Database not initialized');

	if (quantity <= 0) {
		return removeFromCollection(card, 9999);
	}

	const cardData: CollectionCard = {
		...toPlainCard(card),
		quantity_owned: quantity
	};

	await saveCollectionCard(db, cardData);

	const existingIndex = store.collection.findIndex((c) => c.id === card.id);
	if (existingIndex >= 0) {
		const newCollection = [...store.collection];
		newCollection[existingIndex] = cardData;
		store.collection = newCollection;
	} else {
		store.collection = [...store.collection, cardData];
	}

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
 * Import collection from text
 */
export async function importCollectionFromText(text: string) {
	assertWritable();
	const lines = text.split('\n').filter((line) => line.trim());
	const results = { success: 0, failed: 0 };

	for (const line of lines) {
		if (line.startsWith('#')) continue;

		const match = line.match(/^(\d+)\s+(.+)$/);
		if (match) {
			const quantity = parseInt(match[1]);
			const cardName = match[2].trim();

			try {
				const response = await fetch(
					`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
				);
				if (response.ok) {
					const card = await response.json();
					await updateCollectionQuantity(card, quantity);
					results.success++;
				} else {
					results.failed++;
				}
			} catch {
				console.error(`Failed to import ${cardName}`);
				results.failed++;
			}
		}
	}

	return results;
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
	if (!db) throw new Error('Database not initialized');

	store.savedCardLists = await loadAllCardLists(db);

	if (store.savedCardLists.length === 0) {
		if (store.dbMode === 'active') {
			// createNewCardList sets currentCardListIndex
			await createNewCardList();
		}
		// in peek mode with empty DB: leave savedCardLists empty
	} else {
		store.currentCardListIndex = 0;
	}
}

/**
 * Create new card list
 */
export async function createNewCardList() {
	assertWritable();
	if (!db) throw new Error('Database not initialized');

	const newList = createEmptyCardList();
	const listId = await dbSaveCardList(db, newList);

	const listWithId = { ...newList, id: listId };
	const newLists = [...store.savedCardLists, listWithId];

	store.savedCardLists = newLists;
	store.currentCardListIndex = newLists.length - 1;

	return listWithId;
}

/**
 * Save current card list with given name and cards
 */
export async function saveCardList(name: string, cards: any[]) {
	assertWritable();
	if (!db) throw new Error('Database not initialized');

	const index = store.currentCardListIndex;
	const currentListData = store.savedCardLists[index];

	if (!currentListData) throw new Error('No card list selected');

	const updatedList: CardList = {
		...currentListData,
		name,
		cards,
		updated_at: Date.now()
	};

	await dbSaveCardList(db, updatedList);

	const newLists = [...store.savedCardLists];
	newLists[index] = updatedList;
	store.savedCardLists = newLists;

	return updatedList;
}

/**
 * Delete current card list
 */
export async function deleteCardList() {
	assertWritable();
	if (!db) throw new Error('Database not initialized');

	const index = store.currentCardListIndex;

	if (store.savedCardLists.length <= 1) {
		throw new Error('Cannot delete the last card list');
	}

	const listToDelete = store.savedCardLists[index];
	if (listToDelete.id) {
		await dbDeleteCardList(db, listToDelete.id);
	}

	store.savedCardLists = store.savedCardLists.filter((_, i) => i !== index);
	store.currentCardListIndex = Math.max(0, index - 1);
}

/**
 * Update list name
 */
export async function updateListName(name: string) {
	assertWritable();
	return saveCardList(name, store.listCards);
}

/**
 * Update cardMatching and/or languageMatching params for current list
 */
export async function updateListParams(params: Partial<OwnershipCheckParams>) {
	assertWritable();
	if (!db) throw new Error('Database not initialized');

	const index = store.currentCardListIndex;
	const currentListData = store.savedCardLists[index];

	if (!currentListData) throw new Error('No card list selected');

	const updatedList: CardList = {
		...currentListData,
		...params,
		updated_at: Date.now()
	};

	await dbSaveCardList(db, updatedList);

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
			...newCards[existingIndex],
			LM_quantity: newCards[existingIndex].LM_quantity - 1
		};
	} else {
		newCards = cards.filter((_, i) => i !== existingIndex);
	}

	return saveCardList(name, newCards);
}

/**
 * Import list from text
 */
export async function importListFromText(text: string) {
	assertWritable();
	const lines = text.split('\n').filter((line) => line.trim());
	const newCards: any[] = [];
	let newName = store.currentCardList?.name || 'Nuovo mazzo';

	for (const line of lines) {
		if (line.startsWith('#')) {
			newName = line.replace('#', '').trim();
			continue;
		}

		const match = line.match(/^(\d+)\s+(.+)$/);
		if (match) {
			const quantity = parseInt(match[1]);
			const cardName = match[2].trim();

			try {
				const response = await fetch(
					`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
				);
				if (response.ok) {
					const card = await response.json();
					newCards.push({
						id: card.id,
						name: card.name,
						image_uris: card.image_uris,
						card_faces: card.card_faces,
						mana_cost: card.mana_cost,
						type_line: card.type_line,
						LM_quantity: quantity
					});
				}
			} catch {
				console.error(`Failed to import ${cardName}`);
			}
		}
	}

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
