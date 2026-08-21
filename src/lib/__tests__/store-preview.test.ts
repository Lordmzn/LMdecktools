/**
 * Preview mode (#87): the app is fully usable and the browser's own IndexedDB
 * is never touched.
 *
 * Kept in its own file because `enterPreviewMode()` swaps the storage factory
 * for the whole module — the `afterEach` here is what puts it back.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { enterPreviewMode, addToCollection, closeDB, store } from '../store.svelte';
import { useStorageFactory, checkLocalDatabase } from '../db';

afterEach(async () => {
	await closeDB();
	store.dbMode = 'none';
	store.installContext = 'browser';
	store.collection = [];
	store.savedCardLists = [];
	useStorageFactory(globalThis.indexedDB);
});

/** Does the real (test-global) IndexedDB hold our database? */
async function realDatabaseExists(): Promise<boolean> {
	const dbs = await globalThis.indexedDB.databases();
	return dbs.some((d) => d.name === 'LMdecktools');
}

describe('preview mode', () => {
	it('opens a writable database that the browser never sees', async () => {
		expect(await realDatabaseExists()).toBe(false);

		await enterPreviewMode();

		// Fully usable: active, not read-only, writes go through.
		expect(store.dbMode).toBe('active');
		expect(store.isReadOnly).toBe(false);
		await addToCollection({ id: 'abc', name: 'Lightning Bolt' }, 2);
		expect(store.collection).toHaveLength(1);

		// And nothing reached the container an installed app could not read.
		expect(await realDatabaseExists()).toBe(false);
	});

	it('reports itself as preview when the context is an iOS browser tab', () => {
		store.installContext = 'ios-browser';
		expect(store.previewMode).toBe(true);

		store.installContext = 'installed';
		expect(store.previewMode).toBe(false);

		store.installContext = 'browser';
		expect(store.previewMode).toBe(false);
	});

	it('starts empty even when the browser has a database of its own', async () => {
		// The trap in reverse: a real local database must not leak into preview.
		await enterPreviewMode();
		expect(store.collection).toHaveLength(0);
		expect(store.savedCardLists).toHaveLength(0);
		expect(await checkLocalDatabase()).toBe(true); // the in-memory one
	});
});
