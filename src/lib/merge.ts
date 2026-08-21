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
	/** What the merge would add, for the preview shown before committing (#77). */
	delta: CardsDelta;
}

/**
 * What a merge adds to one target, counted in card *copies* rather than
 * entries — a deck is read as "4 Lightning Bolt", so four copies arriving is
 * four cards however many rows they occupy.
 */
export interface CardsDelta {
	/** Copies gained: every quantity increase, plus the whole quantity of each card new to the target. */
	added: number;
	/** The subset of `added` contributed by cards the target did not hold at all. */
	fromNewCards: number;
	/**
	 * Copies lost. Always zero on the union path, which never removes anything —
	 * it is the *sync* path that can, now that a document carries tombstones
	 * (#47), and a removal is the one class of change a user will not expect.
	 */
	removed: number;
}

/** Per-list breakdown of {@link mergeCardListSets}, one entry per list the merge touches. */
export interface ListMergeDetail {
	name: string;
	/**
	 * `added` for a list that exists only in the incoming payload, `updated` for
	 * one both sides hold, `removed` for one the sync path deletes — which only
	 * the document model can produce.
	 */
	status: 'added' | 'updated' | 'removed';
	delta: CardsDelta;
	/** True when the snapshot is newer and hands over different matching settings. */
	settingsChanged: boolean;
}

export interface CardListMergeResult extends MergeResult<CardList> {
	details: ListMergeDetail[];
}

function emptyDelta(): CardsDelta {
	return { added: 0, fromNewCards: 0, removed: 0 };
}

function countCopies(cards: { LM_quantity: number }[]): number {
	return cards.reduce((total, card) => total + card.LM_quantity, 0);
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
	const delta = emptyDelta();

	for (const remoteCard of remote) {
		const index = indexById.get(remoteCard.id);

		if (index === undefined) {
			indexById.set(remoteCard.id, merged.length);
			const added = { ...remoteCard };
			merged.push(added);
			changed.push(added);
			delta.added += added.LM_quantity;
			delta.fromNewCards += added.LM_quantity;
			continue;
		}

		const localCard = merged[index];
		const quantity = Math.max(localCard.LM_quantity, remoteCard.LM_quantity);
		if (quantity !== localCard.LM_quantity) {
			const updated = { ...localCard, LM_quantity: quantity };
			merged[index] = updated;
			changed.push(updated);
			delta.added += quantity - localCard.LM_quantity;
		}
	}

	return { merged, changed, delta };
}

/**
 * Union two sets of card lists by list name.
 *
 * `changed` holds the lists that need to be persisted: remote-only lists (with
 * the remote `id` stripped so IndexedDB assigns a fresh key) and local lists
 * whose cards or matching settings the merge actually altered.
 */
export function mergeCardListSets(local: CardList[], remote: CardList[]): CardListMergeResult {
	const merged = local.map((list) => ({ ...list, cards: list.cards.map((card) => ({ ...card })) }));
	const byName = new Map<string, CardList>();
	for (const list of merged) byName.set(list.name, list);

	const changed: CardList[] = [];
	const details: ListMergeDetail[] = [];
	const delta = emptyDelta();

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

			// A list the local database has never seen arrives whole, so every copy
			// in it is new.
			const copies = countCopies(added.cards);
			details.push({
				name: added.name,
				status: 'added',
				delta: { added: copies, fromNewCards: copies, removed: 0 },
				settingsChanged: false
			});
			delta.added += copies;
			delta.fromNewCards += copies;
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

		if (cards.changed.length > 0 || settingsChanged) {
			changed.push(localList);
			details.push({
				name: localList.name,
				status: 'updated',
				delta: cards.delta,
				settingsChanged
			});
			delta.added += cards.delta.added;
			delta.fromNewCards += cards.delta.fromNewCards;
		}
	}

	return { merged, changed, details, delta };
}

// ==================== THE SYNC PATH (#47) ====================
//
// Everything above unions two sets that are not peers. What follows describes
// what applying a *same-lineage* document would do — which is a different
// operation on the same bytes, and can remove things. The UI has to say which
// one a file is getting; these functions are how it knows what to say.

function cardsById<T extends { id: string }>(cards: T[]): Map<string, T> {
	const byId = new Map<string, T>();
	for (const card of cards) byId.set(card.id, card);
	return byId;
}

/** Copies gained and lost between two versions of one card set. */
function diffCards(
	before: { id: string; LM_quantity: number }[],
	after: { id: string; LM_quantity: number }[]
): CardsDelta {
	const delta = emptyDelta();
	const wasThere = cardsById(before);
	const isThere = cardsById(after);

	for (const card of after) {
		const previous = wasThere.get(card.id);
		if (!previous) {
			delta.added += card.LM_quantity;
			delta.fromNewCards += card.LM_quantity;
		} else if (card.LM_quantity > previous.LM_quantity) {
			delta.added += card.LM_quantity - previous.LM_quantity;
		} else if (card.LM_quantity < previous.LM_quantity) {
			delta.removed += previous.LM_quantity - card.LM_quantity;
		}
	}

	for (const card of before) {
		if (!isThere.has(card.id)) delta.removed += card.LM_quantity;
	}

	return delta;
}

function isEmptyDelta(delta: CardsDelta): boolean {
	return delta.added === 0 && delta.removed === 0;
}

/**
 * What changed between two projections of the document — the sync path's
 * answer to `mergeCardListSets`, computed by applying a payload to a throwaway
 * clone rather than by unioning.
 *
 * Lists are matched by **id** here, not by name: on the sync path both sides
 * descend from the same lineage, so a rename is a rename and the id is what
 * survives it.
 */
export function diffProjections(
	before: { collection: CollectionCard[]; cardLists: CardList[] },
	after: { collection: CollectionCard[]; cardLists: CardList[] }
): { collection: CardsDelta; lists: ListMergeDetail[] } {
	const collection = diffCards(
		before.collection.map((c) => ({ id: c.id, LM_quantity: c.quantity_owned })),
		after.collection.map((c) => ({ id: c.id, LM_quantity: c.quantity_owned }))
	);

	const lists: ListMergeDetail[] = [];
	const beforeById = new Map(before.cardLists.map((list) => [list.id, list]));
	const afterById = new Map(after.cardLists.map((list) => [list.id, list]));

	for (const list of after.cardLists) {
		const previous = beforeById.get(list.id);

		if (!previous) {
			const copies = countCopies(list.cards);
			lists.push({
				name: list.name,
				status: 'added',
				delta: { added: copies, fromNewCards: copies, removed: 0 },
				settingsChanged: false
			});
			continue;
		}

		const delta = diffCards(previous.cards, list.cards);
		const settingsChanged =
			previous.cardMatching !== list.cardMatching ||
			previous.languageMatching !== list.languageMatching;

		if (!isEmptyDelta(delta) || settingsChanged || previous.name !== list.name) {
			lists.push({ name: list.name, status: 'updated', delta, settingsChanged });
		}
	}

	for (const list of before.cardLists) {
		if (afterById.has(list.id)) continue;
		const copies = countCopies(list.cards);
		lists.push({
			name: list.name,
			status: 'removed',
			delta: { added: 0, fromNewCards: 0, removed: copies },
			settingsChanged: false
		});
	}

	return { collection, lists };
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
	const delta = emptyDelta();

	for (const remoteCard of remote) {
		const index = indexById.get(remoteCard.id);

		if (index === undefined) {
			indexById.set(remoteCard.id, merged.length);
			const added = { ...remoteCard };
			merged.push(added);
			changed.push(added);
			delta.added += added.quantity_owned;
			delta.fromNewCards += added.quantity_owned;
			continue;
		}

		const localCard = merged[index];
		const quantity = Math.max(localCard.quantity_owned, remoteCard.quantity_owned);
		if (quantity !== localCard.quantity_owned) {
			const updated = { ...localCard, quantity_owned: quantity };
			merged[index] = updated;
			changed.push(updated);
			delta.added += quantity - localCard.quantity_owned;
		}
	}

	return { merged, changed, delta };
}
