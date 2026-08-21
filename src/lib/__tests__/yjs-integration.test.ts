import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import type { CardList } from '../db';
import {
	cardListsToYDoc,
	yDocToCardLists,
	exportCardListsAsYjs,
	importCardListsFromYjs,
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

	// Merging two snapshots is not a Yjs operation — see merge.test.ts (#46).

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
				collection: [{ id: 'c1', name: 'Lightning Bolt', quantity_owned: 4 }]
			};

			const binary = exportWithMetadata(mockStore as any);
			const result = importWithMetadata(binary);

			expect(result.metadata.app).toBe('LM Deck Tools');
			expect(result.metadata.version).toBe('1.0');
			expect(result.cardLists).toHaveLength(1);
			expect(result.cardLists[0].name).toBe('Red Aggro');
			expect(result.cardLists[0].cards).toHaveLength(2);
		});

		it('declares total_lists and total_cards so the importer can spot a truncated file', () => {
			const mockStore = {
				savedCardLists: [makeCardList({ name: 'Red Aggro' }), makeCardList({ name: 'Blue Tempo' })],
				collection: [{ id: 'c1', name: 'Lightning Bolt', quantity_owned: 4 }]
			};

			const result = importWithMetadata(exportWithMetadata(mockStore as any));

			expect(result.metadata.total_lists).toBe(2);
			expect(result.metadata.total_cards).toBe(1);
		});

		it('writes the whitelist only, whatever the store is holding (#84)', () => {
			// The store should never hold a fat record any more, but this is the
			// payload the linked-file autosave rewrites whole on every change —
			// so the file must be thin even if something upstream regresses.
			const scryfallCard = {
				id: 'c1',
				name: 'Lightning Bolt',
				set: 'lea',
				set_name: 'Limited Edition Alpha',
				collector_number: '161',
				lang: 'en',
				mana_cost: '{R}',
				type_line: 'Instant',
				oracle_text: 'Lightning Bolt deals 3 damage to any target.',
				image_uris: { small: 's.jpg', normal: 'n.jpg', png: 'p.png', art_crop: 'a.jpg' },
				card_faces: [{ image_uris: { normal: 'front.jpg' } }],
				legalities: { modern: 'legal', legacy: 'legal', vintage: 'legal' },
				prices: { usd: '1.23', eur: '1.05', tix: '0.02' },
				all_parts: [{ id: 'token', component: 'token' }],
				related_uris: { gatherer: 'https://example.invalid' }
			};

			const fat = {
				savedCardLists: [
					makeCardList({ name: 'Red Aggro', cards: [{ ...scryfallCard, LM_quantity: 4 }] })
				],
				collection: [{ ...scryfallCard, quantity_owned: 4 }]
			};

			const result = importWithMetadata(exportWithMetadata(fat as any));

			const exported = [result.collection[0], result.cardLists[0].cards[0]];
			for (const card of exported) {
				expect(card.name).toBe('Lightning Bolt');
				expect(card.set).toBe('lea');
				expect(card.collector_number).toBe('161');
				for (const key of [
					'image_uris',
					'card_faces',
					'legalities',
					'prices',
					'all_parts',
					'oracle_text',
					'set_name'
				]) {
					expect(card).not.toHaveProperty(key);
				}
			}
		});

		it('is far smaller than the same database was before the whitelist (#84)', () => {
			const scryfallCard = (id: string) => ({
				id,
				name: `Card ${id}`,
				set: 'mh3',
				set_name: 'Modern Horizons 3',
				collector_number: '42',
				lang: 'en',
				mana_cost: '{1}{R}',
				type_line: 'Instant',
				oracle_text: 'x'.repeat(300),
				image_uris: Object.fromEntries(
					['small', 'normal', 'large', 'png', 'art_crop', 'border_crop'].map((size) => [
						size,
						`https://cards.scryfall.io/${size}/${id}.jpg`
					])
				),
				legalities: Object.fromEntries(
					Array.from({ length: 20 }, (_, i) => [`format_${i}`, 'not_legal'])
				),
				prices: { usd: '1.23', usd_foil: '4.56', eur: '1.05', tix: '0.02' },
				related_uris: { gatherer: 'https://example.invalid/gatherer' }
			});

			const cards = Array.from({ length: 200 }, (_, i) => scryfallCard(`card-${i}`));
			const store = {
				savedCardLists: [],
				collection: cards.map((card) => ({ ...card, quantity_owned: 1 }))
			};

			// The old export, reproduced: same encoder, but every key of every card.
			const before = new Y.Doc();
			const yCollection = before.getMap('collection');
			for (const card of store.collection) {
				const yCard = new Y.Map();
				for (const [key, value] of Object.entries(card)) yCard.set(key, value);
				yCollection.set(card.id, yCard);
			}

			const fat = Y.encodeStateAsUpdate(before).byteLength;
			const thin = exportWithMetadata(store as any).byteLength;

			// Real Scryfall cards (median 5,184 bytes) measure 22× (#84). These
			// fixtures are a third of that size, so the floor is set accordingly —
			// the point is the order of magnitude, not the exact ratio.
			expect(thin * 5).toBeLessThan(fat);
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
