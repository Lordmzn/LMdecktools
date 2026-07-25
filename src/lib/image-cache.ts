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

export async function getImageCacheStats(): Promise<{ count: number }> {
	if (!isCacheAvailable()) {
		return { count: 0 };
	}

	try {
		const cache = await caches.open(CACHE_NAME);
		const keys = await cache.keys();
		return { count: keys.length };
	} catch {
		return { count: 0 };
	}
}

export async function clearImageCache(): Promise<void> {
	if (!isCacheAvailable()) {
		return;
	}

	await caches.delete(CACHE_NAME);
}
