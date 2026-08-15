const CACHE_NAME = 'lm-decktools-images';

function isCacheAvailable(): boolean {
	return typeof caches !== 'undefined';
}

export async function getImageUrl(scryfallUrl: string): Promise<string> {
	if (!scryfallUrl || !isCacheAvailable()) {
		return scryfallUrl;
	}

	try {
		const cache = await caches.open(CACHE_NAME);
		const cached = await cache.match(scryfallUrl);

		if (cached) {
			const blob = await cached.blob();
			return URL.createObjectURL(blob);
		}

		const response = await fetch(scryfallUrl);
		await cache.put(scryfallUrl, response.clone());
		const blob = await response.blob();
		return URL.createObjectURL(blob);
	} catch {
		return scryfallUrl;
	}
}

export interface ImageCacheStats {
	count: number;
	/** Total bytes held by the cached responses. 0 when the Cache API is unavailable. */
	bytes: number;
}

/**
 * Measuring bytes means hydrating cached responses, which is O(cache) — so the
 * last result is kept for the session. `cache.keys()` is cheap; only the sizing
 * pass is not.
 *
 * The cache is append-only (entries are added, never rewritten in place), which
 * buys two things: an unchanged entry count means unchanged bytes, and when the
 * count *has* grown only the new keys need sizing. So the URLs already measured
 * are remembered alongside the total and the re-measure is incremental — which
 * matters now that the DB modal re-reads this on every open (#64) rather than
 * once per page load.
 */
let statsMemo: (ImageCacheStats & { measured: Set<string> }) | null = null;

/** The URL a cache key stands for — `cache.keys()` yields Requests, not strings. */
function keyUrl(key: RequestInfo | URL): string {
	return typeof key === 'string' ? key : key instanceof URL ? key.href : key.url;
}

/** Size of one cached response: the Content-Length header if present, else the blob. */
async function measureEntry(cache: Cache, key: RequestInfo | URL): Promise<number> {
	const response = await cache.match(key);
	if (!response) return 0;

	const contentLength = response.headers?.get('content-length');
	if (contentLength) {
		const declared = Number(contentLength);
		if (Number.isFinite(declared) && declared >= 0) return declared;
	}

	// No Content-Length (opaque or header-stripped response) — hydrate the body.
	// An opaque response reports 0 here, which under-reports rather than throwing.
	const blob = await response.blob();
	return blob.size;
}

export async function getImageCacheStats(): Promise<ImageCacheStats> {
	if (!isCacheAvailable()) {
		return { count: 0, bytes: 0 };
	}

	try {
		const cache = await caches.open(CACHE_NAME);
		const keys = await cache.keys();

		if (statsMemo && statsMemo.count === keys.length) {
			return { count: statsMemo.count, bytes: statsMemo.bytes };
		}

		// Size only what has not been sized before. On a cold read that is every
		// entry; on a re-read after browsing, just the handful newly cached.
		const measured = statsMemo?.measured ?? new Set<string>();
		const fresh = keys.filter((key) => !measured.has(keyUrl(key)));
		const sizes = await Promise.all(fresh.map((key) => measureEntry(cache, key)));

		for (const key of fresh) {
			measured.add(keyUrl(key));
		}

		statsMemo = {
			count: keys.length,
			bytes: (statsMemo?.bytes ?? 0) + sizes.reduce((total, size) => total + size, 0),
			measured
		};
		return { count: statsMemo.count, bytes: statsMemo.bytes };
	} catch {
		return { count: 0, bytes: 0 };
	}
}

/** Human-readable size for the DB modal, e.g. `86.4 MB`. Decimal units, as browsers report them. */
export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

	const units = ['B', 'kB', 'MB', 'GB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1000 && unit < units.length - 1) {
		value /= 1000;
		unit++;
	}

	// Bytes are always whole; larger units get one decimal place
	return unit === 0 ? `${Math.round(value)} B` : `${value.toFixed(1)} ${units[unit]}`;
}

export async function clearImageCache(): Promise<void> {
	statsMemo = null;

	if (!isCacheAvailable()) {
		return;
	}

	await caches.delete(CACHE_NAME);
}
