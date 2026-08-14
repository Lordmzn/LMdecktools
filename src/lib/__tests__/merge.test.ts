/**
 * Merging a linked-file snapshot must never lose local data (#46).
 *
 * The regression these cover: the old Yjs-based merge let one side's `cards`
 * map replace the other's, so a card that existed only locally disappeared the
 * first time a second device reloaded.
 */
import { describe, it, expect } from 'vitest';
import type { CardList, CollectionCard } from '../db';
import { mergeCardListSets, mergeCollections, mergeListCards } from '../merge';

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

function findList(lists: CardList[], name: string): CardList {
	const list = lists.find((l) => l.name === name);
	expect(list, `list "${name}" is missing`).toBeDefined();
	return list!;
}

describe('mergeListCards', () => {
	it('keeps a local-only card and adds a remote-only one', () => {
		const local = [
			{ id: 'bolt', name: 'Lightning Bolt', LM_quantity: 4 },
			{ id: 'local-only', name: 'Brainstorm', LM_quantity: 2 }
		];
		const remote = [
			{ id: 'bolt', name: 'Lightning Bolt', LM_quantity: 4 },
			{ id: 'remote-only', name: 'Counterspell', LM_quantity: 1 }
		];

		const { merged, changed } = mergeListCards(local, remote);

		expect(merged.map((c) => c.id).sort()).toEqual(['bolt', 'local-only', 'remote-only']);
		expect(changed.map((c) => c.id)).toEqual(['remote-only']);
	});

	it('resolves a quantity conflict to the higher count in both directions', () => {
		const localHigher = mergeListCards(
			[{ id: 'bolt', name: 'Bolt', LM_quantity: 4 }],
			[{ id: 'bolt', name: 'Bolt', LM_quantity: 1 }]
		);
		expect(localHigher.merged[0].LM_quantity).toBe(4);
		expect(localHigher.changed).toEqual([]);

		const remoteHigher = mergeListCards(
			[{ id: 'bolt', name: 'Bolt', LM_quantity: 1 }],
			[{ id: 'bolt', name: 'Bolt', LM_quantity: 4 }]
		);
		expect(remoteHigher.merged[0].LM_quantity).toBe(4);
		expect(remoteHigher.changed).toHaveLength(1);
	});

	it('does not mutate the local input', () => {
		const local = [{ id: 'bolt', name: 'Bolt', LM_quantity: 1 }];
		mergeListCards(local, [{ id: 'bolt', name: 'Bolt', LM_quantity: 4 }]);
		expect(local[0].LM_quantity).toBe(1);
	});
});

describe('mergeCardListSets', () => {
	it('keeps local-only cards in a list that exists on both sides', () => {
		const local = [
			makeCardList({
				name: 'Deck A',
				cards: [
					{ id: 'bolt', name: 'Bolt', LM_quantity: 4 },
					{ id: 'local-only', name: 'Brainstorm', LM_quantity: 2 }
				]
			})
		];
		const remote = [
			makeCardList({
				name: 'Deck A',
				cards: [
					{ id: 'bolt', name: 'Bolt', LM_quantity: 4 },
					{ id: 'remote-only', name: 'Counterspell', LM_quantity: 1 }
				]
			})
		];

		const { merged } = mergeCardListSets(local, remote);

		expect(merged).toHaveLength(1);
		expect(
			findList(merged, 'Deck A')
				.cards.map((c) => c.id)
				.sort()
		).toEqual(['bolt', 'local-only', 'remote-only']);
	});

	it('unions non-overlapping lists and keeps the local-only one untouched', () => {
		const local = [makeCardList({ id: 7, name: 'Local List' })];
		const remote = [makeCardList({ id: 1, name: 'Remote List' })];

		const { merged, changed } = mergeCardListSets(local, remote);

		expect(merged.map((l) => l.name).sort()).toEqual(['Local List', 'Remote List']);
		expect(changed.map((l) => l.name)).toEqual(['Remote List']);
		expect(findList(merged, 'Local List').id).toBe(7);
	});

	it('drops the remote id on a remote-only list so it cannot overwrite a local key', () => {
		// Both sides use id 1 for different lists — reusing it would clobber the local one.
		const local = [makeCardList({ id: 1, name: 'Local List' })];
		const remote = [makeCardList({ id: 1, name: 'Remote List' })];

		const { merged } = mergeCardListSets(local, remote);

		expect(findList(merged, 'Remote List').id).toBeUndefined();
		expect(findList(merged, 'Local List').id).toBe(1);
	});

	it('preserves the local id and list metadata of a shared list', () => {
		const local = [
			makeCardList({
				id: 42,
				name: 'Deck A',
				cardMatching: 'specific',
				languageMatching: 'strict',
				created_at: 500,
				updated_at: 3000
			})
		];
		const remote = [
			makeCardList({
				id: 9,
				name: 'Deck A',
				cardMatching: 'generic',
				languageMatching: 'any',
				created_at: 1000,
				updated_at: 2000
			})
		];

		const { merged } = mergeCardListSets(local, remote);
		const list = findList(merged, 'Deck A');

		expect(list.id).toBe(42);
		// Local is newer, so it keeps its matching settings
		expect(list.cardMatching).toBe('specific');
		expect(list.languageMatching).toBe('strict');
		expect(list.created_at).toBe(500);
		expect(list.updated_at).toBe(3000);
	});

	it('takes matching settings from the more recently updated side', () => {
		const local = [makeCardList({ name: 'Deck A', cardMatching: 'generic', updated_at: 1000 })];
		const remote = [makeCardList({ name: 'Deck A', cardMatching: 'specific', updated_at: 5000 })];

		const { merged, changed } = mergeCardListSets(local, remote);

		expect(findList(merged, 'Deck A').cardMatching).toBe('specific');
		expect(findList(merged, 'Deck A').updated_at).toBe(5000);
		expect(changed.map((l) => l.name)).toEqual(['Deck A']);
	});

	it('reports nothing to write when the two sides already agree', () => {
		const list = makeCardList({
			name: 'Deck A',
			cards: [{ id: 'bolt', name: 'Bolt', LM_quantity: 4 }]
		});

		const { merged, changed } = mergeCardListSets([list], [makeCardList({ ...list })]);

		expect(merged).toHaveLength(1);
		expect(changed).toEqual([]);
	});

	it('never deletes a local list that is absent from the remote snapshot', () => {
		const local = [makeCardList({ name: 'Deck A' }), makeCardList({ id: 2, name: 'Deck B' })];

		const { merged } = mergeCardListSets(local, []);

		expect(merged.map((l) => l.name).sort()).toEqual(['Deck A', 'Deck B']);
	});

	it('does not mutate the local input', () => {
		const local = [
			makeCardList({ name: 'Deck A', cards: [{ id: 'bolt', name: 'Bolt', LM_quantity: 1 }] })
		];
		const remote = [
			makeCardList({ name: 'Deck A', cards: [{ id: 'bolt', name: 'Bolt', LM_quantity: 4 }] })
		];

		mergeCardListSets(local, remote);

		expect(local[0].cards[0].LM_quantity).toBe(1);
	});
});

describe('mergeCollections', () => {
	function makeCard(overrides: Partial<CollectionCard> = {}): CollectionCard {
		return { id: 'bolt', name: 'Lightning Bolt', quantity_owned: 1, ...overrides };
	}

	it('keeps a local-only card and adds a remote-only one', () => {
		const local = [makeCard({ id: 'local-only' }), makeCard({ id: 'shared' })];
		const remote = [makeCard({ id: 'shared' }), makeCard({ id: 'remote-only' })];

		const { merged, changed } = mergeCollections(local, remote);

		expect(merged.map((c) => c.id).sort()).toEqual(['local-only', 'remote-only', 'shared']);
		expect(changed.map((c) => c.id)).toEqual(['remote-only']);
	});

	it('resolves a quantity conflict to the higher count', () => {
		const localHigher = mergeCollections(
			[makeCard({ quantity_owned: 6 })],
			[makeCard({ quantity_owned: 2 })]
		);
		expect(localHigher.merged[0].quantity_owned).toBe(6);
		expect(localHigher.changed).toEqual([]);

		const remoteHigher = mergeCollections(
			[makeCard({ quantity_owned: 2 })],
			[makeCard({ quantity_owned: 6 })]
		);
		expect(remoteHigher.merged[0].quantity_owned).toBe(6);
		expect(remoteHigher.changed).toHaveLength(1);
	});

	it('never drops the collection when the remote snapshot is empty', () => {
		const local = [makeCard({ id: 'a' }), makeCard({ id: 'b' })];

		const { merged, changed } = mergeCollections(local, []);

		expect(merged.map((c) => c.id)).toEqual(['a', 'b']);
		expect(changed).toEqual([]);
	});
});
