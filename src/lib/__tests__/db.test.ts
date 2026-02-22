import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
	openDatabase,
	createEmptyCardList,
	saveCardList,
	loadAllCardLists,
	deleteCardList,
	clearDatabase,
	loadCollection,
	saveCollectionCard,
	deleteCollectionCard,
	getCollectionCard,
	type CardList,
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

	describe('createEmptyCardList', () => {
		it('returns a card list with default values', () => {
			const cardList = createEmptyCardList();

			expect(cardList.name).toBe('A list');
			expect(cardList.cards).toEqual([]);
			expect(cardList.cardMatching).toBe('generic');
			expect(cardList.languageMatching).toBe('any');
			expect(cardList.created_at).toBeTypeOf('number');
			expect(cardList.updated_at).toBeTypeOf('number');
			expect(cardList.id).toBeUndefined();
		});
	});

	describe('CardList CRUD', () => {
		it('saves and loads a card list', async () => {
			const cardList = createEmptyCardList();
			const id = await saveCardList(db, cardList);

			expect(id).toBeTypeOf('number');

			const cardLists = await loadAllCardLists(db);
			expect(cardLists).toHaveLength(1);
			expect(cardLists[0].name).toBe('A list');
			expect(cardLists[0].id).toBe(id);
		});

		it('updates an existing card list', async () => {
			const cardList = createEmptyCardList();
			const id = await saveCardList(db, cardList);

			const updated: CardList = { ...cardList, id, name: 'Updated List' };
			await saveCardList(db, updated);

			const cardLists = await loadAllCardLists(db);
			expect(cardLists).toHaveLength(1);
			expect(cardLists[0].name).toBe('Updated List');
		});

		it('deletes a card list', async () => {
			const cardList = createEmptyCardList();
			const id = await saveCardList(db, cardList);

			await deleteCardList(db, id);

			const cardLists = await loadAllCardLists(db);
			expect(cardLists).toHaveLength(0);
		});

		it('saves a card list with cards', async () => {
			const cardList: CardList = {
				...createEmptyCardList(),
				cards: [
					{ id: 'card-1', name: 'Lightning Bolt', LM_quantity: 4 },
					{ id: 'card-2', name: 'Counterspell', LM_quantity: 3 }
				]
			};

			const _id = await saveCardList(db, cardList);
			const cardLists = await loadAllCardLists(db);

			expect(cardLists[0].cards).toHaveLength(2);
			expect(cardLists[0].cards[0].LM_quantity).toBe(4);
		});
	});

	describe('clearDatabase', () => {
		it('removes all card lists and collection cards', async () => {
			await saveCardList(db, createEmptyCardList());
			await saveCollectionCard(db, {
				id: 'card-1',
				name: 'Lightning Bolt',
				quantity_owned: 2
			});

			await clearDatabase(db);

			const cardLists = await loadAllCardLists(db);
			const collection = await loadCollection(db);
			expect(cardLists).toHaveLength(0);
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
