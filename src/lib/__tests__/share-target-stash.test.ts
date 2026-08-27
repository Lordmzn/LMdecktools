/**
 * The stash between the service worker's `share_target` POST intercept and
 * the receiving route (#91, T2). `service-worker.ts` itself is never unit
 * imported (it needs `$service-worker` and worker globals) — its half of this
 * contract is exercised in `tests/e2e/pwa.spec.ts` against a real build. This
 * file covers the reading half only.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { takeShareStash } from '../share-target-stash';

function createMockCache() {
	const store = new Map<string, Response>();
	return {
		match: vi.fn(async (key: string) => store.get(key)?.clone() ?? undefined),
		put: vi.fn(async (key: string, response: Response) => {
			store.set(key, response);
		}),
		delete: vi.fn(async (key: string) => store.delete(key)),
		_store: store
	};
}

describe('takeShareStash', () => {
	let mockCache: ReturnType<typeof createMockCache>;

	beforeEach(() => {
		mockCache = createMockCache();
		vi.stubGlobal('caches', { open: vi.fn(async () => mockCache) });
	});

	it('returns null when nothing was stashed', async () => {
		expect(await takeShareStash()).toBeNull();
	});

	it('returns the stashed bytes', async () => {
		await mockCache.put('share-payload', new Response('{"hello":"world"}'));

		const bytes = await takeShareStash();

		expect(bytes).not.toBeNull();
		expect(new TextDecoder().decode(bytes!)).toBe('{"hello":"world"}');
	});

	it('clears the stash after reading it, so a refresh cannot reimport it', async () => {
		await mockCache.put('share-payload', new Response('{"hello":"world"}'));

		await takeShareStash();

		expect(mockCache.delete).toHaveBeenCalledWith('share-payload');
		expect(await takeShareStash()).toBeNull();
	});

	it('returns null rather than throwing when the Cache API is unavailable', async () => {
		vi.stubGlobal('caches', undefined);
		expect(await takeShareStash()).toBeNull();
	});
});
