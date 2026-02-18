import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	openDatabase,
	createEmptyDeck,
	saveDeck,
	loadAllDecks,
	deleteDeck,
	clearDatabase,
	loadCollection,
	saveCollectionCard,
	deleteCollectionCard,
	getCollectionCard,
	type Deck,
	type CollectionCard
} from '../db';

describe('Database Operations', () => {
	let db: IDBDatabase;

	beforeEach(async () => {
		db = await openDatabase();
	});

	afterEach(async () => {
		db.close();
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	});

	describe('createEmptyDeck', () => {
		it('returns a deck with default values', () => {
			const deck = createEmptyDeck();

			expect(deck.name).toBe('Nuovo mazzo');
			expect(deck.deck_cards).toEqual([]);
			expect(deck.created_at).toBeTypeOf('number');
			expect(deck.updated_at).toBeTypeOf('number');
			expect(deck.id).toBeUndefined();
		});
	});

	describe('Deck CRUD', () => {
		it('saves and loads a deck', async () => {
			const deck = createEmptyDeck();
			const id = await saveDeck(db, deck);

			expect(id).toBeTypeOf('number');

			const decks = await loadAllDecks(db);
			expect(decks).toHaveLength(1);
			expect(decks[0].name).toBe('Nuovo mazzo');
			expect(decks[0].id).toBe(id);
		});

		it('updates an existing deck', async () => {
			const deck = createEmptyDeck();
			const id = await saveDeck(db, deck);

			const updated: Deck = { ...deck, id, name: 'Updated Deck' };
			await saveDeck(db, updated);

			const decks = await loadAllDecks(db);
			expect(decks).toHaveLength(1);
			expect(decks[0].name).toBe('Updated Deck');
		});

		it('deletes a deck', async () => {
			const deck = createEmptyDeck();
			const id = await saveDeck(db, deck);

			await deleteDeck(db, id);

			const decks = await loadAllDecks(db);
			expect(decks).toHaveLength(0);
		});

		it('saves a deck with cards', async () => {
			const deck: Deck = {
				...createEmptyDeck(),
				deck_cards: [
					{ id: 'card-1', name: 'Lightning Bolt', LM_quantity: 4 },
					{ id: 'card-2', name: 'Counterspell', LM_quantity: 3 }
				]
			};

			const id = await saveDeck(db, deck);
			const decks = await loadAllDecks(db);

			expect(decks[0].deck_cards).toHaveLength(2);
			expect(decks[0].deck_cards[0].LM_quantity).toBe(4);
		});
	});

	describe('clearDatabase', () => {
		it('removes all decks and collection cards', async () => {
			await saveDeck(db, createEmptyDeck());
			await saveCollectionCard(db, {
				id: 'card-1',
				name: 'Lightning Bolt',
				quantity_owned: 2
			});

			await clearDatabase(db);

			const decks = await loadAllDecks(db);
			const collection = await loadCollection(db);
			expect(decks).toHaveLength(0);
			expect(collection).toHaveLength(0);
		});
	});
});

describe('Collection Operations', () => {
	let db: IDBDatabase;

	beforeEach(async () => {
		db = await openDatabase();
	});

	afterEach(async () => {
		db.close();
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	});

	it('saves and loads a collection card', async () => {
		const card: CollectionCard = {
			id: 'scryfall-123',
			name: 'Lightning Bolt',
			quantity_owned: 4,
			set: 'lea',
			set_name: 'Limited Edition Alpha'
		};

		await saveCollectionCard(db, card);

		const collection = await loadCollection(db);
		expect(collection).toHaveLength(1);
		expect(collection[0].name).toBe('Lightning Bolt');
		expect(collection[0].quantity_owned).toBe(4);
	});

	it('updates quantity when saving same card again', async () => {
		const card: CollectionCard = {
			id: 'scryfall-123',
			name: 'Lightning Bolt',
			quantity_owned: 2
		};
		await saveCollectionCard(db, card);

		const updated = { ...card, quantity_owned: 5 };
		await saveCollectionCard(db, updated);

		const collection = await loadCollection(db);
		expect(collection).toHaveLength(1);
		expect(collection[0].quantity_owned).toBe(5);
	});

	it('deletes a collection card', async () => {
		await saveCollectionCard(db, {
			id: 'scryfall-123',
			name: 'Lightning Bolt',
			quantity_owned: 4
		});

		await deleteCollectionCard(db, 'scryfall-123');

		const collection = await loadCollection(db);
		expect(collection).toHaveLength(0);
	});

	it('gets a specific collection card', async () => {
		await saveCollectionCard(db, {
			id: 'scryfall-123',
			name: 'Lightning Bolt',
			quantity_owned: 4
		});

		const card = await getCollectionCard(db, 'scryfall-123');
		expect(card).not.toBeNull();
		expect(card!.name).toBe('Lightning Bolt');
	});

	it('returns null for non-existent card', async () => {
		const card = await getCollectionCard(db, 'does-not-exist');
		expect(card).toBeNull();
	});
});
