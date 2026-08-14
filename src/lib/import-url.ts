import type { ParsedCard } from './import-parser';

export interface FetchedDeck {
	name: string;
	cards: ParsedCard[];
}

/** The only third-party host a URL import contacts. Disclosed in the UI before the fetch. */
export const URL_IMPORT_HOST = 'archidekt.com';

/**
 * Moxfield has no public API: `api2.moxfield.com` blocks unauthorised cross-origin
 * use, so the fetch never succeeded from the browser. Their own file export does
 * work, and `import-parser.ts` already reads it. See #49.
 */
export const MOXFIELD_URL_MESSAGE =
	'Moxfield deck URLs cannot be imported: Moxfield has no public API. In Moxfield, use "Export" to download the deck as a text file, then import it from the File tab (or paste it into the Text tab).';

function extractArchidektId(url: string): string {
	const match = url.match(/archidekt\.com\/decks\/(\d+)/);
	if (!match) throw new Error('Could not extract deck ID from Archidekt URL');
	return match[1];
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
	if (/moxfield\.com\//i.test(url)) {
		throw new Error(MOXFIELD_URL_MESSAGE);
	}
	if (/archidekt\.com\/decks\//i.test(url)) {
		return fetchArchidektDeck(url);
	}
	throw new Error(
		'Unsupported URL. Only Archidekt deck URLs can be imported. Any other deck site: export the deck as a text file and use the File or Text tab.'
	);
}
