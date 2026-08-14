/**
 * Deterministic, non-destructive merge of a linked-file snapshot into the
 * local database.
 *
 * The linked file is a *snapshot*, not a CRDT (#46): every save builds a fresh
 * `Y.Doc`, so the file carries no history, no client identity and no
 * tombstones. Two such documents are not peers — applying one's update to the
 * other resolves a shared key to a single side's value and silently drops the
 * other's. These functions replace that with an explicit union:
 *
 * - lists are unioned by name, cards by `id`, collection cards by `id`
 * - quantities (`LM_quantity`, `quantity_owned`) resolve to `max()`
 * - the newest `updated_at` wins; local `id`s are preserved so IndexedDB keys
 *   stay stable
 * - nothing is ever removed
 *
 * Deletion propagation is out of scope until the persistent `Y.Doc` lands
 * (#47); a merge that never deletes is the safe behaviour until then.
 */

import type { Card, CardList, CollectionCard } from './db';

export interface MergeResult<T> {
	/** The full merged set. */
	merged: T[];
	/** The subset of `merged` that differs from local and must be written back. */
	changed: T[];
}

/**
 * Union two card arrays by card id, resolving quantity conflicts to the
 * higher count. Local card data wins on every other field.
 */
export function mergeListCards(local: Card[], remote: Card[]): MergeResult<Card> {
	const merged = local.map((card) => ({ ...card }));
	const indexById = new Map<string, number>();
	merged.forEach((card, i) => indexById.set(card.id, i));

	const changed: Card[] = [];

	for (const remoteCard of remote) {
		const index = indexById.get(remoteCard.id);

		if (index === undefined) {
			indexById.set(remoteCard.id, merged.length);
			const added = { ...remoteCard };
			merged.push(added);
			changed.push(added);
			continue;
		}

		const localCard = merged[index];
		const quantity = Math.max(localCard.LM_quantity, remoteCard.LM_quantity);
		if (quantity !== localCard.LM_quantity) {
			const updated = { ...localCard, LM_quantity: quantity };
			merged[index] = updated;
			changed.push(updated);
		}
	}

	return { merged, changed };
}

/**
 * Union two sets of card lists by list name.
 *
 * `changed` holds the lists that need to be persisted: remote-only lists (with
 * the remote `id` stripped so IndexedDB assigns a fresh key) and local lists
 * whose cards or matching settings the merge actually altered.
 */
export function mergeCardListSets(local: CardList[], remote: CardList[]): MergeResult<CardList> {
	const merged = local.map((list) => ({ ...list, cards: list.cards.map((card) => ({ ...card })) }));
	const byName = new Map<string, CardList>();
	for (const list of merged) byName.set(list.name, list);

	const changed: CardList[] = [];

	for (const remoteList of remote) {
		const localList = byName.get(remoteList.name);

		if (!localList) {
			// The remote id may already belong to a different local list, so drop
			// it and let autoIncrement assign a key.
			const added: CardList = {
				...remoteList,
				id: undefined,
				cards: remoteList.cards.map((card) => ({ ...card }))
			};
			merged.push(added);
			byName.set(added.name, added);
			changed.push(added);
			continue;
		}

		const cards = mergeListCards(localList.cards, remoteList.cards);
		localList.cards = cards.merged;

		// The side edited most recently owns the matching settings; timestamps
		// span both sides.
		const remoteIsNewer = remoteList.updated_at > localList.updated_at;
		const settingsChanged =
			remoteIsNewer &&
			(remoteList.cardMatching !== localList.cardMatching ||
				remoteList.languageMatching !== localList.languageMatching);

		if (remoteIsNewer) {
			localList.cardMatching = remoteList.cardMatching;
			localList.languageMatching = remoteList.languageMatching;
		}
		localList.created_at = Math.min(localList.created_at, remoteList.created_at);
		localList.updated_at = Math.max(localList.updated_at, remoteList.updated_at);

		if (cards.changed.length > 0 || settingsChanged) changed.push(localList);
	}

	return { merged, changed };
}

/**
 * Union two collections by card id, resolving quantity conflicts to the higher
 * count. Local card data wins on every other field.
 */
export function mergeCollections(
	local: CollectionCard[],
	remote: CollectionCard[]
): MergeResult<CollectionCard> {
	const merged = local.map((card) => ({ ...card }));
	const indexById = new Map<string, number>();
	merged.forEach((card, i) => indexById.set(card.id, i));

	const changed: CollectionCard[] = [];

	for (const remoteCard of remote) {
		const index = indexById.get(remoteCard.id);

		if (index === undefined) {
			indexById.set(remoteCard.id, merged.length);
			const added = { ...remoteCard };
			merged.push(added);
			changed.push(added);
			continue;
		}

		const localCard = merged[index];
		const quantity = Math.max(localCard.quantity_owned, remoteCard.quantity_owned);
		if (quantity !== localCard.quantity_owned) {
			const updated = { ...localCard, quantity_owned: quantity };
			merged[index] = updated;
			changed.push(updated);
		}
	}

	return { merged, changed };
}
