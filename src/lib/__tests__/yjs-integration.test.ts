import { describe, it, expect } from 'vitest';
import type { CardList } from '../db';
import {
	cardListsToYDoc,
	yDocToCardLists,
	exportCardListsAsYjs,
	importCardListsFromYjs,
	mergeCardLists,
	mergeListCardQuantities,
	calculateDiff,
	exportWithMetadata,
	importWithMetadata
} from '../yjs-integration';

function makeCardList(overrides: Partial<CardList> = {}): CardList {
	return {
		id: 1,
		name: 'Test List',
		cards: [],
		cardMatching: 'generic',
		languageMatching: 'any',
		created_at: 1000,
		updated_at: 2000,
		...overrides
	};
}

describe('Yjs Integration', () => {
	describe('round-trip: cardListsToYDoc -> yDocToCardLists', () => {
		it('converts an empty card list array', () => {
			const ydoc = cardListsToYDoc([]);
			const result = yDocToCardLists(ydoc);
			expect(result).toEqual([]);
		});

		it('preserves card list metadata through round-trip', () => {
			const cardLists: CardList[] = [makeCardList({ name: 'My List' })];
			const ydoc = cardListsToYDoc(cardLists);
			const result = yDocToCardLists(ydoc);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('My List');
			expect(result[0].created_at).toBe(1000);
			expect(result[0].updated_at).toBe(2000);
			expect(result[0].cardMatching).toBe('generic');
			expect(result[0].languageMatching).toBe('any');
		});

		it('preserves cards through round-trip', () => {
			const cardLists: CardList[] = [
				makeCardList({
					cards: [
						{ id: 'card-1', name: 'Lightning Bolt', LM_quantity: 4, mana_cost: '{R}' },
						{ id: 'card-2', name: 'Counterspell', LM_quantity: 2, mana_cost: '{U}{U}' }
					]
				})
			];

			const ydoc = cardListsToYDoc(cardLists);
			const result = yDocToCardLists(ydoc);

			expect(result[0].cards).toHaveLength(2);

			const bolt = result[0].cards.find((c) => c.id === 'card-1');
			expect(bolt).toBeDefined();
			expect(bolt!.name).toBe('Lightning Bolt');
			expect(bolt!.LM_quantity).toBe(4);
			expect(bolt!.mana_cost).toBe('{R}');
		});
	});

	describe('binary export/import round-trip', () => {
		it('round-trips through Uint8Array', () => {
			const cardLists: CardList[] = [
				makeCardList({
					cards: [{ id: 'card-1', name: 'Sol Ring', LM_quantity: 1 }]
				})
			];

			const binary = exportCardListsAsYjs(cardLists);
			expect(binary).toBeInstanceOf(Uint8Array);
			expect(binary.length).toBeGreaterThan(0);

			const result = importCardListsFromYjs(binary);
			expect(result).toHaveLength(1);
			expect(result[0].cards[0].name).toBe('Sol Ring');
		});
	});

	describe('mergeCardLists', () => {
		it('combines two non-overlapping list sets', () => {
			const local = [makeCardList({ name: 'List A' })];
			const remote = [makeCardList({ name: 'List B' })];

			const merged = mergeCardLists(local, remote);
			const names = merged.map((d) => d.name).sort();
			expect(names).toEqual(['List A', 'List B']);
		});

		it('merges overlapping lists by name (last-write-wins for same keys)', () => {
			const local = [makeCardList({ name: 'Shared List', updated_at: 1000 })];
			const remote = [makeCardList({ name: 'Shared List', updated_at: 2000 })];

			const merged = mergeCardLists(local, remote);
			expect(merged).toHaveLength(1);
			expect(merged[0].name).toBe('Shared List');
		});
	});

	describe('mergeListCardQuantities', () => {
		it('adds quantities for same card in same list', () => {
			const local = [
				makeCardList({
					name: 'List A',
					cards: [{ id: 'card-1', name: 'Bolt', LM_quantity: 2 }]
				})
			];
			const remote = [
				makeCardList({
					name: 'List A',
					cards: [{ id: 'card-1', name: 'Bolt', LM_quantity: 3 }]
				})
			];

			const result = mergeListCardQuantities(local, remote);
			const bolt = result[0].cards.find((c) => c.id === 'card-1');
			expect(bolt!.LM_quantity).toBe(5);
		});

		it('adds new cards from remote list', () => {
			const local = [
				makeCardList({
					name: 'List A',
					cards: [{ id: 'card-1', name: 'Bolt', LM_quantity: 4 }]
				})
			];
			const remote = [
				makeCardList({
					name: 'List A',
					cards: [{ id: 'card-2', name: 'Counterspell', LM_quantity: 2 }]
				})
			];

			const result = mergeListCardQuantities(local, remote);
			expect(result[0].cards).toHaveLength(2);
		});

		it('adds entirely new list from remote', () => {
			const local = [makeCardList({ name: 'Local List' })];
			const remote = [makeCardList({ name: 'Remote List' })];

			const result = mergeListCardQuantities(local, remote);
			expect(result).toHaveLength(2);
		});
	});

	// [planned] exportWithMetadata should include both collection AND card lists.
	describe('exportWithMetadata / importWithMetadata round-trip', () => {
		it('round-trips card lists through exportWithMetadata → importWithMetadata', () => {
			const cardLists: CardList[] = [
				makeCardList({
					name: 'Red Aggro',
					cards: [
						{ id: 'c1', name: 'Lightning Bolt', LM_quantity: 4, mana_cost: '{R}' },
						{ id: 'c2', name: 'Goblin Guide', LM_quantity: 4 }
					]
				})
			];

			const mockStore = {
				savedCardLists: cardLists,
				collection: [
					{ id: 'c1', name: 'Lightning Bolt', quantity_owned: 4 }
				]
			};

			const binary = exportWithMetadata(mockStore as any);
			const result = importWithMetadata(binary);

			expect(result.metadata.app).toBe('LM Deck Tools');
			expect(result.metadata.version).toBe('1.0');
			expect(result.cardLists).toHaveLength(1);
			expect(result.cardLists[0].name).toBe('Red Aggro');
			expect(result.cardLists[0].cards).toHaveLength(2);
		});
	});

	describe('calculateDiff', () => {
		it('detects added lists', () => {
			const local: CardList[] = [];
			const remote = [makeCardList({ name: 'New List' })];

			const diff = calculateDiff(local, remote);
			expect(diff.added).toEqual(['New List']);
			expect(diff.removed).toEqual([]);
		});

		it('detects removed lists', () => {
			const local = [makeCardList({ name: 'Old List' })];
			const remote: CardList[] = [];

			const diff = calculateDiff(local, remote);
			expect(diff.removed).toEqual(['Old List']);
		});

		it('detects modified lists with card quantity changes', () => {
			const local = [
				makeCardList({
					name: 'List',
					cards: [{ id: 'c1', name: 'Bolt', LM_quantity: 2 }]
				})
			];
			const remote = [
				makeCardList({
					name: 'List',
					cards: [{ id: 'c1', name: 'Bolt', LM_quantity: 4 }]
				})
			];

			const diff = calculateDiff(local, remote);
			expect(diff.modified).toEqual(['List']);
			expect(diff.cardChanges['List'].modified).toBe(1);
		});

		it('reports no changes for identical lists', () => {
			const list = makeCardList({
				cards: [{ id: 'c1', name: 'Bolt', LM_quantity: 4 }]
			});

			const diff = calculateDiff([list], [list]);
			expect(diff.added).toEqual([]);
			expect(diff.removed).toEqual([]);
			expect(diff.modified).toEqual([]);
		});
	});
});
