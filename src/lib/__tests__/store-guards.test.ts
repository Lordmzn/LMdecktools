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

	it('throws when trying to delete the only remaining list', async () => {
		await initDB(); // active mode; seeds 1 default list
		await expect(deleteCardList()).rejects.toThrow('Cannot delete the last card list');
	});

	it('deletes a list and adjusts currentCardListIndex', async () => {
		await initDB();
		await createNewCardList(); // now 2 lists; index points to new one
		const countBefore = store.savedCardLists.length;
		await deleteCardList();
		expect(store.savedCardLists.length).toBe(countBefore - 1);
		expect(store.currentCardListIndex).toBeGreaterThanOrEqual(0);
	});
});
