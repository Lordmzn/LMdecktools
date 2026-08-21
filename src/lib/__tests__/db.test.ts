/**
 * What `db.ts` is left holding after #47.
 *
 * The lists and the collection moved to the document, and with them every CRUD
 * function this file used to exercise — those behaviours are now in
 * `ydoc.test.ts` (the model) and the store tests (the app's use of it). What
 * stays here is deliberately small and deliberately device-local: the auto-load
 * preference, the linked-file handle, the document guid, the error journal and
 * the card-facts cache. None of it may ever sync.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDatabases } from './reset';
import {
	CARD_FACTS_STORE,
	ERROR_JOURNAL_STORE,
	databaseExists,
	getMetadata,
	openDatabase,
	putMetadata,
	storageFactory,
	useStorageFactory
} from '../db';

describe('the device-local database', () => {
	let db: IDBDatabase;

	beforeEach(async () => {
		db = await openDatabase();
	});

	afterEach(async () => {
		db.close();
		await resetDatabases();
	});

	it('holds only what must not sync', () => {
		expect([...db.objectStoreNames].sort()).toEqual([
			CARD_FACTS_STORE,
			ERROR_JOURNAL_STORE,
			'metadata'
		]);
	});

	it('is version 6', () => {
		expect(db.version).toBe(6);
	});

	describe('metadata', () => {
		it('round-trips a value with a timestamp', async () => {
			const before = Date.now();
			await putMetadata(db, 'autoLoadDB', true);

			const entry = await getMetadata(db, 'autoLoadDB');
			expect(entry.value).toBe(true);
			expect(entry.timestamp).toBeGreaterThanOrEqual(before);
		});

		it('overwrites a key rather than accumulating', async () => {
			await putMetadata(db, 'documentGuid', 'first');
			await putMetadata(db, 'documentGuid', 'second');

			expect((await getMetadata(db, 'documentGuid')).value).toBe('second');
		});

		it('answers null for a key that was never written', async () => {
			expect(await getMetadata(db, 'never-set')).toBeNull();
		});
	});

	describe('databaseExists', () => {
		it('finds a database that is open', async () => {
			expect(await databaseExists('LMdecktools')).toBe(true);
		});

		it('does not invent one that is not', async () => {
			// The question has two answers since #47 — this one and the document's
			// — and the store is what puts them together.
			expect(await databaseExists('lmdecktools-doc')).toBe(false);
		});
	});
});

describe('the storage factory', () => {
	afterEach(() => {
		useStorageFactory(globalThis.indexedDB);
	});

	it('is swappable, which is the whole of preview mode (#87)', async () => {
		const { IDBFactory } = await import('fake-indexeddb');
		const memory = new IDBFactory();

		useStorageFactory(memory);
		expect(storageFactory()).toBe(memory);

		const db = await openDatabase();
		expect(db.name).toBe('LMdecktools');
		db.close();

		// Opened, used, and invisible to the browser's own store.
		const real = (await globalThis.indexedDB.databases()).map((d) => d.name);
		expect(real).not.toContain('LMdecktools');
	});
});
