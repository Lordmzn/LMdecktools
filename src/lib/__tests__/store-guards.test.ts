/**
 * Tests for write guards (assertWritable) and dbMode state transitions.
 * Kept separate from store.test.ts to avoid vi.mock conflicts.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { resetDatabases } from './reset';
import {
	addToCollection,
	removeFromCollection,
	createNewCardList,
	deleteCardList,
	replaceListCards,
	countCards,
	countCardsInLists,
	peekDB,
	initDB,
	closeDB,
	store
} from '../store.svelte';

// ==================== Write Guards ====================

describe('Write guards', () => {
	// store.dbMode starts as 'none' (not active), so all mutations should throw

	it('addToCollection throws when dbMode is not active', async () => {
		await expect(addToCollection({}, 1)).rejects.toThrow('Database is read-only');
	});

	it('removeFromCollection throws when dbMode is not active', async () => {
		await expect(removeFromCollection({}, 1)).rejects.toThrow('Database is read-only');
	});

	it('createNewCardList throws when dbMode is not active', async () => {
		await expect(createNewCardList()).rejects.toThrow('Database is read-only');
	});

	it('deleteCardList throws when dbMode is not active', async () => {
		await expect(deleteCardList()).rejects.toThrow('Database is read-only');
	});
});

// ==================== dbMode Transitions ====================

describe('dbMode transitions', () => {
	afterEach(async () => {
		// Close connection first so deleteDatabase isn't blocked
		await closeDB();
		store.dbMode = 'none';
		await resetDatabases();
	});

	it('peekDB sets dbMode=peek, dbLoaded=true, isReadOnly=true', async () => {
		await peekDB();
		expect(store.dbMode).toBe('peek');
		expect(store.dbLoaded).toBe(true);
		expect(store.isReadOnly).toBe(true);
	});

	it('initDB after peekDB upgrades to active without re-opening DB', async () => {
		await peekDB();
		await initDB();
		expect(store.dbMode).toBe('active');
		expect(store.isReadOnly).toBe(false);
	});
});

// ==================== deleteCardList Operations ====================

describe('deleteCardList operations', () => {
	afterEach(async () => {
		await closeDB();
		store.dbMode = 'none';
		await resetDatabases();
	});

	it('throws when no list is selected', async () => {
		await initDB(); // active mode; empty DB stays with zero lists
		expect(store.savedCardLists.length).toBe(0);
		await expect(deleteCardList()).rejects.toThrow('No card list selected');
	});

	it('deletes a list and moves the selection to a surviving one', async () => {
		await initDB();
		await createNewCardList();
		const second = await createNewCardList(); // now 2 lists; the new one is selected
		const countBefore = store.savedCardLists.length;
		await deleteCardList();
		expect(store.savedCardLists.length).toBe(countBefore - 1);
		expect(store.currentCardListId).not.toBe(second.id);
		expect(store.currentCardList).not.toBeNull();
	});

	it('deleting the last list leaves no list selected', async () => {
		await initDB();
		await createNewCardList();
		await deleteCardList();
		expect(store.savedCardLists.length).toBe(0);
		expect(store.currentCardListId).toBeNull();
		expect(store.currentCardList).toBeNull();
	});
});

// ==================== DB content stats ====================

describe('DB content stats', () => {
	afterEach(async () => {
		await closeDB();
		store.dbMode = 'none';
		await resetDatabases();
	});

	it('connecting to an empty database does not create a list', async () => {
		await peekDB();
		await initDB();
		expect(store.savedCardLists.length).toBe(0);
		expect(store.currentCardListId).toBeNull();
	});

	it('counts cards across every list, not just the current one', async () => {
		await initDB();

		const deckA = await createNewCardList();
		await replaceListCards(deckA.id!, [{ id: 'a', name: 'Card A', LM_quantity: 2 }]);

		const deckB = await createNewCardList();
		await replaceListCards(deckB.id!, [
			{ id: 'b', name: 'Card B', LM_quantity: 3 },
			{ id: 'c', name: 'Card C', LM_quantity: 1 }
		]);

		// store.totalCards / store.totalListCards are $derived and cannot be read
		// reliably outside a reactive owner (see CLAUDE.md), so assert on the
		// pure helpers those deriveds delegate to.
		// By name, not by position: `readLists` orders by `created_at`, and two
		// lists made in the same millisecond tie — position is not identity (#47).
		const lists = store.savedCardLists;
		expect(lists.length).toBe(2);
		expect(countCards(lists.find((l) => l.id === deckB.id)!.cards)).toBe(4); // one list
		expect(countCardsInLists(lists)).toBe(6); // all lists
	});
});
