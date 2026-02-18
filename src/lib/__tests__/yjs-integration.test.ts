import { describe, it, expect } from 'vitest';
import type { Deck } from '../db';
import {
	decksToYDoc,
	yDocToDecks,
	exportDecksAsYjs,
	importDecksFromYjs,
	mergeDecks,
	mergeCardQuantities,
	calculateDiff
} from '../yjs-integration';

function makeDeck(overrides: Partial<Deck> = {}): Deck {
	return {
		id: 1,
		name: 'Test Deck',
		deck_cards: [],
		created_at: 1000,
		updated_at: 2000,
		...overrides
	};
}

describe('Yjs Integration', () => {
	describe('round-trip: decksToYDoc -> yDocToDecks', () => {
		it('converts an empty deck list', () => {
			const ydoc = decksToYDoc([]);
			const result = yDocToDecks(ydoc);
			expect(result).toEqual([]);
		});

		it('preserves deck metadata through round-trip', () => {
			const decks: Deck[] = [makeDeck({ name: 'My Deck' })];
			const ydoc = decksToYDoc(decks);
			const result = yDocToDecks(ydoc);

			expect(result).toHaveLength(1);
			expect(result[0].name).toBe('My Deck');
			expect(result[0].created_at).toBe(1000);
			expect(result[0].updated_at).toBe(2000);
		});

		it('preserves cards through round-trip', () => {
			const decks: Deck[] = [
				makeDeck({
					deck_cards: [
						{ id: 'card-1', name: 'Lightning Bolt', LM_quantity: 4, mana_cost: '{R}' },
						{ id: 'card-2', name: 'Counterspell', LM_quantity: 2, mana_cost: '{U}{U}' }
					]
				})
			];

			const ydoc = decksToYDoc(decks);
			const result = yDocToDecks(ydoc);

			expect(result[0].deck_cards).toHaveLength(2);

			const bolt = result[0].deck_cards.find((c) => c.id === 'card-1');
			expect(bolt).toBeDefined();
			expect(bolt!.name).toBe('Lightning Bolt');
			expect(bolt!.LM_quantity).toBe(4);
			expect(bolt!.mana_cost).toBe('{R}');
		});
	});

	describe('binary export/import round-trip', () => {
		it('round-trips through Uint8Array', () => {
			const decks: Deck[] = [
				makeDeck({
					deck_cards: [{ id: 'card-1', name: 'Sol Ring', LM_quantity: 1 }]
				})
			];

			const binary = exportDecksAsYjs(decks);
			expect(binary).toBeInstanceOf(Uint8Array);
			expect(binary.length).toBeGreaterThan(0);

			const result = importDecksFromYjs(binary);
			expect(result).toHaveLength(1);
			expect(result[0].deck_cards[0].name).toBe('Sol Ring');
		});
	});

	describe('mergeDecks', () => {
		it('combines two non-overlapping deck sets', () => {
			const local = [makeDeck({ name: 'Deck A' })];
			const remote = [makeDeck({ name: 'Deck B' })];

			const merged = mergeDecks(local, remote);
			const names = merged.map((d) => d.name).sort();
			expect(names).toEqual(['Deck A', 'Deck B']);
		});

		it('merges overlapping decks by name (last-write-wins for same keys)', () => {
			const local = [makeDeck({ name: 'Shared Deck', updated_at: 1000 })];
			const remote = [makeDeck({ name: 'Shared Deck', updated_at: 2000 })];

			const merged = mergeDecks(local, remote);
			expect(merged).toHaveLength(1);
			expect(merged[0].name).toBe('Shared Deck');
		});
	});

	describe('mergeCardQuantities', () => {
		it('adds quantities for same card in same deck', () => {
			const local = [
				makeDeck({
					name: 'Deck A',
					deck_cards: [{ id: 'card-1', name: 'Bolt', LM_quantity: 2 }]
				})
			];
			const remote = [
				makeDeck({
					name: 'Deck A',
					deck_cards: [{ id: 'card-1', name: 'Bolt', LM_quantity: 3 }]
				})
			];

			const result = mergeCardQuantities(local, remote);
			const bolt = result[0].deck_cards.find((c) => c.id === 'card-1');
			expect(bolt!.LM_quantity).toBe(5);
		});

		it('adds new cards from remote deck', () => {
			const local = [
				makeDeck({
					name: 'Deck A',
					deck_cards: [{ id: 'card-1', name: 'Bolt', LM_quantity: 4 }]
				})
			];
			const remote = [
				makeDeck({
					name: 'Deck A',
					deck_cards: [{ id: 'card-2', name: 'Counterspell', LM_quantity: 2 }]
				})
			];

			const result = mergeCardQuantities(local, remote);
			expect(result[0].deck_cards).toHaveLength(2);
		});

		it('adds entirely new deck from remote', () => {
			const local = [makeDeck({ name: 'Local Deck' })];
			const remote = [makeDeck({ name: 'Remote Deck' })];

			const result = mergeCardQuantities(local, remote);
			expect(result).toHaveLength(2);
		});
	});

	describe('calculateDiff', () => {
		it('detects added decks', () => {
			const local: Deck[] = [];
			const remote = [makeDeck({ name: 'New Deck' })];

			const diff = calculateDiff(local, remote);
			expect(diff.added).toEqual(['New Deck']);
			expect(diff.removed).toEqual([]);
		});

		it('detects removed decks', () => {
			const local = [makeDeck({ name: 'Old Deck' })];
			const remote: Deck[] = [];

			const diff = calculateDiff(local, remote);
			expect(diff.removed).toEqual(['Old Deck']);
		});

		it('detects modified decks with card quantity changes', () => {
			const local = [
				makeDeck({
					name: 'Deck',
					deck_cards: [{ id: 'c1', name: 'Bolt', LM_quantity: 2 }]
				})
			];
			const remote = [
				makeDeck({
					name: 'Deck',
					deck_cards: [{ id: 'c1', name: 'Bolt', LM_quantity: 4 }]
				})
			];

			const diff = calculateDiff(local, remote);
			expect(diff.modified).toEqual(['Deck']);
			expect(diff.cardChanges['Deck'].modified).toBe(1);
		});

		it('reports no changes for identical decks', () => {
			const deck = makeDeck({
				deck_cards: [{ id: 'c1', name: 'Bolt', LM_quantity: 4 }]
			});

			const diff = calculateDiff([deck], [deck]);
			expect(diff.added).toEqual([]);
			expect(diff.removed).toEqual([]);
			expect(diff.modified).toEqual([]);
		});
	});
});
