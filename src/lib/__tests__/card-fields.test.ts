import { describe, it, expect } from 'vitest';
import {
	STORED_CARD_FIELDS,
	carriesCardFacts,
	extractCardFacts,
	toStoredCard,
	toStoredCollectionCard,
	toStoredListCard
} from '../card-fields';

/** A Scryfall card, cut down but with one of every kind of field that used to be stored. */
const scryfallCard = {
	id: 'a1b2',
	name: 'Lightning Bolt',
	set: 'lea',
	set_name: 'Limited Edition Alpha',
	collector_number: '161',
	lang: 'en',
	mana_cost: '{R}',
	type_line: 'Instant',
	oracle_text: 'Lightning Bolt deals 3 damage to any target.',
	cmc: 1,
	colors: ['R'],
	rarity: 'common',
	image_uris: {
		small: 'https://cards.scryfall.io/small/bolt.jpg',
		normal: 'https://cards.scryfall.io/normal/bolt.jpg',
		large: 'https://cards.scryfall.io/large/bolt.jpg',
		png: 'https://cards.scryfall.io/png/bolt.png',
		art_crop: 'https://cards.scryfall.io/art_crop/bolt.jpg',
		border_crop: 'https://cards.scryfall.io/border_crop/bolt.jpg'
	},
	legalities: { standard: 'not_legal', modern: 'legal' },
	prices: { usd: '1.23', eur: '1.05' },
	all_parts: [{ id: 'token-1', component: 'token' }],
	related_uris: { gatherer: 'https://gatherer.wizards.com/x' },
	rulings_uri: 'https://api.scryfall.com/cards/a1b2/rulings'
};

describe('toStoredCard', () => {
	it('keeps the whitelist and drops everything else', () => {
		const stored = toStoredCard(scryfallCard);

		expect(stored).toEqual({
			id: 'a1b2',
			name: 'Lightning Bolt',
			set: 'lea',
			collector_number: '161',
			lang: 'en',
			mana_cost: '{R}',
			type_line: 'Instant'
		});
	});

	it('admits no key outside STORED_CARD_FIELDS', () => {
		const stored = toStoredCard(scryfallCard) as unknown as Record<string, unknown>;

		for (const key of Object.keys(stored)) {
			expect(STORED_CARD_FIELDS).toContain(key);
		}
	});

	it('omits fields the card does not have rather than storing undefined', () => {
		const stored = toStoredCard({ id: 'x', name: 'Nameless printing' });

		expect(Object.keys(stored)).toEqual(['id', 'name']);
	});

	it('keeps is_foil, which describes the copy the user owns rather than the printing', () => {
		expect(toStoredCard({ id: 'x', name: 'Bolt', is_foil: true })).toHaveProperty('is_foil', true);
	});

	it('is a plain object with no prototype surprises for structured clone', () => {
		const stored = toStoredCard(scryfallCard) as unknown as Record<string, unknown>;

		expect(() => structuredClone(stored)).not.toThrow();
	});
});

describe('toStoredCollectionCard / toStoredListCard', () => {
	it('carries the quantity given', () => {
		expect(toStoredCollectionCard(scryfallCard, 3).quantity_owned).toBe(3);
		expect(toStoredListCard(scryfallCard, 2).LM_quantity).toBe(2);
	});

	it('falls back to the quantity the record already carries', () => {
		expect(toStoredCollectionCard({ id: 'x', name: 'A', quantity_owned: 7 }).quantity_owned).toBe(
			7
		);
		expect(toStoredListCard({ id: 'x', name: 'A', LM_quantity: 5 }).LM_quantity).toBe(5);
	});

	it('re-storing a stored record is a no-op', () => {
		const once = toStoredCollectionCard(scryfallCard, 1);
		expect(toStoredCollectionCard(once)).toEqual(once);
	});

	it('drops the Scryfall payload on the way to disk', () => {
		const stored = toStoredCollectionCard(scryfallCard, 1) as unknown as Record<string, unknown>;

		for (const key of [
			'image_uris',
			'card_faces',
			'legalities',
			'prices',
			'all_parts',
			'set_name'
		]) {
			expect(stored).not.toHaveProperty(key);
		}
	});

	it('is dramatically smaller than the card it came from', () => {
		const before = JSON.stringify(scryfallCard).length;
		const after = JSON.stringify(toStoredCollectionCard(scryfallCard, 1)).length;

		// The real measurement is 5,184 bytes down to 131 (#84); this cut-down
		// fixture only has to prove the shape, not reproduce the ratio.
		expect(after).toBeLessThan(before / 4);
	});
});

describe('extractCardFacts', () => {
	it('keeps only the two image sizes the UI renders', () => {
		const facts = extractCardFacts(scryfallCard);

		expect(facts?.image_uris).toEqual({
			small: 'https://cards.scryfall.io/small/bolt.jpg',
			normal: 'https://cards.scryfall.io/normal/bolt.jpg'
		});
	});

	it('keeps the set name, which the collection filters and sorts on', () => {
		expect(extractCardFacts(scryfallCard)?.set_name).toBe('Limited Edition Alpha');
	});

	it('keeps both faces of a double-faced card', () => {
		const facts = extractCardFacts({
			id: 'dfc',
			card_faces: [
				{ name: 'Front', image_uris: { small: 'front-s.jpg', normal: 'front-n.jpg', png: 'x' } },
				{ name: 'Back', image_uris: { small: 'back-s.jpg', normal: 'back-n.jpg', png: 'x' } }
			]
		});

		expect(facts?.card_faces).toEqual([
			{ name: 'Front', image_uris: { small: 'front-s.jpg', normal: 'front-n.jpg' } },
			{ name: 'Back', image_uris: { small: 'back-s.jpg', normal: 'back-n.jpg' } }
		]);
	});

	it('returns null for a card that carries nothing worth caching', () => {
		expect(extractCardFacts(toStoredCollectionCard(scryfallCard, 1))).toBeNull();
		expect(extractCardFacts({ id: 'x' })).toBeNull();
		expect(extractCardFacts(null)).toBeNull();
		expect(extractCardFacts({ name: 'no id' })).toBeNull();
	});
});

describe('carriesCardFacts', () => {
	it('is true for a fresh search result and false for a stored record', () => {
		expect(carriesCardFacts(scryfallCard)).toBe(true);
		expect(carriesCardFacts(toStoredCollectionCard(scryfallCard, 1))).toBe(false);
	});
});
