import { describe, it, expect, vi } from 'vitest';
import {
	requestPersistentStorage,
	readStorageReport,
	type StorageManagerLike
} from '../storage-persistence';

describe('requestPersistentStorage', () => {
	it('asks for the grant when the origin does not have it', async () => {
		const persist = vi.fn().mockResolvedValue(true);
		const manager: StorageManagerLike = { persist, persisted: async () => false };

		expect(await requestPersistentStorage(manager)).toBe(true);
		expect(persist).toHaveBeenCalledOnce();
	});

	// On Firefox the second ask is a permission prompt, and a prompt on every
	// load is how a user learns to click Deny.
	it('does not ask again when the origin is already persistent', async () => {
		const persist = vi.fn().mockResolvedValue(true);
		const manager: StorageManagerLike = { persist, persisted: async () => true };

		expect(await requestPersistentStorage(manager)).toBe(true);
		expect(persist).not.toHaveBeenCalled();
	});

	it('reports the refusal rather than throwing', async () => {
		const manager: StorageManagerLike = {
			persist: async () => false,
			persisted: async () => false
		};
		expect(await requestPersistentStorage(manager)).toBe(false);
	});

	it('survives a browser that rejects the call outright', async () => {
		const manager: StorageManagerLike = {
			persist: () => Promise.reject(new Error('SecurityError')),
			persisted: async () => false
		};
		expect(await requestPersistentStorage(manager)).toBe(false);
	});

	it('is a no-op where the API does not exist', async () => {
		expect(await requestPersistentStorage(null)).toBe(false);
		expect(await requestPersistentStorage({})).toBe(false);
	});
});

describe('readStorageReport', () => {
	it('reports the grant and the estimate', async () => {
		const report = await readStorageReport({
			persisted: async () => true,
			estimate: async () => ({ usage: 12_400_000, quota: 2_100_000_000 })
		});

		expect(report).toEqual({
			supported: true,
			persisted: true,
			usage: 12_400_000,
			quota: 2_100_000_000
		});
	});

	// `supported: false` is what lets the modal say "unknown" instead of claiming
	// the storage is unprotected — those are different facts.
	it('is unsupported only when the browser offers neither call', async () => {
		expect(await readStorageReport({})).toEqual({
			supported: false,
			persisted: false,
			usage: null,
			quota: null
		});
		expect(await readStorageReport(null)).toEqual({
			supported: false,
			persisted: false,
			usage: null,
			quota: null
		});
	});

	// The two halves ship separately in real browsers, so one missing must not
	// blank the other.
	it('estimates without persisted(), and reports the grant without estimate()', async () => {
		const estimateOnly = await readStorageReport({
			estimate: async () => ({ usage: 500, quota: 1000 })
		});
		expect(estimateOnly).toEqual({ supported: true, persisted: false, usage: 500, quota: 1000 });

		const persistedOnly = await readStorageReport({ persisted: async () => true });
		expect(persistedOnly).toEqual({ supported: true, persisted: true, usage: null, quota: null });
	});

	it('keeps the grant when the estimate throws, and vice versa', async () => {
		const badEstimate = await readStorageReport({
			persisted: async () => true,
			estimate: () => Promise.reject(new Error('nope'))
		});
		expect(badEstimate).toMatchObject({ persisted: true, usage: null, quota: null });

		const badPersisted = await readStorageReport({
			persisted: () => Promise.reject(new Error('nope')),
			estimate: async () => ({ usage: 7, quota: 9 })
		});
		expect(badPersisted).toMatchObject({ persisted: false, usage: 7, quota: 9 });
	});

	// Both fields of `StorageEstimate` are optional, and Safari has been known to
	// answer with neither.
	it('treats missing or nonsense figures as unreported', async () => {
		const empty = await readStorageReport({ estimate: async () => ({}) });
		expect(empty).toMatchObject({ supported: true, usage: null, quota: null });

		const nonsense = await readStorageReport({
			estimate: async () => ({ usage: Number.NaN, quota: -1 })
		});
		expect(nonsense).toMatchObject({ usage: null, quota: null });
	});
});
