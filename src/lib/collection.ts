/**
 * Pure collection logic (#62): indexing owned quantities for ownership checks,
 * and folding a list of cards into a collection.
 *
 * Kept out of `store.svelte.ts` for the same reason as `export-format.ts` — a
 * plain module is testable without a rune owner, and the Maps built here are
 * transient return values rather than reactive state. The store owns the
 * `$state`/`$derived` wiring and calls in here for the work.
 */
import type { Card, CardMatching, CollectionCard, LanguageMatching } from './db';

/** How a list decides whether the collection covers it. Stored per card list. */
export interface OwnershipCheckParams {
	cardMatching: CardMatching;
	languageMatching: LanguageMatching;
}

export interface OwnershipCheckResult {
	owned: boolean;
	cards: {
		card: Card;
		owned: boolean;
	}[];
}

/**
 * Key under which the index keeps its language-agnostic running total. A NUL
 * prefix keeps it clear of any real language code, and of the empty string that
 * stands in for a card with no `lang` at all.
 */
const ANY_LANG = '\0any';

/** Owned quantities keyed by match target, then by language. See `buildCollectionIndex`. */
export interface CollectionIndex {
	byName: Map<string, Map<string, number>>;
	byId: Map<string, Map<string, number>>;
}

/**
 * Index owned quantities by the two things a list can match on, so an ownership
 * check costs a lookup per list card rather than a scan of the whole collection
 * per list card — the O(list × collection) that made bulk adds crawl (#62).
 *
 * The inner map is keyed by language, with a running `ANY_LANG` total kept
 * alongside: `strict` matching reads one language's entry, `any` reads the total.
 */
export function buildCollectionIndex(collection: CollectionCard[]): CollectionIndex {
	const byName = new Map<string, Map<string, number>>();
	const byId = new Map<string, Map<string, number>>();

	const add = (index: Map<string, Map<string, number>>, key: string, card: CollectionCard) => {
		let langs = index.get(key);
		if (!langs) {
			langs = new Map();
			index.set(key, langs);
		}
		const lang = card.lang ?? '';
		langs.set(lang, (langs.get(lang) ?? 0) + card.quantity_owned);
		langs.set(ANY_LANG, (langs.get(ANY_LANG) ?? 0) + card.quantity_owned);
	};

	for (const card of collection) {
		add(byName, card.name, card);
		add(byId, card.id, card);
	}

	return { byName, byId };
}

/**
 * Whether each card in a list is covered by the collection, and whether the list
 * is covered as a whole.
 */
export function checkOwnership(
	listCards: Card[],
	index: CollectionIndex,
	params: OwnershipCheckParams
): OwnershipCheckResult {
	const { cardMatching, languageMatching } = params;
	const target = cardMatching === 'generic' ? index.byName : index.byId;

	const cardResults = listCards.map((card) => {
		const langs = target.get(cardMatching === 'generic' ? card.name : card.id);
		const totalOwned =
			langs?.get(languageMatching === 'strict' ? (card.lang ?? '') : ANY_LANG) ?? 0;
		return { card, owned: totalOwned >= card.LM_quantity };
	});

	return {
		owned: cardResults.every((r) => r.owned),
		cards: cardResults
	};
}

/** The result of folding cards into a collection: the whole thing, and just what changed. */
export interface CollectionMerge {
	/** Every card in the collection, with the added quantities applied. */
	collection: CollectionCard[];
	/** Only the rows the merge touched — what actually needs writing to disk. */
	touched: CollectionCard[];
}

/**
 * Fold `cards` into `collection`, adding each card's `LM_quantity` to what is
 * already owned of that exact printing.
 *
 * Pure: neither argument is mutated. A list may name the same printing twice, so
 * quantities accumulate rather than overwrite, and each touched printing appears
 * once in `touched`.
 *
 * `toPlain` strips whatever wrapper the caller's cards arrive in (the store
 * passes one that drops Svelte's reactive proxies, since IndexedDB cannot store
 * them); it defaults to identity for callers holding plain objects already.
 */
export function mergeCardsIntoCollection(
	collection: CollectionCard[],
	cards: (Card & { LM_quantity?: number })[],
	toPlain: (card: unknown) => CollectionCard = (card) => card as CollectionCard
): CollectionMerge {
	const merged = new Map(collection.map((card) => [card.id, card]));
	const touchedIds = new Set<string>();

	for (const card of cards) {
		const existing = merged.get(card.id);
		merged.set(card.id, {
			...toPlain(card),
			quantity_owned: (existing?.quantity_owned ?? 0) + (card.LM_quantity ?? 1)
		});
		touchedIds.add(card.id);
	}

	return {
		collection: [...merged.values()],
		touched: [...touchedIds].map((id) => merged.get(id)!)
	};
}
