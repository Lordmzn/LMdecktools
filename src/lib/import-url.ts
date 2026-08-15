import type { ParsedCard } from './import-parser';
import * as m from './paraglide/messages';

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
 *
 * A function rather than a constant because the text is translated (#39) — a
 * module-level constant would freeze whichever locale happened to load first.
 */
export const moxfieldUrlMessage = () => m.import_url_moxfield();

function extractArchidektId(url: string): string {
	const match = url.match(/archidekt\.com\/decks\/(\d+)/);
	if (!match) throw new Error(m.import_url_no_deck_id());
	return match[1];
}

export async function fetchArchidektDeck(url: string): Promise<FetchedDeck> {
	const deckId = extractArchidektId(url);
	let res: Response;
	try {
		res = await fetch(`https://archidekt.com/api/decks/${deckId}/`);
	} catch {
		throw new Error(m.import_url_archidekt_unreachable());
	}

	if (!res.ok) {
		throw new Error(m.import_url_archidekt_status({ status: res.status }));
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
		throw new Error(moxfieldUrlMessage());
	}
	if (/archidekt\.com\/decks\//i.test(url)) {
		return fetchArchidektDeck(url);
	}
	throw new Error(m.import_url_unsupported());
}
