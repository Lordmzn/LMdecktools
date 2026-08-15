/**
 * Collection export formatters (#50).
 *
 * Two formats, kept apart on purpose:
 * - **CSV** — RFC 4180: a header row named after the selected fields, comma
 *   delimited, quoted where a value needs it. The header names are the ones
 *   `import-parser.ts` already recognises, so an export re-imports cleanly.
 * - **Text** — the space-separated `4 Lightning Bolt` form that `parsePlainText()`
 *   reads and that other MTG tools accept as pasted input.
 *
 * Both are pure functions over a card array so they can be tested without the
 * rune-backed store; `store.svelte.ts` supplies `store.collection`.
 */

export interface ExportableCard {
	id: string;
	name: string;
	quantity_owned?: number;
	set?: string;
	collector_number?: string;
	is_foil?: boolean;
	lang?: string;
}

/** Field labels offered in the export UI. CSV uses them verbatim as column headers. */
export const EXPORT_FIELDS = [
	'Count',
	'Name',
	'Edition',
	'Collector Number',
	'Foil',
	'Language',
	'Scryfall ID'
] as const;

export type ExportField = (typeof EXPORT_FIELDS)[number];

/** Column values for the CSV form: machine-readable, one value per field, never blank-by-convention. */
const CSV_FIELD_MAP: Record<string, (c: ExportableCard) => string> = {
	Count: (c) => String(c.quantity_owned ?? 0),
	Name: (c) => c.name ?? '',
	Edition: (c) => c.set?.toUpperCase() ?? '',
	'Collector Number': (c) => c.collector_number ?? '',
	Foil: (c) => (c.is_foil ? 'true' : 'false'),
	Language: (c) => c.lang ?? '',
	'Scryfall ID': (c) => c.id ?? ''
};

/** Column values for the plain-text form, where a foil is marked inline and blanks are dropped. */
const TEXT_FIELD_MAP: Record<string, (c: ExportableCard) => string> = {
	...CSV_FIELD_MAP,
	Foil: (c) => (c.is_foil ? '(Foil)' : '')
};

/** Quote a field per RFC 4180: wrap when it holds a comma, quote, CR or LF; double any inner quote. */
export function escapeCSVField(value: string): string {
	if (/[",\r\n]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

function byName(a: ExportableCard, b: ExportableCard): number {
	return a.name.localeCompare(b.name);
}

/**
 * RFC 4180 CSV: `Count,Name,Edition` header followed by one row per card.
 * CRLF line endings, as the RFC specifies — `parseCSVLine()` trims them off on
 * the way back in. Returns an empty string when no fields are selected, since a
 * file of empty rows is not worth downloading.
 */
export function formatCollectionAsCSV(cards: ExportableCard[], fields: string[]): string {
	if (fields.length === 0) return '';

	const rows = [fields.map(escapeCSVField).join(',')];

	for (const card of [...cards].sort(byName)) {
		const values = fields.map((field) => {
			const getValue = CSV_FIELD_MAP[field];
			return escapeCSVField(getValue ? getValue(card) : '');
		});
		rows.push(values.join(','));
	}

	return rows.join('\r\n') + '\r\n';
}

/**
 * Space-separated text with a `# My Collection` comment header — what
 * `parsePlainText()` expects and what pastes cleanly into other MTG tools.
 */
export function formatCollectionAsText(cards: ExportableCard[], fields: string[]): string {
	let text = `# My Collection\n\n`;

	for (const card of [...cards].sort(byName)) {
		const parts = fields.map((field) => {
			const getValue = TEXT_FIELD_MAP[field];
			return getValue ? getValue(card) : '';
		});
		text += `${parts.join(' ')}\n`;
	}

	return text;
}

export type ExportFormat = 'csv' | 'text';

/** How many rows the export preview renders. The file itself is never truncated. */
export const PREVIEW_ROWS = 50;

export interface ExportPreview {
	/** Formatted text for the preview box — the first `shown` rows of the real export. */
	text: string;
	/** Rows rendered. */
	shown: number;
	/** Cards in the collection. */
	total: number;
	/** Whether anything was left out, i.e. the preview is not the whole file. */
	truncated: boolean;
}

/**
 * The head of an export, for display only (#63).
 *
 * The preview box used to render the entire collection — some 80 KB of text for
 * a 5000-card collection — and rebuilt it on every format or field change, which
 * is what made switching CSV ↔ Text stall. Nobody reads past the first screen of
 * a preview, so only the first `limit` rows are formatted.
 *
 * Sorted before slicing, so the preview really is the top of the file the user
 * will get rather than an arbitrary sample. Download and copy still format the
 * whole collection — truncation must never reach a file.
 */
export function buildExportPreview(
	cards: ExportableCard[],
	fields: string[],
	format: ExportFormat,
	limit: number = PREVIEW_ROWS
): ExportPreview {
	const head = [...cards].sort(byName).slice(0, Math.max(0, limit));
	const text =
		format === 'csv' ? formatCollectionAsCSV(head, fields) : formatCollectionAsText(head, fields);

	return {
		text,
		shown: head.length,
		total: cards.length,
		truncated: cards.length > head.length
	};
}
