import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchArchidektDeck, fetchDeckFromUrl } from '../import-url';

beforeEach(() => {
	vi.restoreAllMocks();
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
	it('never contacts Moxfield, and points at their file export instead', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await expect(fetchDeckFromUrl('https://moxfield.com/decks/xyz')).rejects.toThrow(
			/no public API/i
		);
		await expect(fetchDeckFromUrl('https://www.moxfield.com/decks/xyz')).rejects.toThrow(
			/File tab/i
		);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('dispatches to Archidekt, and to no other host', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockResolvedValue(new Response(JSON.stringify({ name: 'A', cards: [] }), { status: 200 }));
		const result = await fetchDeckFromUrl('https://archidekt.com/decks/999');
		expect(result.name).toBe('A');
		expect(fetchSpy).toHaveBeenCalledTimes(1);
		expect(String(fetchSpy.mock.calls[0][0])).toBe('https://archidekt.com/api/decks/999/');
	});

	it('throws on unsupported URL', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		await expect(fetchDeckFromUrl('https://example.com/decks/1')).rejects.toThrow('Unsupported');
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});
