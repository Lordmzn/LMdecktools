import type { ParsedCard } from './import-parser';

export interface FetchedDeck {
	name: string;
	cards: ParsedCard[];
}

function extractMoxfieldId(url: string): string {
	const match = url.match(/moxfield\.com\/decks\/([A-Za-z0-9_-]+)/);
	if (!match) throw new Error('Could not extract deck ID from Moxfield URL');
	return match[1];
}

function extractArchidektId(url: string): string {
	const match = url.match(/archidekt\.com\/decks\/(\d+)/);
	if (!match) throw new Error('Could not extract deck ID from Archidekt URL');
	return match[1];
}

export async function fetchMoxfieldDeck(url: string): Promise<FetchedDeck> {
	const deckId = extractMoxfieldId(url);
	let res: Response;
	try {
		res = await fetch(`https://api2.moxfield.com/v3/decks/all/${deckId}`);
	} catch {
		throw new Error(
			'Could not reach Moxfield API (likely blocked by CORS). Try exporting the deck as a text file from Moxfield and importing the file instead.'
		);
	}

	if (!res.ok) {
		throw new Error(`Moxfield API returned ${res.status}. Check that the deck is public.`);
	}

	const data = await res.json();
	const deckName = data.name || 'Moxfield Deck';
	const cards: ParsedCard[] = [];

	// Moxfield puts cards in boards: mainboard, sideboard, commanders, etc.
	const boards = ['mainboard', 'sideboard', 'commanders', 'companions', 'maybeboard'];
	for (const board of boards) {
		const boardData = data.boards?.[board]?.cards;
		if (!boardData) continue;
		for (const [, entry] of Object.entries(boardData) as [string, any][]) {
			if (entry.quantity && entry.card?.name) {
				cards.push({
					quantity: entry.quantity,
					name: entry.card.name,
					setCode: entry.card.set,
					collectorNumber: entry.card.cn
				});
			}
		}
	}

	return { name: deckName, cards };
}

export async function fetchArchidektDeck(url: string): Promise<FetchedDeck> {
	const deckId = extractArchidektId(url);
	let res: Response;
	try {
		res = await fetch(`https://archidekt.com/api/decks/${deckId}/`);
	} catch {
		throw new Error(
			'Could not reach Archidekt API (likely blocked by CORS). Try exporting the deck as a text file from Archidekt and importing the file instead.'
		);
	}

	if (!res.ok) {
		throw new Error(`Archidekt API returned ${res.status}. Check that the deck is public.`);
	}

	const data = await res.json();
	const deckName = data.name || 'Archidekt Deck';
	const cards: ParsedCard[] = [];

	for (const entry of data.cards || []) {
		const name = entry.card?.oracleCard?.name;
		if (!name || !entry.quantity) continue;
		cards.push({
			quantity: entry.quantity,
			name,
			setCode: entry.card?.edition?.editioncode,
			collectorNumber: entry.card?.collectorNumber
		});
	}

	return { name: deckName, cards };
}

export async function fetchDeckFromUrl(url: string): Promise<FetchedDeck> {
	if (/moxfield\.com\/decks\//i.test(url)) {
		return fetchMoxfieldDeck(url);
	}
	if (/archidekt\.com\/decks\//i.test(url)) {
		return fetchArchidektDeck(url);
	}
	throw new Error('Unsupported URL. Currently supported: Moxfield and Archidekt deck URLs.');
}
