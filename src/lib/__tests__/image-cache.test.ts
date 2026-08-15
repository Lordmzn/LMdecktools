import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getImageUrl, getImageCacheStats, clearImageCache, formatBytes } from '../image-cache';

function createMockCache() {
	const store = new Map<string, Response>();
	return {
		// Clone on read, as the real Cache API does — a Response body is single-use
		match: vi.fn(async (url: string) => store.get(url)?.clone() ?? undefined),
		put: vi.fn(async (url: string, response: Response) => {
			store.set(url, response);
		}),
		keys: vi.fn(async () => Array.from(store.keys())),
		_store: store
	};
}

describe('image-cache', () => {
	let mockCache: ReturnType<typeof createMockCache>;

	beforeEach(() => {
		mockCache = createMockCache();

		const mockCaches = {
			open: vi.fn(async () => mockCache),
			delete: vi.fn(async () => true),
			has: vi.fn(async () => true),
			keys: vi.fn(async () => []),
			match: vi.fn(async () => undefined)
		};

		vi.stubGlobal('caches', mockCaches);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				const body = new Blob(['fake-image-data'], { type: 'image/png' });
				return new Response(body, { status: 200 });
			})
		);
		vi.stubGlobal('URL', {
			...globalThis.URL,
			createObjectURL: vi.fn(() => 'blob:http://localhost/fake-blob-url'),
			revokeObjectURL: vi.fn()
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('getImageUrl', () => {
		it('fetches and caches on cache miss', async () => {
			const url = 'https://cards.scryfall.io/normal/front/a/test.jpg';
			const result = await getImageUrl(url);

			expect(fetch).toHaveBeenCalledWith(url);
			expect(mockCache.put).toHaveBeenCalled();
			expect(result).toBe('blob:http://localhost/fake-blob-url');
		});

		it('returns blob URL from cache on cache hit', async () => {
			const url = 'https://cards.scryfall.io/normal/front/a/test.jpg';
			const cachedResponse = new Response(new Blob(['cached-data'], { type: 'image/png' }));
			mockCache._store.set(url, cachedResponse);

			const result = await getImageUrl(url);

			expect(fetch).not.toHaveBeenCalled();
			expect(mockCache.match).toHaveBeenCalledWith(url);
			expect(result).toBe('blob:http://localhost/fake-blob-url');
		});

		it('returns raw URL when caches API is unavailable', async () => {
			vi.stubGlobal('caches', undefined);
			const url = 'https://cards.scryfall.io/normal/front/a/test.jpg';

			const result = await getImageUrl(url);

			expect(result).toBe(url);
		});

		it('returns empty string for falsy URL', async () => {
			const result = await getImageUrl('');
			expect(result).toBe('');
		});
	});

	describe('getImageCacheStats', () => {
		// 'fake-image-data' — what the fetch stub returns for every image
		const ENTRY_BYTES = 15;

		// The size measurement is memoised for the session; drop it between tests
		beforeEach(async () => {
			await clearImageCache();
		});

		it('returns correct count of cached images', async () => {
			// Populate cache via getImageUrl (which calls fetch + cache.put internally)
			await getImageUrl('https://example.com/img1.jpg');
			await getImageUrl('https://example.com/img2.jpg');
			await getImageUrl('https://example.com/img3.jpg');

			const stats = await getImageCacheStats();
			expect(stats.count).toBe(3);
		});

		it('sums the size of every cached response', async () => {
			await getImageUrl('https://example.com/img1.jpg');
			await getImageUrl('https://example.com/img2.jpg');

			const stats = await getImageCacheStats();
			expect(stats.bytes).toBe(2 * ENTRY_BYTES);
		});

		it('prefers Content-Length over hydrating the body', async () => {
			mockCache._store.set(
				'https://example.com/declared.jpg',
				new Response(new Blob(['tiny']), { headers: { 'content-length': '204800' } })
			);

			const stats = await getImageCacheStats();
			expect(stats.bytes).toBe(204800);
		});

		it('counts an unmeasurable entry as zero rather than failing', async () => {
			// An opaque response exposes neither Content-Length nor a readable body
			const opaque = {
				headers: { get: () => null },
				blob: async () => ({ size: 0 }),
				clone() {
					return this;
				}
			} as unknown as Response;
			mockCache._store.set('https://example.com/opaque.jpg', opaque);
			await getImageUrl('https://example.com/img1.jpg');

			const stats = await getImageCacheStats();
			expect(stats.count).toBe(2);
			expect(stats.bytes).toBe(ENTRY_BYTES);
		});

		it('reuses the measurement while the entry count is unchanged', async () => {
			await getImageUrl('https://example.com/img1.jpg');

			const first = await getImageCacheStats();
			mockCache.match.mockClear();
			const second = await getImageCacheStats();

			expect(second).toEqual(first);
			// No response was hydrated the second time — only keys() was consulted
			expect(mockCache.match).not.toHaveBeenCalled();
		});

		it('re-measures once the cache has grown', async () => {
			await getImageUrl('https://example.com/img1.jpg');
			expect((await getImageCacheStats()).bytes).toBe(ENTRY_BYTES);

			await getImageUrl('https://example.com/img2.jpg');
			expect((await getImageCacheStats()).bytes).toBe(2 * ENTRY_BYTES);
		});

		it('sizes only the newly added entries when re-measuring', async () => {
			await getImageUrl('https://example.com/img1.jpg');
			await getImageUrl('https://example.com/img2.jpg');
			expect((await getImageCacheStats()).bytes).toBe(2 * ENTRY_BYTES);

			await getImageUrl('https://example.com/img3.jpg');
			mockCache.match.mockClear();

			const stats = await getImageCacheStats();

			expect(stats.bytes).toBe(3 * ENTRY_BYTES);
			// The two already-sized entries were not hydrated again — the cache is
			// append-only, so only the new key needed measuring (#64)
			expect(mockCache.match).toHaveBeenCalledTimes(1);
		});

		it('re-measures everything after a clear', async () => {
			await getImageUrl('https://example.com/img1.jpg');
			expect((await getImageCacheStats()).bytes).toBe(ENTRY_BYTES);

			await clearImageCache();
			mockCache._store.clear();
			await getImageUrl('https://example.com/img1.jpg');

			// The memo was dropped, so this is a fresh reading rather than a stale sum
			expect(await getImageCacheStats()).toEqual({ count: 1, bytes: ENTRY_BYTES });
		});

		it('returns zero when cache is empty', async () => {
			const stats = await getImageCacheStats();
			expect(stats).toEqual({ count: 0, bytes: 0 });
		});

		it('returns zero when caches API is unavailable', async () => {
			vi.stubGlobal('caches', undefined);
			const stats = await getImageCacheStats();
			expect(stats).toEqual({ count: 0, bytes: 0 });
		});
	});

	describe('formatBytes', () => {
		it('formats bytes, kB, MB and GB', () => {
			expect(formatBytes(0)).toBe('0 B');
			expect(formatBytes(512)).toBe('512 B');
			expect(formatBytes(2048)).toBe('2.0 kB');
			expect(formatBytes(86_400_000)).toBe('86.4 MB');
			expect(formatBytes(3_200_000_000)).toBe('3.2 GB');
		});

		it('does not report a negative or non-finite size', () => {
			expect(formatBytes(-1)).toBe('0 B');
			expect(formatBytes(NaN)).toBe('0 B');
		});
	});

	describe('clearImageCache', () => {
		it('deletes the image cache', async () => {
			await clearImageCache();
			expect(caches.delete).toHaveBeenCalledWith('lm-decktools-images');
		});

		it('does nothing when caches API is unavailable', async () => {
			const deleteFn = caches.delete;
			vi.stubGlobal('caches', undefined);

			await clearImageCache();
			expect(deleteFn).not.toHaveBeenCalled();
		});
	});
});
