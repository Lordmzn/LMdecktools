/**
 * The stash a shared file passes through on its way from the service worker's
 * `share_target` POST intercept to the receiving route (#91, T2).
 *
 * Cache API rather than IndexedDB: the worker already owns two caches, a
 * `Response` is exactly what a `File` is, and nothing here needs a schema.
 * One entry, always overwritten — a share is consumed by the very next load
 * of `/share-target/`, which is also why reading it clears it: a page refresh
 * must not reimport the same file a second time.
 *
 * The cache name and key must match `src/service-worker.ts`'s
 * `SHARE_STASH_CACHE` / `SHARE_STASH_URL` exactly. Not imported from there —
 * a service worker may only import `$service-worker` and `$env/static/public`
 * — so the worker spells them out again rather than sharing this module.
 */

const SHARE_STASH_CACHE = 'lm-decktools-share-stash';
const SHARE_STASH_URL = 'share-payload';

/** Read the stashed file and clear it in the same call. Null when nothing is stashed. */
export async function takeShareStash(): Promise<Uint8Array | null> {
	if (typeof caches === 'undefined') return null;

	const cache = await caches.open(SHARE_STASH_CACHE);
	const hit = await cache.match(SHARE_STASH_URL);
	if (!hit) return null;

	await cache.delete(SHARE_STASH_URL);
	return new Uint8Array(await hit.arrayBuffer());
}
