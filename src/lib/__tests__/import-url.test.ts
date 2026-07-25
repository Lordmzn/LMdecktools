import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMoxfieldDeck, fetchArchidektDeck, fetchDeckFromUrl } from '../import-url';

beforeEach(() => {
	vi.restoreAllMocks();
});

describe('fetchMoxfieldDeck', () => {
	it('parses a Moxfield deck response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					name: 'Test Deck',
					boards: {
						mainboard: {
							cards: {
								'abc-123': {
									quantity: 4,
									card: { name: 'Lightning Bolt', set: 'M11', cn: '150' }
								},
								'def-456': {
									quantity: 2,
									card: { name: 'Counterspell', set: 'MH2', cn: '267' }
								}
							}
						},
						sideboard: {
							cards: {
								'ghi-789': {
									quantity: 1,
									card: { name: 'Negate', set: 'M20', cn: '69' }
								}
							}
						}
					}
				}),
				{ status: 200 }
			)
		);

		const result = await fetchMoxfieldDeck('https://moxfield.com/decks/abc123');
		expect(result.name).toBe('Test Deck');
		expect(result.cards).toHaveLength(3);
		expect(result.cards[0]).toEqual({
			quantity: 4,
			name: 'Lightning Bolt',
			setCode: 'M11',
			collectorNumber: '150'
		});
	});

	it('throws on 404', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
		await expect(fetchMoxfieldDeck('https://moxfield.com/decks/abc')).rejects.toThrow('404');
	});

	it('throws user-friendly message on network/CORS error', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(fetchMoxfieldDeck('https://moxfield.com/decks/abc')).rejects.toThrow('CORS');
	});

	it('throws on invalid URL', async () => {
		await expect(fetchMoxfieldDeck('https://example.com')).rejects.toThrow('deck ID');
	});
});

describe('fetchArchidektDeck', () => {
	it('parses an Archidekt deck response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					name: 'Commander Deck',
					cards: [
						{
							quantity: 1,
							card: {
								oracleCard: { name: 'Sol Ring' },
								edition: { editioncode: 'C21' },
								collectorNumber: '263'
							}
						},
						{
							quantity: 4,
							card: {
								oracleCard: { name: 'Lightning Bolt' },
								edition: { editioncode: 'M11' },
								collectorNumber: '150'
							}
						}
					]
				}),
				{ status: 200 }
			)
		);

		const result = await fetchArchidektDeck('https://archidekt.com/decks/12345');
		expect(result.name).toBe('Commander Deck');
		expect(result.cards).toHaveLength(2);
		expect(result.cards[0]).toEqual({
			quantity: 1,
			name: 'Sol Ring',
			setCode: 'C21',
			collectorNumber: '263'
		});
	});

	it('throws on 404', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }));
		await expect(fetchArchidektDeck('https://archidekt.com/decks/123')).rejects.toThrow('404');
	});

	it('throws user-friendly message on network/CORS error', async () => {
		vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(fetchArchidektDeck('https://archidekt.com/decks/123')).rejects.toThrow('CORS');
	});
});

describe('fetchDeckFromUrl', () => {
	it('dispatches to Moxfield', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ name: 'M', boards: {} }), { status: 200 })
		);
		const result = await fetchDeckFromUrl('https://moxfield.com/decks/xyz');
		expect(result.name).toBe('M');
	});

	it('dispatches to Archidekt', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ name: 'A', cards: [] }), { status: 200 })
		);
		const result = await fetchDeckFromUrl('https://archidekt.com/decks/999');
		expect(result.name).toBe('A');
	});

	it('throws on unsupported URL', async () => {
		await expect(fetchDeckFromUrl('https://example.com/decks/1')).rejects.toThrow('Unsupported');
	});
});
