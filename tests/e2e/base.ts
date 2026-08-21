import * as Y from 'yjs';

/**
 * The app's base path, mirroring `kit.paths.base` (#25).
 *
 * Specs navigate with relative targets (`./collection`) so Playwright's
 * `baseURL` supplies this automatically — but anything that matches a rendered
 * `href` or asserts on a URL has to spell it out, because those carry the base.
 */
export const BASE = '/decktools';

/** The href SvelteKit renders for an internal route, base included. */
export function appHref(route: string): string {
	return `${BASE}${route}`;
}

/**
 * What is actually on disk, decoded (#47).
 *
 * There are no `card_lists` and `collection` object stores to read any more —
 * the user's data is a log of Yjs updates in the document's own database. So
 * the bytes come out of the browser and are replayed here, which keeps these
 * assertions what they were: a statement about what was persisted, not about
 * what the page happens to be rendering.
 */
export async function persistedDocument(page: import('@playwright/test').Page): Promise<{
	lists: { id: string; name: string; cards: { id: string; LM_quantity: number }[] }[];
	collection: { id: string; quantity_owned: number }[];
}> {
	const updates = await page.evaluate(async () => {
		const db = await new Promise<IDBDatabase | null>((resolve) => {
			const request = indexedDB.open('lmdecktools-doc');
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve(null);
		});
		if (!db || !db.objectStoreNames.contains('updates')) return [];

		const stored = await new Promise<ArrayBuffer[]>((resolve) => {
			const request = db.transaction('updates', 'readonly').objectStore('updates').getAll();
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve([]);
		});
		db.close();

		// Structured clone cannot carry a Uint8Array back through evaluate as one.
		return stored.map((update) => [...new Uint8Array(update)]);
	});

	const doc = new Y.Doc();
	for (const update of updates) {
		Y.applyUpdate(doc, new Uint8Array(update));
	}

	const lists: { id: string; name: string; cards: { id: string; LM_quantity: number }[] }[] = [];
	doc.getMap('card_lists').forEach((value, id) => {
		const list = value as Y.Map<unknown>;
		const cards: { id: string; LM_quantity: number }[] = [];
		(list.get('cards') as Y.Map<Y.Map<unknown>> | undefined)?.forEach((card, cardId) => {
			cards.push({ id: cardId, LM_quantity: card.get('LM_quantity') as number });
		});
		lists.push({ id, name: list.get('name') as string, cards });
	});

	const collection: { id: string; quantity_owned: number }[] = [];
	doc.getMap('collection').forEach((value, id) => {
		collection.push({
			id,
			quantity_owned: (value as Y.Map<unknown>).get('quantity_owned') as number
		});
	});

	return { lists, collection };
}
