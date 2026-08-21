/**
 * Bulk collection writes and the ownership index (#62).
 *
 * Kept out of store.test.ts, which mocks the whole store module for the export
 * formatters — here we want the real thing.
 *
 * What #62 was about survives the move to the document (#47), in the same shape
 * for a different reason: the whole batch must land in **one transaction**, so
 * the observer rebuilds the runes once and the grid repaints once. It used to
 * be one IndexedDB write instead of n; it is now one document transaction
 * instead of n, and `countTransactions` is what pins it.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { resetDatabases } from './reset';
import type { CollectionCard } from '../db';
import { buildCollectionIndex, checkOwnership, mergeCardsIntoCollection } from '../collection';
import {
	addAllToCollection,
	addToCollection,
	createNewCardList,
	currentDocument,
	replaceListCards,
	initDB,
	closeDB,
	store
} from '../store.svelte';

/** How many document transactions `run` produces. */
async function countTransactions(run: () => Promise<unknown>): Promise<number> {
	const doc = currentDocument()!;
	let count = 0;
	const tick = () => count++;
	doc.on('afterTransaction', tick);
	await run();
	doc.off('afterTransaction', tick);
	return count;
}

/** A list card as the app builds them — only the fields the collection cares about. */
function listCard(id: string, name: string, quantity: number, lang = 'en') {
	return { id, name, LM_quantity: quantity, lang };
}

async function freshDB() {
	await initDB();
}

afterEach(async () => {
	await closeDB();
	store.dbMode = 'none';
	store.collection = [];
	store.savedCardLists = [];
	store.currentCardListId = null;
	await resetDatabases();
});

describe('addAllToCollection', () => {
	it('writes the whole list in a single transaction', async () => {
		await freshDB();
		const list = await createNewCardList();
		await replaceListCards(list.id!, [
			listCard('a', 'Card A', 2),
			listCard('b', 'Card B', 1),
			listCard('c', 'Card C', 4)
		]);

		let result!: { added: number; failed: number };
		const transactions = await countTransactions(async () => {
			result = await addAllToCollection();
		});

		expect(result).toEqual({ added: 3, failed: 0 });
		// The point of #62: one transaction, not one per card
		expect(transactions).toBe(1);
		expect(store.collection).toHaveLength(3);
	});

	it('respects LM_quantity rather than adding one of each', async () => {
		await freshDB();
		const list = await createNewCardList();
		await replaceListCards(list.id!, [listCard('a', 'Card A', 3)]);

		await addAllToCollection();

		expect(store.collection[0].quantity_owned).toBe(3);
	});

	it('adds to what is already owned instead of replacing it', async () => {
		await freshDB();
		await addToCollection({ id: 'a', name: 'Card A', lang: 'en' }, 2);
		const list = await createNewCardList();
		await replaceListCards(list.id!, [listCard('a', 'Card A', 3)]);

		await addAllToCollection();

		expect(store.collection).toHaveLength(1);
		expect(store.collection[0].quantity_owned).toBe(5);
	});

	it('accumulates when a list names the same printing twice', async () => {
		await freshDB();
		const list = await createNewCardList();
		await replaceListCards(list.id!, [listCard('a', 'Card A', 2), listCard('a', 'Card A', 3)]);

		await addAllToCollection();

		// One row, both entries counted
		expect(store.collection).toHaveLength(1);
		expect(store.collection[0].quantity_owned).toBe(5);
	});

	it('leaves untouched cards in the collection alone', async () => {
		await freshDB();
		await addToCollection({ id: 'z', name: 'Card Z', lang: 'en' }, 7);
		const list = await createNewCardList();
		await replaceListCards(list.id!, [listCard('a', 'Card A', 1)]);

		await addAllToCollection();

		expect(store.collection).toHaveLength(2);
		expect(store.collection.find((c) => c.id === 'z')?.quantity_owned).toBe(7);
		expect(store.collection.find((c) => c.id === 'a')?.quantity_owned).toBe(1);
	});

	it('does nothing, and writes nothing, for an empty list', async () => {
		await freshDB();
		await createNewCardList();

		const transactions = await countTransactions(async () => {
			expect(await addAllToCollection()).toEqual({ added: 0, failed: 0 });
		});

		expect(transactions).toBe(0);
		expect(store.collection).toHaveLength(0);
	});

	it('throws before touching anything when the database is read-only', async () => {
		await freshDB();
		store.dbMode = 'none';

		const transactions = await countTransactions(async () => {
			await expect(addAllToCollection()).rejects.toThrow('Database is read-only');
		});

		expect(transactions).toBe(0);
	});
});

/**
 * The ownership check is a `$derived` on the store, which cannot be read
 * reliably outside a reactive owner (see CLAUDE.md) — so, as elsewhere in this
 * suite, assert on the pure helpers the derived delegates to.
 */
describe('checkOwnership', () => {
	/** A collection row as the DB stores them. */
	function owned(id: string, name: string, quantity: number, lang = 'en'): CollectionCard {
		return { id, name, quantity_owned: quantity, lang } as CollectionCard;
	}

	const generic = { cardMatching: 'generic', languageMatching: 'any' } as const;
	const specific = { cardMatching: 'specific', languageMatching: 'any' } as const;
	const strict = { cardMatching: 'generic', languageMatching: 'strict' } as const;

	it('sums printings of the same name under generic matching', () => {
		const index = buildCollectionIndex([
			owned('bolt-lea', 'Lightning Bolt', 1),
			owned('bolt-m10', 'Lightning Bolt', 1)
		]);

		// Two different printings cover a requirement of two
		expect(checkOwnership([listCard('bolt-2xm', 'Lightning Bolt', 2)], index, generic).owned).toBe(
			true
		);
	});

	it('counts only the exact printing under specific matching', () => {
		const index = buildCollectionIndex([
			owned('bolt-lea', 'Lightning Bolt', 1),
			owned('bolt-m10', 'Lightning Bolt', 1)
		]);

		expect(checkOwnership([listCard('bolt-2xm', 'Lightning Bolt', 2)], index, specific).owned).toBe(
			false
		);
		expect(checkOwnership([listCard('bolt-lea', 'Lightning Bolt', 1)], index, specific).owned).toBe(
			true
		);
	});

	it('ignores language under any-language matching', () => {
		const index = buildCollectionIndex([owned('bolt-it', 'Lightning Bolt', 2, 'it')]);

		expect(
			checkOwnership([listCard('bolt-en', 'Lightning Bolt', 2, 'en')], index, generic).owned
		).toBe(true);
	});

	it('separates languages under strict matching', () => {
		const index = buildCollectionIndex([
			owned('bolt-it', 'Lightning Bolt', 1, 'it'),
			owned('bolt-en', 'Lightning Bolt', 1, 'en')
		]);

		// Both copies count when language is ignored, only the English one when it is not
		expect(
			checkOwnership([listCard('bolt-en', 'Lightning Bolt', 2, 'en')], index, generic).owned
		).toBe(true);
		expect(
			checkOwnership([listCard('bolt-en', 'Lightning Bolt', 2, 'en')], index, strict).owned
		).toBe(false);
	});

	it('treats a missing lang as its own language rather than a wildcard', () => {
		const index = buildCollectionIndex([
			{ id: 'x', name: 'Card X', quantity_owned: 2 } as CollectionCard
		]);

		const noLang = { id: 'x', name: 'Card X', LM_quantity: 1 } as never;
		expect(checkOwnership([noLang], index, strict).owned).toBe(true);
		expect(checkOwnership([listCard('x', 'Card X', 1, 'en')], index, strict).owned).toBe(false);
		// …but it still counts toward the language-agnostic total
		expect(checkOwnership([listCard('x', 'Card X', 2, 'en')], index, generic).owned).toBe(true);
	});

	it('reports a card the collection has never seen as unowned', () => {
		const result = checkOwnership(
			[listCard('nothing', 'Nonesuch', 1)],
			buildCollectionIndex([]),
			generic
		);

		expect(result.owned).toBe(false);
		expect(result.cards).toHaveLength(1);
		expect(result.cards[0].owned).toBe(false);
	});

	it('needs every card covered, not just some', () => {
		const index = buildCollectionIndex([owned('a', 'Card A', 4)]);

		const result = checkOwnership(
			[listCard('a', 'Card A', 2), listCard('b', 'Card B', 1)],
			index,
			generic
		);

		expect(result.owned).toBe(false);
		expect(result.cards.map((r) => r.owned)).toEqual([true, false]);
	});

	it('treats an empty list as owned', () => {
		expect(checkOwnership([], buildCollectionIndex([]), generic).owned).toBe(true);
	});

	it('is short of the requirement when quantity is short', () => {
		const index = buildCollectionIndex([owned('a', 'Card A', 3)]);

		expect(checkOwnership([listCard('a', 'Card A', 3)], index, generic).owned).toBe(true);
		expect(checkOwnership([listCard('a', 'Card A', 4)], index, generic).owned).toBe(false);
	});
});

describe('mergeCardsIntoCollection', () => {
	function owned(id: string, name: string, quantity: number, lang = 'en'): CollectionCard {
		return { id, name, quantity_owned: quantity, lang } as CollectionCard;
	}

	it('adds new printings and tops up existing ones', () => {
		const before = [owned('a', 'Card A', 1), owned('z', 'Card Z', 5)];

		const { collection, touched } = mergeCardsIntoCollection(before, [
			listCard('a', 'Card A', 2),
			listCard('b', 'Card B', 3)
		]);

		expect(collection).toHaveLength(3);
		expect(collection.find((c) => c.id === 'a')?.quantity_owned).toBe(3);
		expect(collection.find((c) => c.id === 'b')?.quantity_owned).toBe(3);
		// Untouched, and not in the write set
		expect(collection.find((c) => c.id === 'z')?.quantity_owned).toBe(5);
		expect(touched.map((c) => c.id)).toEqual(['a', 'b']);
	});

	it('does not mutate its arguments', () => {
		const before = [owned('a', 'Card A', 1)];
		const cards = [listCard('a', 'Card A', 2)];

		mergeCardsIntoCollection(before, cards);

		expect(before[0].quantity_owned).toBe(1);
		expect(cards[0].LM_quantity).toBe(2);
	});

	it('lists a repeated printing once, with its quantities summed', () => {
		const { collection, touched } = mergeCardsIntoCollection(
			[],
			[listCard('a', 'Card A', 2), listCard('a', 'Card A', 3)]
		);

		expect(collection).toHaveLength(1);
		expect(collection[0].quantity_owned).toBe(5);
		expect(touched).toHaveLength(1);
	});

	it('treats a card with no LM_quantity as one copy', () => {
		const { collection } = mergeCardsIntoCollection([], [{ id: 'a', name: 'Card A' }] as never);

		expect(collection[0].quantity_owned).toBe(1);
	});

	it('runs each card through the supplied plain-object conversion', () => {
		const { collection } = mergeCardsIntoCollection([], [listCard('a', 'Card A', 1)], (card) => ({
			...(card as CollectionCard),
			name: 'converted'
		}));

		expect(collection[0].name).toBe('converted');
	});
});
