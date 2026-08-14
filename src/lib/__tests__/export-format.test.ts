import { describe, it, expect } from 'vitest';
import {
	escapeCSVField,
	formatCollectionAsCSV,
	formatCollectionAsText,
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
