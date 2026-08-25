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
import { initDB, enterPreviewMode, closeDB, clearDB, store } from '../store.svelte';
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
	store.deviceId = null;
	store.copyRegistryEntries = [];
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

/**
 * The copy registry's app-level wiring (#90) — same seam as the persistence
 * request above, `openDocument()`'s persisting branch.
 */
describe('copy registry provisioning', () => {
	it('mints a deviceId and starts at one copy — this device, nothing else yet', async () => {
		stubStorageManager();

		await initDB();

		expect(store.deviceId).not.toBeNull();
		expect(store.copyRegistryEntries).toEqual([]);
		expect(store.copyCount).toBe(1);
	});

	it('never counts a copy in preview mode', async () => {
		stubStorageManager();

		await enterPreviewMode();

		expect(store.copyCount).toBe(0);
	});

	it('does not carry a copy record into a fresh lineage', async () => {
		stubStorageManager();

		await initDB();
		const deviceId = store.deviceId;
		store.copyRegistryEntries = [
			{ id: 'export', kind: 'export', label: 'backup.yjs', lastSeen: Date.now() }
		];
		expect(store.copyCount).toBe(2);

		await clearDB();

		// The device identity survives — it names the hardware, not the lineage —
		// but a brand-new guid has no copies recorded against it yet.
		expect(store.deviceId).toBe(deviceId);
		expect(store.copyRegistryEntries).toEqual([]);
		expect(store.copyCount).toBe(1);
	});
});
