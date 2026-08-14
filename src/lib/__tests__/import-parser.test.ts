import { describe, it, expect } from 'vitest';
import {
	detectSourceType,
	parseCSV,
	parseCSVLine,
	parsePlainText,
	parseImportInput
} from '../import-parser';

describe('detectSourceType', () => {
	it('detects Moxfield URLs', () => {
		expect(detectSourceType('https://www.moxfield.com/decks/abc123')).toBe('moxfield-url');
		expect(detectSourceType('https://moxfield.com/decks/abc123')).toBe('moxfield-url');
	});

	it('detects Archidekt URLs', () => {
		expect(detectSourceType('https://archidekt.com/decks/12345')).toBe('archidekt-url');
		expect(detectSourceType('https://www.archidekt.com/decks/12345')).toBe('archidekt-url');
	});

	it('detects CSV (comma in first data line)', () => {
		expect(detectSourceType('Count,Name,Edition\n4,Lightning Bolt,M11')).toBe('csv');
	});

	it('detects plain text', () => {
		expect(detectSourceType('4 Lightning Bolt\n2 Mountain')).toBe('text');
	});

	it('returns unknown for empty input', () => {
		expect(detectSourceType('')).toBe('unknown');
		expect(detectSourceType('   \n  ')).toBe('unknown');
	});
});

describe('parseCSVLine', () => {
	it('splits simple fields', () => {
		expect(parseCSVLine('4,Lightning Bolt,M11')).toEqual(['4', 'Lightning Bolt', 'M11']);
	});

	it('handles quoted fields with commas', () => {
		expect(parseCSVLine('1,"Uro, Titan of Nature\'s Wrath",THB')).toEqual([
			'1',
			"Uro, Titan of Nature's Wrath",
			'THB'
		]);
	});

	it('handles escaped quotes inside quoted fields', () => {
		expect(parseCSVLine('1,"Card ""Name""",SET')).toEqual(['1', 'Card "Name"', 'SET']);
	});

	it('trims whitespace from fields', () => {
		expect(parseCSVLine(' 4 , Lightning Bolt , M11 ')).toEqual(['4', 'Lightning Bolt', 'M11']);
	});
});

describe('parseCSV', () => {
	it('parses Moxfield-style CSV (Count, Name, Edition)', () => {
		const csv = 'Count,Name,Edition\n4,Lightning Bolt,M11\n2,Counterspell,MH2';
		const result = parseCSV(csv);
		expect(result.cards).toEqual([
			{ quantity: 4, name: 'Lightning Bolt', setCode: 'M11' },
			{ quantity: 2, name: 'Counterspell', setCode: 'MH2' }
		]);
		expect(result.warnings).toHaveLength(0);
	});

	it('parses Archidekt-style CSV (Quantity, Card Name, Set Code)', () => {
		const csv = 'Quantity,Card Name,Set Code\n3,Sol Ring,C21';
		const result = parseCSV(csv);
		expect(result.cards).toEqual([{ quantity: 3, name: 'Sol Ring', setCode: 'C21' }]);
	});

	it('parses Deckbox-style CSV (Count, Name, Edition, Collector Number)', () => {
		const csv = 'Count,Name,Edition,Collector Number\n1,Brainstorm,ICE,29';
		const result = parseCSV(csv);
		expect(result.cards).toEqual([
			{ quantity: 1, name: 'Brainstorm', setCode: 'ICE', collectorNumber: '29' }
		]);
	});

	it('handles quoted card names with commas', () => {
		const csv = 'Count,Name\n1,"Uro, Titan of Nature\'s Wrath"';
		const result = parseCSV(csv);
		expect(result.cards).toHaveLength(1);
		expect(result.cards[0].name).toBe("Uro, Titan of Nature's Wrath");
	});

	it('parses TopDecked CSV (QUANTITY, NAME, SETCODE, ID)', () => {
		const csv =
			'QUANTITY,"NAME",SETCODE,"SETNAME","COLLECTOR NUMBER",FINISH,PRICE,RARITY,ID\n' +
			'1,"Thieving Amalgam",c19,"Commander 2019",21,nonfoil,€0.38,rare,06ed7c94-ed3c-427a-b62a-32e91e054671\n' +
			'2,"Lava Axe",9ed,"Ninth Edition",200,nonfoil,€0.03,common,fbcc027a-55c9-4baf-a801-8db805129d5b';
		const result = parseCSV(csv);
		expect(result.cards).toHaveLength(2);
		expect(result.cards[0]).toEqual({
			quantity: 1,
			name: 'Thieving Amalgam',
			setCode: 'c19',
			collectorNumber: '21',
			scryfallId: '06ed7c94-ed3c-427a-b62a-32e91e054671'
		});
		expect(result.cards[1].quantity).toBe(2);
		expect(result.cards[1].scryfallId).toBe('fbcc027a-55c9-4baf-a801-8db805129d5b');
	});

	it('falls back to positional parsing without headers', () => {
		const csv = '4,Lightning Bolt,M11\n2,Counterspell,MH2';
		const result = parseCSV(csv);
		expect(result.cards).toEqual([
			{ quantity: 4, name: 'Lightning Bolt' },
			{ quantity: 2, name: 'Counterspell' }
		]);
	});

	it('defaults quantity to 1 if missing', () => {
		const csv = 'Name,Edition\nLightning Bolt,M11';
		const result = parseCSV(csv);
		expect(result.cards[0].quantity).toBe(1);
	});

	it('warns on empty input', () => {
		const result = parseCSV('');
		expect(result.cards).toHaveLength(0);
		expect(result.warnings).toContain('Empty input');
	});

	it('warns on missing name column with header', () => {
		const csv = 'Count,Foo\n4,bar';
		const result = parseCSV(csv);
		expect(result.warnings[0]).toContain('Name column');
	});

	it('warns on lines with missing card name', () => {
		const csv = 'Count,Name\n4,Lightning Bolt\n2,';
		const result = parseCSV(csv);
		expect(result.cards).toHaveLength(1);
		expect(result.warnings).toHaveLength(1);
	});
});

describe('parsePlainText', () => {
	it('parses standard format', () => {
		const text = '4 Lightning Bolt\n2 Mountain';
		const result = parsePlainText(text);
		expect(result.cards).toEqual([
			{ quantity: 4, name: 'Lightning Bolt' },
			{ quantity: 2, name: 'Mountain' }
		]);
		expect(result.listName).toBeNull();
	});

	it('extracts list name from # header', () => {
		const text = '# My Deck\n4 Lightning Bolt';
		const result = parsePlainText(text);
		expect(result.listName).toBe('My Deck');
		expect(result.cards).toHaveLength(1);
	});

	it('uses only the first # as list name', () => {
		const text = '# Deck Name\n4 Bolt\n# Sideboard\n2 Negate';
		const result = parsePlainText(text);
		expect(result.listName).toBe('Deck Name');
		expect(result.cards).toHaveLength(2);
	});

	it('handles MTGO .dec SB: prefix', () => {
		const text = '4 Lightning Bolt\nSB: 2 Mystical Dispute';
		const result = parsePlainText(text);
		expect(result.cards).toEqual([
			{ quantity: 4, name: 'Lightning Bolt' },
			{ quantity: 2, name: 'Mystical Dispute' }
		]);
	});

	it('skips empty lines', () => {
		const text = '4 Lightning Bolt\n\n\n2 Mountain';
		const result = parsePlainText(text);
		expect(result.cards).toHaveLength(2);
	});

	it('warns on unparseable lines', () => {
		const text = '4 Lightning Bolt\nthis is not valid\n2 Mountain';
		const result = parsePlainText(text);
		expect(result.cards).toHaveLength(2);
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0]).toContain('could not parse');
	});

	it('handles empty input', () => {
		const result = parsePlainText('');
		expect(result.cards).toHaveLength(0);
		expect(result.listName).toBeNull();
	});
});

describe('parseImportInput', () => {
	it('auto-detects and parses CSV', () => {
		const result = parseImportInput('Count,Name\n4,Lightning Bolt');
		expect(result.cards).toHaveLength(1);
		expect(result.cards[0].name).toBe('Lightning Bolt');
	});

	it('auto-detects and parses plain text', () => {
		const result = parseImportInput('4 Lightning Bolt\n2 Mountain');
		expect(result.cards).toHaveLength(2);
	});

	it('returns warning for URL input', () => {
		const result = parseImportInput('https://archidekt.com/decks/123');
		expect(result.cards).toHaveLength(0);
		expect(result.warnings[0]).toContain('URL');
	});

	it('points a pasted Moxfield URL at the file export', () => {
		const result = parseImportInput('https://moxfield.com/decks/abc');
		expect(result.cards).toHaveLength(0);
		expect(result.warnings[0]).toMatch(/export the deck as a text file/i);
	});

	it('returns warning for empty input', () => {
		const result = parseImportInput('');
		expect(result.warnings).toHaveLength(1);
	});
});
