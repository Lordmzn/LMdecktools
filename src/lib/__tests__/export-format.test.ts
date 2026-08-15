import { describe, it, expect } from 'vitest';
import {
	escapeCSVField,
	formatCollectionAsCSV,
	formatCollectionAsText,
	buildExportPreview,
	PREVIEW_ROWS,
	type ExportableCard
} from '../export-format';
import { parseImportInput, parseCSVLine } from '../import-parser';

const collection: ExportableCard[] = [
	{
		id: 'id-bolt',
		name: 'Lightning Bolt',
		quantity_owned: 4,
		set: 'lea',
		collector_number: '161',
		is_foil: false,
		lang: 'en'
	},
	{
		id: 'id-counterspell',
		name: 'Counterspell',
		quantity_owned: 2,
		set: 'm25',
		collector_number: '50',
		is_foil: true,
		lang: 'en'
	}
];

describe('escapeCSVField', () => {
	it('leaves plain values alone', () => {
		expect(escapeCSVField('Lightning Bolt')).toBe('Lightning Bolt');
	});

	it('quotes commas, quotes and newlines, doubling inner quotes', () => {
		expect(escapeCSVField('Ach! Hans, Run!')).toBe('"Ach! Hans, Run!"');
		expect(escapeCSVField('Say "Ahh"')).toBe('"Say ""Ahh"""');
		expect(escapeCSVField('a\nb')).toBe('"a\nb"');
	});
});

describe('formatCollectionAsCSV', () => {
	it('emits a header row naming the selected fields', () => {
		const rows = formatCollectionAsCSV(collection, ['Count', 'Name', 'Edition']).split('\r\n');
		expect(rows[0]).toBe('Count,Name,Edition');
	});

	it('emits one comma-delimited row per card, sorted by name', () => {
		const rows = formatCollectionAsCSV(collection, ['Count', 'Name', 'Edition']).split('\r\n');
		expect(rows[1]).toBe('2,Counterspell,M25');
		expect(rows[2]).toBe('4,Lightning Bolt,LEA');
	});

	it('gives every selected field its own column', () => {
		const rows = formatCollectionAsCSV(collection, [
			'Count',
			'Name',
			'Edition',
			'Collector Number',
			'Foil',
			'Language',
			'Scryfall ID'
		]).split('\r\n');
		expect(parseCSVLine(rows[0])).toHaveLength(7);
		expect(parseCSVLine(rows[1])).toEqual([
			'2',
			'Counterspell',
			'M25',
			'50',
			'true',
			'en',
			'id-counterspell'
		]);
		expect(parseCSVLine(rows[2])[4]).toBe('false');
	});

	it('quotes a card name containing a comma so the row keeps its column count', () => {
		const tricky: ExportableCard[] = [
			{ id: 'id-ach', name: 'Ach! Hans, Run!', quantity_owned: 1, set: 'unh' }
		];
		const rows = formatCollectionAsCSV(tricky, ['Count', 'Name', 'Edition']).split('\r\n');
		expect(rows[1]).toBe('1,"Ach! Hans, Run!",UNH');
		expect(parseCSVLine(rows[1])).toEqual(['1', 'Ach! Hans, Run!', 'UNH']);
	});

	it('has no comment header — a "#" line is not valid CSV', () => {
		expect(formatCollectionAsCSV(collection, ['Count', 'Name'])).not.toContain('#');
	});

	it('returns nothing when no fields are selected', () => {
		expect(formatCollectionAsCSV(collection, [])).toBe('');
	});

	it('does not reorder the caller-supplied collection', () => {
		const cards = [...collection];
		formatCollectionAsCSV(cards, ['Name']);
		expect(cards[0].name).toBe('Lightning Bolt');
	});
});

describe('CSV export round-trips through the importer', () => {
	it('reproduces the same quantities, names, sets and ids', () => {
		const csv = formatCollectionAsCSV(collection, [
			'Count',
			'Name',
			'Edition',
			'Collector Number',
			'Scryfall ID'
		]);

		const result = parseImportInput(csv);

		expect(result.warnings).toEqual([]);
		expect(result.cards).toEqual([
			{
				quantity: 2,
				name: 'Counterspell',
				setCode: 'M25',
				collectorNumber: '50',
				scryfallId: 'id-counterspell'
			},
			{
				quantity: 4,
				name: 'Lightning Bolt',
				setCode: 'LEA',
				collectorNumber: '161',
				scryfallId: 'id-bolt'
			}
		]);
	});

	it('round-trips a name containing a comma', () => {
		const tricky: ExportableCard[] = [{ id: 'id-ach', name: 'Ach! Hans, Run!', quantity_owned: 3 }];
		const result = parseImportInput(formatCollectionAsCSV(tricky, ['Count', 'Name']));

		expect(result.cards).toEqual([{ quantity: 3, name: 'Ach! Hans, Run!' }]);
	});

	it('defaults to one copy when Count is not among the exported fields', () => {
		const result = parseImportInput(formatCollectionAsCSV(collection, ['Name', 'Edition']));

		expect(result.cards.map((c) => [c.name, c.quantity])).toEqual([
			['Counterspell', 1],
			['Lightning Bolt', 1]
		]);
	});
});

describe('formatCollectionAsText', () => {
	it('keeps the space-separated form the plain-text importer reads', () => {
		const text = formatCollectionAsText(collection, ['Count', 'Name']);

		expect(text).toContain('# My Collection');
		expect(text).toContain('2 Counterspell');
		expect(text).toContain('4 Lightning Bolt');

		const result = parseImportInput(text);
		expect(result.listName).toBe('My Collection');
		expect(result.cards).toEqual([
			{ quantity: 2, name: 'Counterspell' },
			{ quantity: 4, name: 'Lightning Bolt' }
		]);
	});

	it('marks foils inline', () => {
		const text = formatCollectionAsText(collection, ['Name', 'Foil']);
		expect(text).toContain('Counterspell (Foil)');
		expect(text).toMatch(/Lightning Bolt\s/);
	});
});

describe('buildExportPreview', () => {
	/** `count` cards named so that alphabetical order matches numeric order. */
	function manyCards(count: number): ExportableCard[] {
		return Array.from({ length: count }, (_, i) => ({
			id: `id-${i}`,
			name: `Card ${String(i).padStart(4, '0')}`,
			quantity_owned: 1,
			set: 'neo'
		}));
	}

	const fields = ['Count', 'Name'];

	it('renders every card when the collection is small', () => {
		const preview = buildExportPreview(collection, fields, 'csv');

		expect(preview.total).toBe(2);
		expect(preview.shown).toBe(2);
		expect(preview.truncated).toBe(false);
		expect(preview.text).toContain('Lightning Bolt');
	});

	it('caps the rendered rows once the collection is large', () => {
		const preview = buildExportPreview(manyCards(500), fields, 'csv');

		expect(preview.total).toBe(500);
		expect(preview.shown).toBe(PREVIEW_ROWS);
		expect(preview.truncated).toBe(true);
		// Header row plus PREVIEW_ROWS data rows, and nothing more
		expect(preview.text.trimEnd().split('\r\n')).toHaveLength(PREVIEW_ROWS + 1);
	});

	it('previews the top of the file, not an arbitrary slice', () => {
		// Reverse-sorted input: a preview that skipped sorting would start at 0499
		const reversed = manyCards(500).reverse();

		const preview = buildExportPreview(reversed, fields, 'csv');

		expect(preview.text).toContain('Card 0000');
		expect(preview.text).toContain(`Card ${String(PREVIEW_ROWS - 1).padStart(4, '0')}`);
		expect(preview.text).not.toContain('Card 0499');
	});

	it('matches the head of the full export it stands in for', () => {
		const cards = manyCards(200);

		const preview = buildExportPreview(cards, fields, 'csv');
		const full = formatCollectionAsCSV(cards, fields);

		expect(full.startsWith(preview.text.trimEnd())).toBe(true);
	});

	it('previews the text format too', () => {
		const preview = buildExportPreview(manyCards(100), fields, 'text', 10);

		expect(preview.text).toContain('# My Collection');
		expect(preview.shown).toBe(10);
		expect(preview.truncated).toBe(true);
	});

	it('honours an explicit limit', () => {
		const preview = buildExportPreview(manyCards(100), fields, 'csv', 3);

		expect(preview.shown).toBe(3);
		expect(preview.truncated).toBe(true);
	});

	it('handles an empty collection', () => {
		const preview = buildExportPreview([], fields, 'csv');

		expect(preview).toMatchObject({ shown: 0, total: 0, truncated: false });
	});

	it('renders nothing when no fields are selected', () => {
		expect(buildExportPreview(collection, [], 'csv').text).toBe('');
	});

	it('does not reorder the caller\u2019s array', () => {
		const cards = manyCards(5).reverse();
		const firstBefore = cards[0].name;

		buildExportPreview(cards, fields, 'csv');

		expect(cards[0].name).toBe(firstBefore);
	});
});
