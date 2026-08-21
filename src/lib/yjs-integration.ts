/**
 * Yjs integration for LM Deck Tools
 * Provides CRDT-based data synchronization and merging
 *
 * Install: npm install yjs
 */

import * as Y from 'yjs';
import type { StoreInterface } from './store.svelte';
import type { CardList, Card, CollectionCard } from './db';
import { toStoredCollectionCard, toStoredListCard } from './card-fields';

/**
 * One card as a `Y.Map`, carrying the defined fields of an already-stripped
 * record and nothing else (#84). Every field admitted here costs bytes in every
 * file, on every write — see `card-fields.ts` for what may be admitted.
 */
function toYCard(card: object): Y.Map<unknown> {
	const yCard = new Y.Map<unknown>();
	for (const [key, value] of Object.entries(card as Record<string, unknown>)) {
		if (value !== undefined) yCard.set(key, value);
	}
	return yCard;
}

/**
 * One card read back out, keeping **every** field the file carries.
 *
 * Deliberately not stripped to the whitelist: a file written before #84 still
 * holds the card facts, and this is the only place they exist. The store
 * harvests them into the local facts cache on import, and the write path is
 * what drops them — strip here and restoring an old backup would leave the app
 * asking Scryfall for cards it had just finished reading.
 */
function fromYCard(yCard: Y.Map<any>, cardId: string): Record<string, unknown> {
	const card: Record<string, unknown> = {};
	yCard.forEach((value, key) => {
		card[key] = value;
	});
	card.id = cardId;
	return card;
}

/**
 * Convert card lists to a Yjs document
 */
export function cardListsToYDoc(cardLists: CardList[]): Y.Doc {
	const ydoc = new Y.Doc();
	const yCardLists = ydoc.getMap('card_lists');

	// Use list name as key for automatic merging
	for (const cardList of cardLists) {
		const yList = new Y.Map();
		yList.set('id', cardList.id);
		yList.set('name', cardList.name);
		yList.set('cardMatching', cardList.cardMatching);
		yList.set('languageMatching', cardList.languageMatching);
		yList.set('created_at', cardList.created_at);
		yList.set('updated_at', cardList.updated_at);

		// Store cards as a map keyed by card ID, whitelisted as everywhere else (#84)
		const yCards = new Y.Map();
		for (const card of cardList.cards) {
			yCards.set(card.id, toYCard(toStoredListCard(card)));
		}

		yList.set('cards', yCards);
		yCardLists.set(cardList.name, yList);
	}

	return ydoc;
}

/**
 * Convert a Yjs document back to card list array
 */
export function yDocToCardLists(ydoc: Y.Doc): CardList[] {
	const yCardLists = ydoc.getMap('card_lists');
	const cardLists: CardList[] = [];

	yCardLists.forEach((yListRaw, listName) => {
		const yList = yListRaw as Y.Map<any>;
		const yCards = yList.get('cards') as Y.Map<Y.Map<any>>;
		const cards: Card[] = [];

		yCards.forEach((yCard: Y.Map<any>, cardId: string) => {
			cards.push(fromYCard(yCard, cardId) as unknown as Card);
		});

		cardLists.push({
			id: yList.get('id'),
			name: listName,
			cards,
			cardMatching: yList.get('cardMatching') ?? 'generic',
			languageMatching: yList.get('languageMatching') ?? 'any',
			created_at: yList.get('created_at'),
			updated_at: yList.get('updated_at')
		});
	});

	return cardLists;
}

/**
 * Export card lists to Yjs binary format
 */
export function exportCardListsAsYjs(cardLists: CardList[]): Uint8Array {
	const ydoc = cardListsToYDoc(cardLists);
	return Y.encodeStateAsUpdate(ydoc);
}

/**
 * Import card lists from Yjs binary format
 */
export function importCardListsFromYjs(data: Uint8Array): CardList[] {
	const ydoc = new Y.Doc();
	Y.applyUpdate(ydoc, data);
	return yDocToCardLists(ydoc);
}

// `mergeCardLists()` used to live here: it built two independent Y.Docs and
// applied one's update to the other. Documents with no shared history are not
// CRDT peers, so a list present on both sides resolved to one side's cards and
// dropped the other's. Merging goes through `src/lib/merge.ts` instead (#46).

/**
 * Merge card quantities when the same card appears in both lists
 * This is a specialized merge for card quantities
 */
export function mergeListCardQuantities(
	localLists: CardList[],
	remoteLists: CardList[]
): CardList[] {
	const ydoc = cardListsToYDoc(localLists);
	const yCardLists = ydoc.getMap('card_lists');

	// Process each remote list
	for (const remoteList of remoteLists) {
		const existingYList = yCardLists.get(remoteList.name) as Y.Map<any> | undefined;

		if (existingYList) {
			// List exists - merge cards
			const existingYCards = existingYList.get('cards') as Y.Map<Y.Map<any>>;

			for (const remoteCard of remoteList.cards) {
				const existingYCard = existingYCards.get(remoteCard.id) as Y.Map<any> | undefined;

				if (existingYCard) {
					// Card exists - add quantities
					const currentQuantity = existingYCard.get('LM_quantity') as number;
					existingYCard.set('LM_quantity', currentQuantity + remoteCard.LM_quantity);
				} else {
					// New card - add it
					existingYCards.set(remoteCard.id, toYCard(toStoredListCard(remoteCard)));
				}
			}

			// Update timestamp
			existingYList.set(
				'updated_at',
				Math.max(existingYList.get('updated_at'), remoteList.updated_at)
			);
		} else {
			// New list - add it
			const yList = new Y.Map();
			yList.set('name', remoteList.name);
			yList.set('cardMatching', remoteList.cardMatching);
			yList.set('languageMatching', remoteList.languageMatching);
			yList.set('created_at', remoteList.created_at);
			yList.set('updated_at', remoteList.updated_at);

			const yCards = new Y.Map();
			for (const card of remoteList.cards) {
				yCards.set(card.id, toYCard(toStoredListCard(card)));
			}

			yList.set('cards', yCards);
			yCardLists.set(remoteList.name, yList);
		}
	}

	return yDocToCardLists(ydoc);
}

/**
 * Create a compressed export with metadata
 */
export function exportWithMetadata(store: StoreInterface): Uint8Array {
	const ydoc = new Y.Doc();

	// Add metadata. total_lists / total_cards are declared counts: the importer
	// compares them against what it decodes and refuses a truncated file (#52).
	const yMeta = ydoc.getMap('metadata');
	yMeta.set('version', '1.0');
	yMeta.set('exported_at', Date.now());
	yMeta.set('app', 'LM Deck Tools');
	yMeta.set('total_lists', store.savedCardLists.length);
	yMeta.set('total_cards', store.collection.length);

	// Add collection. Written field by field from the whitelist rather than by
	// copying every key of the record (#84): the record should hold nothing else,
	// and if one day it does, it still must not reach the file. This is the
	// payload that the linked-file autosave rewrites whole on every change.
	const yCollection = ydoc.getMap('collection');
	for (const card of store.collection) {
		yCollection.set(card.id, toYCard(toStoredCollectionCard(card)));
	}

	// Add card lists
	const yCardLists = ydoc.getMap('card_lists');
	for (const cardList of store.savedCardLists) {
		const yList = new Y.Map();
		yList.set('id', cardList.id);
		yList.set('name', cardList.name);
		yList.set('cardMatching', cardList.cardMatching);
		yList.set('languageMatching', cardList.languageMatching);
		yList.set('created_at', cardList.created_at);
		yList.set('updated_at', cardList.updated_at);

		const yCards = new Y.Map();
		for (const card of cardList.cards) {
			yCards.set(card.id, toYCard(toStoredListCard(card)));
		}

		yList.set('cards', yCards);
		yCardLists.set(cardList.name, yList);
	}

	return Y.encodeStateAsUpdate(ydoc);
}

/**
 * Extract collection cards from a Yjs document
 */
export function yDocToCollection(ydoc: Y.Doc): CollectionCard[] {
	const yCollection = ydoc.getMap('collection');
	const collection: CollectionCard[] = [];

	yCollection.forEach((yCardRaw, cardId) => {
		collection.push(fromYCard(yCardRaw as Y.Map<any>, cardId) as unknown as CollectionCard);
	});

	return collection;
}

/**
 * Import with metadata validation
 */
export function importWithMetadata(data: Uint8Array): {
	cardLists: CardList[];
	collection: CollectionCard[];
	metadata: {
		version: string;
		exported_at: number;
		app: string;
		/** Written since #52 — absent in files exported by earlier builds. */
		total_lists?: number;
		total_cards?: number;
	};
} {
	const ydoc = new Y.Doc();
	Y.applyUpdate(ydoc, data);

	const yMeta = ydoc.getMap('metadata');
	const metadata = {
		version: yMeta.get('version') as string,
		exported_at: yMeta.get('exported_at') as number,
		app: yMeta.get('app') as string,
		total_lists: yMeta.get('total_lists') as number | undefined,
		total_cards: yMeta.get('total_cards') as number | undefined
	};

	const cardLists = yDocToCardLists(ydoc);
	const collection = yDocToCollection(ydoc);

	return { cardLists, collection, metadata };
}

/**
 * Calculate diff between two card list collections
 */
export function calculateDiff(
	localLists: CardList[],
	remoteLists: CardList[]
): {
	added: string[];
	removed: string[];
	modified: string[];
	cardChanges: { [listName: string]: { added: number; removed: number; modified: number } };
} {
	const localNames = new Set(localLists.map((d) => d.name));
	const remoteNames = new Set(remoteLists.map((d) => d.name));

	const added = Array.from(remoteNames).filter((name) => !localNames.has(name));
	const removed = Array.from(localNames).filter((name) => !remoteNames.has(name));
	const common = Array.from(localNames).filter((name) => remoteNames.has(name));

	const modified: string[] = [];
	const cardChanges: { [listName: string]: { added: number; removed: number; modified: number } } =
		{};

	for (const listName of common) {
		const localList = localLists.find((d) => d.name === listName)!;
		const remoteList = remoteLists.find((d) => d.name === listName)!;

		const localCardIds = new Set(localList.cards.map((c) => c.id));
		const remoteCardIds = new Set(remoteList.cards.map((c) => c.id));

		const addedCards = Array.from(remoteCardIds).filter((id) => !localCardIds.has(id));
		const removedCards = Array.from(localCardIds).filter((id) => !remoteCardIds.has(id));
		const commonCards = Array.from(localCardIds).filter((id) => remoteCardIds.has(id));

		const modifiedCards = commonCards.filter((id) => {
			const localCard = localList.cards.find((c) => c.id === id)!;
			const remoteCard = remoteList.cards.find((c) => c.id === id)!;
			return localCard.LM_quantity !== remoteCard.LM_quantity;
		});

		if (addedCards.length > 0 || removedCards.length > 0 || modifiedCards.length > 0) {
			modified.push(listName);
			cardChanges[listName] = {
				added: addedCards.length,
				removed: removedCards.length,
				modified: modifiedCards.length
			};
		}
	}

	return { added, removed, modified, cardChanges };
}
