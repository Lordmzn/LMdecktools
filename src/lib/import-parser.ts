import * as m from './paraglide/messages';

export type ImportSourceType = 'csv' | 'text' | 'moxfield-url' | 'archidekt-url' | 'unknown';

export interface ParsedCard {
	quantity: number;
	name: string;
	setCode?: string;
	collectorNumber?: string;
	scryfallId?: string;
}

export interface ParseResult {
	listName: string | null;
	cards: ParsedCard[];
	warnings: string[];
}

/** Detect whether the input is a URL, CSV, or plain text. */
export function detectSourceType(input: string): ImportSourceType {
	const trimmed = input.trim();

	if (/^https?:\/\/(www\.)?moxfield\.com\/decks\//i.test(trimmed)) return 'moxfield-url';
	if (/^https?:\/\/(www\.)?archidekt\.com\/decks\//i.test(trimmed)) return 'archidekt-url';

	// CSV if the first non-empty, non-comment line contains commas and looks like a header or data row
	const lines = trimmed.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
	if (lines.length > 0 && lines[0].includes(',')) return 'csv';

	if (lines.length > 0) return 'text';

	return 'unknown';
}

// --- CSV parsing ---

const QUANTITY_ALIASES = ['count', 'quantity', 'qty', 'amount'];
const NAME_ALIASES = ['name', 'card name', 'card'];
const SET_ALIASES = ['edition', 'set', 'set code', 'set name', 'setcode'];
const COLLECTOR_ALIASES = ['collector number', 'number', '#', 'collector #'];
const ID_ALIASES = ['id', 'scryfall id', 'scryfall_id'];

/** Parse a single CSV line respecting RFC 4180 quoted fields. */
export function parseCSVLine(line: string): string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i++; // skip escaped quote
				} else {
					inQuotes = false;
				}
			} else {
				current += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ',') {
				fields.push(current.trim());
				current = '';
			} else {
				current += ch;
			}
		}
	}
	fields.push(current.trim());
	return fields;
}

function findColumnIndex(headers: string[], aliases: string[]): number {
	const lower = headers.map((h) => h.toLowerCase().trim());
	for (const alias of aliases) {
		const idx = lower.indexOf(alias);
		if (idx !== -1) return idx;
	}
	return -1;
}

export function parseCSV(text: string): ParseResult {
	const lines = text.split('\n').filter((l) => l.trim());
	const warnings: string[] = [];
	const cards: ParsedCard[] = [];

	if (lines.length === 0) return { listName: null, cards: [], warnings: ['Empty input'] };

	const firstFields = parseCSVLine(lines[0]);
	const hasHeader = firstFields.some(
		(f) =>
			QUANTITY_ALIASES.includes(f.toLowerCase().trim()) ||
			NAME_ALIASES.includes(f.toLowerCase().trim())
	);

	let qtyIdx: number;
	let nameIdx: number;
	let setIdx: number;
	let collectorIdx: number;
	let idIdx: number;
	let dataStartLine: number;

	if (hasHeader) {
		qtyIdx = findColumnIndex(firstFields, QUANTITY_ALIASES);
		nameIdx = findColumnIndex(firstFields, NAME_ALIASES);
		setIdx = findColumnIndex(firstFields, SET_ALIASES);
		collectorIdx = findColumnIndex(firstFields, COLLECTOR_ALIASES);
		idIdx = findColumnIndex(firstFields, ID_ALIASES);
		dataStartLine = 1;

		if (nameIdx === -1) {
			return {
				listName: null,
				cards: [],
				warnings: ['Could not find a Name column in CSV header']
			};
		}
	} else {
		// Positional fallback: qty, name, ...
		qtyIdx = 0;
		nameIdx = 1;
		setIdx = -1;
		collectorIdx = -1;
		idIdx = -1;
		dataStartLine = 0;
	}

	for (let i = dataStartLine; i < lines.length; i++) {
		const fields = parseCSVLine(lines[i]);
		const name = fields[nameIdx]?.trim();
		if (!name) {
			warnings.push(m.import_parse_missing_name({ line: i + 1 }));
			continue;
		}

		let quantity = 1;
		if (qtyIdx >= 0 && fields[qtyIdx]) {
			const parsed = parseInt(fields[qtyIdx], 10);
			if (!isNaN(parsed) && parsed > 0) {
				quantity = parsed;
			}
		}

		const card: ParsedCard = { quantity, name };
		if (setIdx >= 0 && fields[setIdx]) card.setCode = fields[setIdx].trim();
		if (collectorIdx >= 0 && fields[collectorIdx])
			card.collectorNumber = fields[collectorIdx].trim();
		if (idIdx >= 0 && fields[idIdx]) card.scryfallId = fields[idIdx].trim();

		cards.push(card);
	}

	return { listName: null, cards, warnings };
}

// --- Plain text parsing ---

export function parsePlainText(text: string): ParseResult {
	const lines = text.split('\n');
	const warnings: string[] = [];
	const cards: ParsedCard[] = [];
	let listName: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Comment / list name header
		if (line.startsWith('#')) {
			if (!listName) {
				listName = line.replace(/^#+\s*/, '').trim() || null;
			}
			continue;
		}

		// Strip sideboard prefix (MTGO .dec format)
		const stripped = line.replace(/^SB:\s*/i, '');

		const match = stripped.match(/^(\d+)\s+(.+)$/);
		if (match) {
			cards.push({ quantity: parseInt(match[1], 10), name: match[2].trim() });
		} else {
			warnings.push(m.import_parse_unparseable({ line: i + 1, text: line }));
		}
	}

	return { listName, cards, warnings };
}

// --- Auto-detect and dispatch ---

export function parseImportInput(text: string): ParseResult {
	const sourceType = detectSourceType(text);

	switch (sourceType) {
		case 'csv':
			return parseCSV(text);
		case 'text':
			return parsePlainText(text);
		case 'moxfield-url':
			// Moxfield has no public API (#49) — their file export is the supported path
			return {
				listName: null,
				cards: [],
				warnings: [
					'Moxfield URL detected — Moxfield deck URLs cannot be imported. Export the deck as a text file from Moxfield and import that instead.'
				]
			};
		case 'archidekt-url':
			// URL inputs are handled by the caller via import-url.ts
			return { listName: null, cards: [], warnings: ['URL detected — use the URL fetch flow'] };
		default:
			return { listName: null, cards: [], warnings: ['Could not determine input format'] };
	}
}
