/**
 * The v5 → v6 upgrade (#47): the `card_lists` and `collection` stores are
 * dropped, because the user's data is the document now.
 *
 * The alpha owes no backward compatibility, but "seed from scratch" and "throw
 * the maintainer's own collection away" are not the same sentence — so the
 * upgrade reads the rows out before deleting the stores, and the store seeds
 * the document from them. Nothing here survives that one run.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { openDatabase, takeLegacySeed } from '../db';
import { resetDatabases } from './reset';
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

describe('v5 → v6 migration', () => {
	let open: IDBDatabase | null = null;

	afterEach(async () => {
		// Closed here rather than at the end of each test: a failing assertion
		// would otherwise leave the connection open and block the delete.
		open?.close();
		open = null;
		await resetDatabases();
	});

	it('drops the legacy stores', async () => {
		await seedV4Database();

		const db = (open = await openDatabase());

		// The user's data lives in the document now; what stays here is
		// device-local and must never sync (#47).
		expect([...db.objectStoreNames].sort()).toEqual(['card_facts', 'error_journal', 'metadata']);
	});

	it('rescues the rows it drops, so an existing database is not thrown away', async () => {
		await seedV4Database();

		open = await openDatabase();
		const seed = takeLegacySeed();

		expect(seed).not.toBeNull();
		expect(seed!.collection).toEqual([
			{
				id: 'bolt',
				name: 'Lightning Bolt',
				set: 'mh3',
				collector_number: '42',
				lang: 'en',
				mana_cost: '{1}{R}',
				type_line: 'Instant',
				quantity_owned: 4
			}
		]);

		expect(seed!.cardLists).toHaveLength(1);
		expect(seed!.cardLists[0].name).toBe('Burn');
		expect(seed!.cardLists[0].cards.map((card) => card.LM_quantity)).toEqual([4, 3]);
		// The autoIncrement key means nothing on another machine; the document
		// assigns a UUID on the way in.
		expect(seed!.cardLists[0].id).toBeUndefined();

		for (const card of seed!.cardLists[0].cards) {
			expect(card).not.toHaveProperty('image_uris');
			expect(card).not.toHaveProperty('legalities');
			expect(card).not.toHaveProperty('oracle_text');
		}
	});

	it('files the facts it strips, so nothing needs refetching on day one', async () => {
		await seedV4Database();

		const db = (open = await openDatabase());

		const facts = await loadCardFacts(db);
		expect(Object.keys(facts).sort()).toEqual(['bolt', 'rift']);
		expect(facts.bolt).toEqual({
			id: 'bolt',
			set_name: 'Modern Horizons 3',
			image_uris: { small: 'bolt-s.jpg', normal: 'bolt-n.jpg' }
		});
	});

	it('hands back nothing for a database that never held anything', async () => {
		open = await openDatabase();

		expect(takeLegacySeed()).toBeNull();
		expect(await loadCardFacts(open)).toEqual({});
	});
});
