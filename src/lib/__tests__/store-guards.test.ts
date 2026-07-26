/**
 * Tests for write guards (assertWritable) and dbMode state transitions.
 * Kept separate from store.test.ts to avoid vi.mock conflicts.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
	addToCollection,
	removeFromCollection,
	createNewCardList,
	deleteCardList,
	saveCardList,
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
		closeDB();
		store.dbMode = 'none';
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
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
		closeDB();
		store.dbMode = 'none';
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	});

	it('throws when no list is selected', async () => {
		await initDB(); // active mode; empty DB stays with zero lists
		expect(store.savedCardLists.length).toBe(0);
		await expect(deleteCardList()).rejects.toThrow('No card list selected');
	});

	it('deletes a list and adjusts currentCardListIndex', async () => {
		await initDB();
		await createNewCardList();
		await createNewCardList(); // now 2 lists; index points to the new one
		const countBefore = store.savedCardLists.length;
		await deleteCardList();
		expect(store.savedCardLists.length).toBe(countBefore - 1);
		expect(store.currentCardListIndex).toBeGreaterThanOrEqual(0);
	});

	it('deleting the last list leaves no list selected', async () => {
		await initDB();
		await createNewCardList();
		await deleteCardList();
		expect(store.savedCardLists.length).toBe(0);
		expect(store.currentCardListIndex).toBeNaN();
		expect(store.currentCardList).toBeNull();
	});
});

// ==================== DB content stats ====================

describe('DB content stats', () => {
	afterEach(async () => {
		closeDB();
		store.dbMode = 'none';
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	});

	it('connecting to an empty database does not create a list', async () => {
		await peekDB();
		await initDB();
		expect(store.savedCardLists.length).toBe(0);
		expect(store.currentCardListIndex).toBeNaN();
	});

	it('counts cards across every list, not just the current one', async () => {
		await initDB();

		await createNewCardList();
		await saveCardList('Deck A', [{ id: 'a', name: 'Card A', LM_quantity: 2 }]);

		await createNewCardList();
		await saveCardList('Deck B', [
			{ id: 'b', name: 'Card B', LM_quantity: 3 },
			{ id: 'c', name: 'Card C', LM_quantity: 1 }
		]);

		// store.totalCards / store.totalListCards are $derived and cannot be read
		// reliably outside a reactive owner (see CLAUDE.md), so assert on the
		// pure helpers those deriveds delegate to.
		const lists = store.savedCardLists;
		expect(lists.length).toBe(2);
		expect(countCards(lists[1].cards)).toBe(4); // current list only
		expect(countCardsInLists(lists)).toBe(6); // all lists
	});
});
