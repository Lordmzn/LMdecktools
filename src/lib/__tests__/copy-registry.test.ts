/**
 * The copy registry's data layer (#90) — `deviceId` and the list of known
 * copies, both stored under the existing `metadata` store. No IndexedDB
 * schema change, so these tests share `db.ts`'s own fixture pattern.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetDatabases } from './reset';
import { openDatabase } from '../db';
import { getOrCreateDeviceId, getCopyRegistry, recordCopy } from '../copy-registry';

describe('the copy registry', () => {
	let db: IDBDatabase;

	beforeEach(async () => {
		db = await openDatabase();
	});

	afterEach(async () => {
		db.close();
		await resetDatabases();
	});

	describe('getOrCreateDeviceId', () => {
		it('mints an id on first use and returns the same one after', async () => {
			const first = await getOrCreateDeviceId(db);
			const second = await getOrCreateDeviceId(db);

			expect(first).toBe(second);
			expect(first.length).toBeGreaterThan(0);
		});
	});

	describe('getCopyRegistry', () => {
		it('is empty for a lineage nothing has been recorded against', async () => {
			expect(await getCopyRegistry(db, 'guid-a')).toEqual([]);
		});

		it('does not leak entries from a different lineage', async () => {
			await recordCopy(db, 'guid-a', {
				id: 'export',
				kind: 'export',
				label: 'backup.yjs',
				lastSeen: 1000
			});

			// A fresh guid — a `clearDB()`, or a restored file with a foreign
			// lineage — must not inherit the previous lineage's copies.
			expect(await getCopyRegistry(db, 'guid-b')).toEqual([]);
			expect(await getCopyRegistry(db, 'guid-a')).toHaveLength(1);
		});
	});

	describe('recordCopy', () => {
		it('adds a new entry and returns the updated list', async () => {
			const entries = await recordCopy(db, 'guid-a', {
				id: 'linked-file',
				kind: 'linked-file',
				label: 'collection.yjs',
				lastSeen: 500
			});

			expect(entries).toEqual([
				{ id: 'linked-file', kind: 'linked-file', label: 'collection.yjs', lastSeen: 500 }
			]);
			expect(await getCopyRegistry(db, 'guid-a')).toEqual(entries);
		});

		it('upserts by id rather than accumulating duplicates', async () => {
			await recordCopy(db, 'guid-a', {
				id: 'export',
				kind: 'export',
				label: 'first.yjs',
				lastSeen: 100
			});
			const entries = await recordCopy(db, 'guid-a', {
				id: 'export',
				kind: 'export',
				label: 'second.yjs',
				lastSeen: 200
			});

			expect(entries).toEqual([
				{ id: 'export', kind: 'export', label: 'second.yjs', lastSeen: 200 }
			]);
		});

		it('keeps entries of different kinds apart', async () => {
			await recordCopy(db, 'guid-a', {
				id: 'linked-file',
				kind: 'linked-file',
				label: 'collection.yjs',
				lastSeen: 100
			});
			const entries = await recordCopy(db, 'guid-a', {
				id: 'export',
				kind: 'export',
				label: 'backup.yjs',
				lastSeen: 200
			});

			expect(entries).toHaveLength(2);
			expect(entries.map((e) => e.id).sort()).toEqual(['export', 'linked-file']);
		});
	});
});
