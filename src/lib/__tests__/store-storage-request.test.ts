/**
 * Where the persistence request is made from (#88).
 *
 * The seam is `openDocument()`'s persisting branch, not startup: a browser tab
 * that never opens a database has nothing to protect, and preview mode attaches
 * no persistence at all, so asking there would prompt about a container the app
 * deliberately never writes to (#87).
 *
 * Its own file because `enterPreviewMode()` swaps the module-level storage
 * factory and `initDB()` creates the real (test-global) databases — the two
 * need different teardown.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { resetDatabases } from './reset';
import { initDB, enterPreviewMode, closeDB, store } from '../store.svelte';
import { useStorageFactory } from '../db';

/**
 * Stand in for `navigator.storage`, which Node does not implement. Returns the
 * spy the assertions read; the property is configurable so the next test can
 * replace it.
 */
function stubStorageManager() {
	const persist = vi.fn().mockResolvedValue(true);
	Object.defineProperty(globalThis.navigator, 'storage', {
		value: { persist, persisted: vi.fn().mockResolvedValue(false) },
		configurable: true,
		writable: true
	});
	return persist;
}

afterEach(async () => {
	await closeDB();
	store.dbMode = 'none';
	store.installContext = 'browser';
	store.collection = [];
	store.savedCardLists = [];
	useStorageFactory(globalThis.indexedDB);
	await resetDatabases();
	Reflect.deleteProperty(globalThis.navigator, 'storage');
});

describe('persistent storage request', () => {
	it('asks once the document is persisted', async () => {
		const persist = stubStorageManager();

		await initDB();
		// Fire-and-forget: the request is not awaited by the caller, so let the
		// microtask that made it settle.
		await Promise.resolve();

		expect(persist).toHaveBeenCalledOnce();
	});

	it('never asks in preview mode', async () => {
		const persist = stubStorageManager();

		await enterPreviewMode();
		await Promise.resolve();

		expect(persist).not.toHaveBeenCalled();
	});
});
