/**
 * The v4 → v5 upgrade (#84): every stored record loses the Scryfall payload it
 * was carrying, and what it loses is kept in the card-facts cache so the app
 * does not have to go back to the network for a database it already had.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { openDatabase, loadAllCardLists, loadCollection } from '../db';
import { loadCardFacts } from '../card-facts';

const DB_NAME = 'LMdecktools';

const fatCard = (id: string, name: string) => ({
	id,
	name,
	set: 'mh3',
	set_name: 'Modern Horizons 3',
	collector_number: '42',
	lang: 'en',
	mana_cost: '{1}{R}',
	type_line: 'Instant',
	oracle_text: 'Long rules text that has no business being in a save file.',
	image_uris: { small: `${id}-s.jpg`, normal: `${id}-n.jpg`, png: `${id}-p.png` },
	legalities: { modern: 'legal', standard: 'not_legal' },
	prices: { usd: '2.50' },
	all_parts: [{ id: 'token', component: 'token' }],
	related_uris: { gatherer: 'https://example.invalid' }
});

/** Build the database as version 4 left it: the four v4 stores, holding fat records. */
async function seedV4Database(): Promise<void> {
	const db = await new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 4);
		request.onupgradeneeded = () => {
			const upgraded = request.result;
			const lists = upgraded.createObjectStore('card_lists', {
				keyPath: 'id',
				autoIncrement: true
			});
			lists.createIndex('name', 'name', { unique: false });
			lists.createIndex('updated_at', 'updated_at', { unique: false });
			upgraded.createObjectStore('collection', { keyPath: 'id' });
			upgraded.createObjectStore('metadata', { keyPath: 'key' });
			const journal = upgraded.createObjectStore('error_journal', {
				keyPath: 'id',
				autoIncrement: true
			});
			journal.createIndex('timestamp', 'timestamp', { unique: false });
			journal.createIndex('category', 'category', { unique: false });
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});

	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(['collection', 'card_lists'], 'readwrite');
		tx.objectStore('collection').put({ ...fatCard('bolt', 'Lightning Bolt'), quantity_owned: 4 });
		tx.objectStore('card_lists').put({
			id: 1,
			name: 'Burn',
			cards: [
				{ ...fatCard('bolt', 'Lightning Bolt'), LM_quantity: 4 },
				{ ...fatCard('rift', 'Rift Bolt'), LM_quantity: 3 }
			],
			cardMatching: 'generic',
			languageMatching: 'any',
			created_at: 1,
			updated_at: 2
		});
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});

	db.close();
}

describe('v4 → v5 migration', () => {
	afterEach(async () => {
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase(DB_NAME);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	});

	it('strips existing records to the whitelist and keeps their facts', async () => {
		await seedV4Database();

		const db = await openDatabase();

		const collection = await loadCollection(db);
		expect(collection).toHaveLength(1);
		expect(collection[0]).toEqual({
			id: 'bolt',
			name: 'Lightning Bolt',
			set: 'mh3',
			collector_number: '42',
			lang: 'en',
			mana_cost: '{1}{R}',
			type_line: 'Instant',
			quantity_owned: 4
		});

		const lists = await loadAllCardLists(db);
		expect(lists[0].cards.map((card) => card.LM_quantity)).toEqual([4, 3]);
		for (const card of lists[0].cards) {
			expect(card).not.toHaveProperty('image_uris');
			expect(card).not.toHaveProperty('legalities');
			expect(card).not.toHaveProperty('oracle_text');
		}

		// Everything stripped that the UI still needs is now in the cache — a
		// migrated database draws its cards without asking Scryfall for anything.
		const facts = await loadCardFacts(db);
		expect(Object.keys(facts).sort()).toEqual(['bolt', 'rift']);
		expect(facts.bolt).toEqual({
			id: 'bolt',
			set_name: 'Modern Horizons 3',
			image_uris: { small: 'bolt-s.jpg', normal: 'bolt-n.jpg' }
		});

		db.close();
	});

	it('leaves the list identity and settings alone', async () => {
		await seedV4Database();

		const db = await openDatabase();
		const [list] = await loadAllCardLists(db);

		expect(list.id).toBe(1);
		expect(list.name).toBe('Burn');
		expect(list.cardMatching).toBe('generic');
		expect(list.languageMatching).toBe('any');
		expect(list.created_at).toBe(1);

		db.close();
	});

	it('creates an empty facts store for a database that never held anything', async () => {
		const db = await openDatabase();

		expect(await loadCardFacts(db)).toEqual({});
		expect(await loadCollection(db)).toEqual([]);

		db.close();
	});
});
