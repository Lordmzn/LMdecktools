import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDatabases } from './reset';
import { openDatabase, CARD_FACTS_STORE } from '../db';
import { loadCardFacts, putCardFacts, clearCardFacts, missingFactIds } from '../card-facts';
import type { CardFacts } from '../card-fields';

const bolt: CardFacts = {
	id: 'bolt',
	set_name: 'Limited Edition Alpha',
	image_uris: { small: 'bolt-s.jpg', normal: 'bolt-n.jpg' }
};

const swamp: CardFacts = { id: 'swamp', set_name: 'Modern Horizons 3' };

describe('card facts cache', () => {
	let db: IDBDatabase;

	beforeEach(async () => {
		db = await openDatabase();
	});

	afterEach(async () => {
		db.close();
		await resetDatabases();
	});

	it('has its own store in the database, not a database of its own', () => {
		expect(db.objectStoreNames.contains(CARD_FACTS_STORE)).toBe(true);
	});

	it('round-trips facts keyed by card id', async () => {
		await putCardFacts(db, [bolt, swamp]);

		expect(await loadCardFacts(db)).toEqual({ bolt, swamp });
	});

	it('overwrites by id, since facts about a printing do not change', async () => {
		await putCardFacts(db, [bolt]);
		await putCardFacts(db, [{ ...bolt, set_name: 'Renamed' }]);

		const index = await loadCardFacts(db);
		expect(Object.keys(index)).toEqual(['bolt']);
		expect(index.bolt.set_name).toBe('Renamed');
	});

	it('writing nothing is not an error', async () => {
		await expect(putCardFacts(db, [])).resolves.toBeUndefined();
	});

	it('survives clearing the user data — it is a cache, not the data being cleared', async () => {
		// `clearDB()` destroys the document and mints a new lineage; the facts
		// cache is refetchable third-party data and is deliberately left behind,
		// so a restore straight afterwards draws its cards without the network.
		const { initDB, clearDB, closeDB, store } = await import('../store.svelte');
		await initDB();
		await putCardFacts(db, [bolt]);

		await clearDB();

		expect(await loadCardFacts(db)).toEqual({ bolt });
		expect(store.collection).toEqual([]);

		await closeDB();
		store.dbMode = 'none';
	});

	it('can be dropped on its own', async () => {
		await putCardFacts(db, [bolt, swamp]);
		await clearCardFacts(db);

		expect(await loadCardFacts(db)).toEqual({});
	});
});

describe('missingFactIds', () => {
	it('names the cards the index cannot draw, once each, in first-seen order', () => {
		const known = { bolt };
		const cards = [{ id: 'swamp' }, { id: 'bolt' }, { id: 'island' }, { id: 'swamp' }];

		expect(missingFactIds(cards, known)).toEqual(['swamp', 'island']);
	});

	it('is empty when everything is cached', () => {
		expect(missingFactIds([{ id: 'bolt' }], { bolt })).toEqual([]);
	});

	it('ignores records with no id', () => {
		expect(missingFactIds([{}, { id: undefined }], {})).toEqual([]);
	});
});
