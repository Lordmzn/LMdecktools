/**
 * The store half of #84: what a card leaves behind when it is saved.
 *
 * The record keeps the whitelist, the facts go to the local cache, and the UI
 * reads them back through `cardFactsOf()` — so a card added from a search still
 * draws after a reload, without its art ever entering the user's data file.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openDatabase } from '../db';
import { loadCardFacts } from '../card-facts';
import {
	addCardToList,
	addToCollection,
	cardFactsOf,
	cardSetLabel,
	createNewCardList,
	hydrateCardFacts,
	initDB,
	closeDB,
	store
} from '../store.svelte';

/** A search result, as Scryfall returns it. */
function searchResult(id: string, name: string) {
	return {
		id,
		name,
		set: 'mh3',
		set_name: 'Modern Horizons 3',
		collector_number: '42',
		lang: 'en',
		mana_cost: '{R}',
		type_line: 'Instant',
		oracle_text: 'Deals 3 damage to any target.',
		image_uris: { small: `${id}-s.jpg`, normal: `${id}-n.jpg`, png: `${id}-p.png` },
		legalities: { modern: 'legal' },
		prices: { usd: '1.23' }
	};
}

afterEach(async () => {
	vi.restoreAllMocks();
	closeDB();
	store.dbMode = 'none';
	store.collection = [];
	store.savedCardLists = [];
	store.currentCardListIndex = NaN;
	store.cardFacts = {};
	await new Promise<void>((resolve, reject) => {
		const req = indexedDB.deleteDatabase('LMdecktools');
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
});

describe('adding a card', () => {
	beforeEach(async () => {
		await initDB();
	});

	it('stores the whitelist and caches the facts', async () => {
		await addToCollection(searchResult('bolt', 'Lightning Bolt'), 2);

		expect(store.collection[0]).toEqual({
			id: 'bolt',
			name: 'Lightning Bolt',
			set: 'mh3',
			collector_number: '42',
			lang: 'en',
			mana_cost: '{R}',
			type_line: 'Instant',
			quantity_owned: 2
		});

		expect(store.cardFacts.bolt).toEqual({
			id: 'bolt',
			set_name: 'Modern Horizons 3',
			image_uris: { small: 'bolt-s.jpg', normal: 'bolt-n.jpg' }
		});
	});

	it('keeps the facts across a reload of the database', async () => {
		await addToCollection(searchResult('bolt', 'Lightning Bolt'), 1);
		closeDB();

		const db = await openDatabase();
		expect(await loadCardFacts(db)).toHaveProperty('bolt');
		db.close();
	});

	it('does the same for a card added to a list', async () => {
		await createNewCardList();
		await addCardToList(searchResult('rift', 'Rift Bolt'));

		expect(store.savedCardLists[0].cards[0]).not.toHaveProperty('image_uris');
		expect(store.cardFacts.rift?.image_uris?.normal).toBe('rift-n.jpg');
	});
});

describe('cardFactsOf', () => {
	it('reads a search result straight off the card', () => {
		const facts = cardFactsOf(searchResult('bolt', 'Lightning Bolt'));

		expect(facts.image_uris?.normal).toBe('bolt-n.jpg');
	});

	it('reads a stored record out of the cache', () => {
		store.cardFacts = { bolt: { id: 'bolt', image_uris: { normal: 'cached.jpg' } } };

		expect(cardFactsOf({ id: 'bolt' }).image_uris?.normal).toBe('cached.jpg');
	});

	it('returns an empty fact set for a card nothing knows about yet', () => {
		expect(cardFactsOf({ id: 'unknown' })).toEqual({ id: 'unknown' });
		expect(cardFactsOf(null)).toEqual({ id: '' });
	});
});

describe('cardSetLabel', () => {
	it('prefers the cached set name', () => {
		store.cardFacts = { bolt: { id: 'bolt', set_name: 'Modern Horizons 3' } };

		expect(cardSetLabel({ id: 'bolt', set: 'mh3' })).toBe('Modern Horizons 3');
	});

	it('falls back to the set code the record itself carries', () => {
		expect(cardSetLabel({ id: 'bolt', set: 'mh3' })).toBe('MH3');
		expect(cardSetLabel({ id: 'bolt' })).toBe('');
	});
});

describe('hydrateCardFacts', () => {
	beforeEach(async () => {
		await initDB();
	});

	it('fetches only the cards the cache cannot draw, and caches what comes back', async () => {
		store.collection = [
			{ id: 'known', name: 'Known', quantity_owned: 1 },
			{ id: 'missing', name: 'Missing', quantity_owned: 1 }
		];
		store.cardFacts = { known: { id: 'known', set_name: 'Cached' } };

		const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
			const body = JSON.parse(String(init?.body));
			expect(body.identifiers).toEqual([{ id: 'missing' }]);
			return {
				ok: true,
				json: async () => ({ data: [searchResult('missing', 'Missing')], not_found: [] })
			} as unknown as Response;
		});
		vi.stubGlobal('fetch', fetchMock);

		await hydrateCardFacts();

		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(store.cardFacts.missing?.image_uris?.normal).toBe('missing-n.jpg');
	});

	it('asks for nothing when every card is already drawable', async () => {
		store.collection = [{ id: 'known', name: 'Known', quantity_owned: 1 }];
		store.cardFacts = { known: { id: 'known', set_name: 'Cached' } };

		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		await hydrateCardFacts();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('leaves the app usable when Scryfall cannot be reached', async () => {
		store.collection = [{ id: 'missing', name: 'Missing', quantity_owned: 1 }];
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('offline');
			})
		);

		await expect(hydrateCardFacts()).resolves.toBeUndefined();
		expect(store.cardFacts.missing).toBeUndefined();
	});
});
