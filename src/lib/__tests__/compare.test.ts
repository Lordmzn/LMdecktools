import { describe, it, expect } from 'vitest';
import { compareCardLists, exportCompareToText } from '../compare';
import type { Card } from '../db';

function makeCard(overrides: Partial<Card> & { name: string; id: string }): Card {
	return { LM_quantity: 1, ...overrides } as Card;
}

describe('compareCardLists', () => {
	it('returns empty buckets for two empty lists', () => {
		const result = compareCardLists([], [], 'generic', 'any');
		expect(result.onlyInA).toEqual([]);
		expect(result.inBoth).toEqual([]);
		expect(result.onlyInB).toEqual([]);
	});

	it('puts all cards in onlyInA when B is empty', () => {
		const a = [makeCard({ id: '1', name: 'Lightning Bolt', LM_quantity: 4 })];
		const result = compareCardLists(a, [], 'generic', 'any');
		expect(result.onlyInA).toHaveLength(1);
		expect(result.onlyInA[0].quantityA).toBe(4);
		expect(result.inBoth).toHaveLength(0);
		expect(result.onlyInB).toHaveLength(0);
	});

	it('puts all cards in onlyInB when A is empty', () => {
		const b = [makeCard({ id: '1', name: 'Counterspell', LM_quantity: 2 })];
		const result = compareCardLists([], b, 'generic', 'any');
		expect(result.onlyInB).toHaveLength(1);
		expect(result.onlyInB[0].quantityB).toBe(2);
		expect(result.onlyInA).toHaveLength(0);
	});

	it('puts identical cards in inBoth', () => {
		const card = makeCard({ id: '1', name: 'Lightning Bolt', LM_quantity: 3 });
		const result = compareCardLists([card], [{ ...card, LM_quantity: 2 }], 'generic', 'any');
		expect(result.inBoth).toHaveLength(1);
		expect(result.inBoth[0].quantityA).toBe(3);
		expect(result.inBoth[0].quantityB).toBe(2);
		expect(result.onlyInA).toHaveLength(0);
		expect(result.onlyInB).toHaveLength(0);
	});

	it('separates disjoint lists', () => {
		const a = [makeCard({ id: '1', name: 'Lightning Bolt' })];
		const b = [makeCard({ id: '2', name: 'Counterspell' })];
		const result = compareCardLists(a, b, 'generic', 'any');
		expect(result.onlyInA).toHaveLength(1);
		expect(result.onlyInB).toHaveLength(1);
		expect(result.inBoth).toHaveLength(0);
	});

	it('handles partial overlap', () => {
		const a = [
			makeCard({ id: '1', name: 'Lightning Bolt' }),
			makeCard({ id: '2', name: 'Counterspell' })
		];
		const b = [
			makeCard({ id: '3', name: 'Counterspell' }),
			makeCard({ id: '4', name: 'Dark Ritual' })
		];
		const result = compareCardLists(a, b, 'generic', 'any');
		expect(result.onlyInA).toHaveLength(1);
		expect(result.onlyInA[0].card.name).toBe('Lightning Bolt');
		expect(result.inBoth).toHaveLength(1);
		expect(result.inBoth[0].card.name).toBe('Counterspell');
		expect(result.onlyInB).toHaveLength(1);
		expect(result.onlyInB[0].card.name).toBe('Dark Ritual');
	});

	describe('generic vs specific card matching', () => {
		it('generic: matches by name regardless of ID', () => {
			const a = [makeCard({ id: 'abc', name: 'Lightning Bolt' })];
			const b = [makeCard({ id: 'xyz', name: 'Lightning Bolt' })];
			const result = compareCardLists(a, b, 'generic', 'any');
			expect(result.inBoth).toHaveLength(1);
			expect(result.onlyInA).toHaveLength(0);
			expect(result.onlyInB).toHaveLength(0);
		});

		it('specific: different IDs with same name are separate', () => {
			const a = [makeCard({ id: 'abc', name: 'Lightning Bolt' })];
			const b = [makeCard({ id: 'xyz', name: 'Lightning Bolt' })];
			const result = compareCardLists(a, b, 'specific', 'any');
			expect(result.onlyInA).toHaveLength(1);
			expect(result.onlyInB).toHaveLength(1);
			expect(result.inBoth).toHaveLength(0);
		});

		it('specific: same ID matches', () => {
			const a = [makeCard({ id: 'abc', name: 'Lightning Bolt' })];
			const b = [makeCard({ id: 'abc', name: 'Lightning Bolt' })];
			const result = compareCardLists(a, b, 'specific', 'any');
			expect(result.inBoth).toHaveLength(1);
		});
	});

	describe('language matching', () => {
		it('any: ignores language differences', () => {
			const a = [makeCard({ id: '1', name: 'Lightning Bolt', lang: 'en' } as any)];
			const b = [makeCard({ id: '2', name: 'Lightning Bolt', lang: 'it' } as any)];
			const result = compareCardLists(a, b, 'generic', 'any');
			expect(result.inBoth).toHaveLength(1);
		});

		it('strict: different languages are separate (generic)', () => {
			const a = [makeCard({ id: '1', name: 'Lightning Bolt', lang: 'en' } as any)];
			const b = [makeCard({ id: '2', name: 'Lightning Bolt', lang: 'it' } as any)];
			const result = compareCardLists(a, b, 'generic', 'strict');
			expect(result.onlyInA).toHaveLength(1);
			expect(result.onlyInB).toHaveLength(1);
			expect(result.inBoth).toHaveLength(0);
		});

		it('strict: same language matches (generic)', () => {
			const a = [makeCard({ id: '1', name: 'Lightning Bolt', lang: 'en' } as any)];
			const b = [makeCard({ id: '2', name: 'Lightning Bolt', lang: 'en' } as any)];
			const result = compareCardLists(a, b, 'generic', 'strict');
			expect(result.inBoth).toHaveLength(1);
		});

		it('strict: different languages are separate (specific)', () => {
			const a = [makeCard({ id: 'abc', name: 'Lightning Bolt', lang: 'en' } as any)];
			const b = [makeCard({ id: 'abc', name: 'Lightning Bolt', lang: 'it' } as any)];
			const result = compareCardLists(a, b, 'specific', 'strict');
			expect(result.onlyInA).toHaveLength(1);
			expect(result.onlyInB).toHaveLength(1);
			expect(result.inBoth).toHaveLength(0);
		});
	});

	describe('quantity aggregation', () => {
		it('aggregates quantities in generic mode when multiple cards share a name', () => {
			const a = [
				makeCard({ id: '1', name: 'Lightning Bolt', LM_quantity: 2 }),
				makeCard({ id: '2', name: 'Lightning Bolt', LM_quantity: 3 })
			];
			const b = [makeCard({ id: '3', name: 'Lightning Bolt', LM_quantity: 1 })];
			const result = compareCardLists(a, b, 'generic', 'any');
			expect(result.inBoth).toHaveLength(1);
			expect(result.inBoth[0].quantityA).toBe(5);
			expect(result.inBoth[0].quantityB).toBe(1);
		});
	});

	it('name matching is case-insensitive in generic mode', () => {
		const a = [makeCard({ id: '1', name: 'lightning bolt' })];
		const b = [makeCard({ id: '2', name: 'Lightning Bolt' })];
		const result = compareCardLists(a, b, 'generic', 'any');
		expect(result.inBoth).toHaveLength(1);
	});
});

describe('exportCompareToText', () => {
	it('formats all three sections', () => {
		const result = {
			onlyInA: [{ card: makeCard({ id: '1', name: 'Bolt' }), quantityA: 4, quantityB: 0 }],
			inBoth: [{ card: makeCard({ id: '2', name: 'Island' }), quantityA: 2, quantityB: 3 }],
			onlyInB: [{ card: makeCard({ id: '3', name: 'Swamp' }), quantityA: 0, quantityB: 1 }]
		};
		const text = exportCompareToText(result, 'Deck A', 'Deck B');
		expect(text).toContain('# Only in Deck A');
		expect(text).toContain('4 Bolt');
		expect(text).toContain('# In Both Lists');
		expect(text).toContain('2/3 Island');
		expect(text).toContain('# Only in Deck B');
		expect(text).toContain('1 Swamp');
	});

	it('shows (none) for empty sections', () => {
		const result = { onlyInA: [], inBoth: [], onlyInB: [] };
		const text = exportCompareToText(result, 'A', 'B');
		expect(text).toContain('(none)');
	});
});
