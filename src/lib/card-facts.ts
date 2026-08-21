/**
 * Local cache of the refetchable half of a card (#84).
 *
 * Images, face art and set names are Scryfall's facts, not the user's data:
 * they never conflict, they are the same on every device, and they can always
 * be fetched again from `/cards/collection`. So they live here — in the
 * `card_facts` object store, keyed by Scryfall id — instead of in every saved
 * record, for the same reason the image cache exists (`image-cache.ts`).
 *
 * Consequences worth knowing:
 * - The cache is **outside the export payload and outside `clearDatabase()`**.
 *   It is not user data; a restored backup neither carries it between machines
 *   nor wipes it, and keeping it means a restore renders immediately instead of
 *   waiting on the network.
 * - A card whose facts are missing renders as name and quantity until Scryfall
 *   can be reached. That is the agreed cost, and why `name`, `set` and
 *   `collector_number` stay in the stored record.
 *
 * Like `error-journal.ts`, this module must not import from `store.svelte.ts`:
 * the dependency runs one way, which keeps it testable without a rune owner.
 */

import { CARD_FACTS_STORE } from './db';
import type { CardFacts } from './card-fields';

/** Facts keyed by Scryfall id — a plain record, so the store can hold it in `$state`. */
export type CardFactsIndex = Record<string, CardFacts>;

/** Older databases (before v5) have no such store; every operation is a no-op there. */
function hasFactsStore(db: IDBDatabase): boolean {
	return db.objectStoreNames.contains(CARD_FACTS_STORE);
}

/**
 * Read the whole cache into memory. Trimmed facts run a few hundred bytes per
 * card, so even a large collection is a couple of megabytes — cheaper to hold
 * than to hit IndexedDB once per rendered card.
 */
export async function loadCardFacts(db: IDBDatabase): Promise<CardFactsIndex> {
	if (!hasFactsStore(db)) return {};

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(CARD_FACTS_STORE, 'readonly');
		const store = transaction.objectStore(CARD_FACTS_STORE);
		const request = store.getAll();

		request.onsuccess = () => {
			const index: CardFactsIndex = {};
			for (const facts of request.result as CardFacts[]) {
				if (facts?.id) index[facts.id] = facts;
			}
			resolve(index);
		};

		request.onerror = () => {
			reject(new Error(`Failed to load card facts: ${request.error?.message}`));
		};
	});
}

/**
 * Write facts for a batch of cards in one transaction. Puts overwrite by id —
 * a later fetch of the same printing is the same facts, so there is nothing to
 * reconcile.
 */
export async function putCardFacts(db: IDBDatabase, facts: CardFacts[]): Promise<void> {
	if (facts.length === 0 || !hasFactsStore(db)) return;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(CARD_FACTS_STORE, 'readwrite');
		const store = transaction.objectStore(CARD_FACTS_STORE);

		for (const entry of facts) {
			if (entry?.id) store.put(entry);
		}

		transaction.oncomplete = () => resolve();
		transaction.onerror = () => {
			reject(new Error(`Failed to save card facts: ${transaction.error?.message}`));
		};
		transaction.onabort = () => {
			reject(new Error(`Failed to save card facts: ${transaction.error?.message ?? 'aborted'}`));
		};
	});
}

/** Drop the cache. Nothing is lost that Scryfall cannot return. */
export async function clearCardFacts(db: IDBDatabase): Promise<void> {
	if (!hasFactsStore(db)) return;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(CARD_FACTS_STORE, 'readwrite');
		const request = transaction.objectStore(CARD_FACTS_STORE).clear();

		request.onsuccess = () => resolve();
		request.onerror = () => {
			reject(new Error(`Failed to clear card facts: ${request.error?.message}`));
		};
	});
}

/**
 * The ids in `cards` that the index cannot draw — what a hydration pass has to
 * ask Scryfall for. Deduplicated, and in first-seen order so the first batch is
 * the first thing the user is looking at.
 */
export function missingFactIds(cards: { id?: string }[], known: CardFactsIndex): string[] {
	const missing: string[] = [];
	const seen = new Set<string>();

	for (const card of cards) {
		const id = card?.id;
		if (!id || seen.has(id) || known[id]) continue;
		seen.add(id);
		missing.push(id);
	}

	return missing;
}
