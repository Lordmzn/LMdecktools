import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getImageUrl, getImageCacheStats, clearImageCache } from '../image-cache';

function createMockCache() {
	const store = new Map<string, Response>();
	return {
		match: vi.fn(async (url: string) => store.get(url) ?? undefined),
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
		it('returns correct count of cached images', async () => {
			// Populate cache via getImageUrl (which calls fetch + cache.put internally)
			await getImageUrl('https://example.com/img1.jpg');
			await getImageUrl('https://example.com/img2.jpg');
			await getImageUrl('https://example.com/img3.jpg');

			const stats = await getImageCacheStats();
			expect(stats.count).toBe(3);
		});

		it('returns zero when cache is empty', async () => {
			const stats = await getImageCacheStats();
			expect(stats.count).toBe(0);
		});

		it('returns zero when caches API is unavailable', async () => {
			vi.stubGlobal('caches', undefined);
			const stats = await getImageCacheStats();
			expect(stats.count).toBe(0);
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
