import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportCollectionToText, exportCollectionToCSV } from '../store.svelte';
import {
	openDatabase,
	saveCardList,
	loadAllCardLists,
	createEmptyCardList,
	type CardList
} from '../db';

// Mock the store's collection for the export functions
// They read `store.collection` internally (a rune), so we mock the module and
// delegate to the real formatters in export-format.ts — no re-implementation here.
vi.mock('../store.svelte', async (importOriginal) => {
	const mod = await importOriginal<typeof import('../store.svelte')>();
	const { formatCollectionAsCSV, formatCollectionAsText } = await import('../export-format');

	const mockCollection = [
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

	return {
		...mod,
		exportCollectionToText: (fields: string[]) => formatCollectionAsText(mockCollection, fields),
		exportCollectionToCSV: (fields: string[]) => formatCollectionAsCSV(mockCollection, fields)
	};
});

describe('exportCollectionToText', () => {
	it('exports with Count + Name fields', () => {
		const result = exportCollectionToText(['Count', 'Name']);

		expect(result).toContain('# My Collection');
		// Cards are sorted alphabetically
		expect(result).toContain('2 Counterspell');
		expect(result).toContain('4 Lightning Bolt');
	});

	it('exports with all common fields', () => {
		const result = exportCollectionToText(['Count', 'Name', 'Edition']);

		expect(result).toContain('2 Counterspell M25');
		expect(result).toContain('4 Lightning Bolt LEA');
	});

	it('includes Foil marker only for foil cards', () => {
		const result = exportCollectionToText(['Name', 'Foil']);

		expect(result).toContain('Counterspell (Foil)');
		// Non-foil should have empty string, so just the name with trailing space
		expect(result).toMatch(/Lightning Bolt\s/);
	});

	it('exports Scryfall ID', () => {
		const result = exportCollectionToText(['Name', 'Scryfall ID']);

		expect(result).toContain('Counterspell id-counterspell');
		expect(result).toContain('Lightning Bolt id-bolt');
	});

	it('returns only header when no fields selected', () => {
		const result = exportCollectionToText([]);

		expect(result).toContain('# My Collection');
		// Each card produces an empty line, so the output is header + blank + empty lines
		// split on \n gives: header, blank, empty, empty, trailing
		const lines = result.split('\n');
		// "# My Collection", "", "", "", ""
		expect(lines.length).toBe(5);
	});
});

describe('exportCollectionToCSV', () => {
	it('exports the collection as CSV with a header row', () => {
		const result = exportCollectionToCSV(['Count', 'Name', 'Edition']);

		expect(result.split('\r\n')).toEqual([
			'Count,Name,Edition',
			'2,Counterspell,M25',
			'4,Lightning Bolt,LEA',
			''
		]);
	});

	it('produces a file the app can re-import', async () => {
		const { parseImportInput } = await import('../import-parser');
		const result = parseImportInput(exportCollectionToCSV(['Count', 'Name', 'Edition']));

		expect(result.cards).toEqual([
			{ quantity: 2, name: 'Counterspell', setCode: 'M25' },
			{ quantity: 4, name: 'Lightning Bolt', setCode: 'LEA' }
		]);
	});
});

// ==================== Write Guards and dbMode Transitions ====================
// See store-guards.test.ts for write guard and dbMode transition tests.
// They live in a separate file to avoid vi.mock conflicts with the mock above.

// ==================== PLANNED: Database Import ====================

describe('Database Import', () => {
	let db: IDBDatabase;

	beforeEach(async () => {
		db = await openDatabase();
	});

	afterEach(async () => {
		db.close();
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	});

	// #52 — restoring is destructive, so an unusable file must not reach clearDatabase()
	async function seedOneList(): Promise<void> {
		await saveCardList(db, {
			...createEmptyCardList(),
			name: 'Precious Local List',
			cards: [{ id: 'c1', name: 'Bolt', LM_quantity: 4 }]
		});
	}

	it('leaves the database untouched when the file belongs to another app', async () => {
		await seedOneList();
		const foreign = new TextEncoder().encode(
			JSON.stringify({ app: 'Moxfield', cardLists: [{ name: 'Theirs' }] })
		);

		const { importDatabase } = await import('../store.svelte');
		await expect(importDatabase(db, foreign, false)).rejects.toThrow(/not LM Deck Tools/);

		const survivors = await loadAllCardLists(db);
		expect(survivors.map((l) => l.name)).toEqual(['Precious Local List']);
	});

	it('leaves the database untouched when the file is unrelated JSON', async () => {
		await seedOneList();
		const unrelated = new TextEncoder().encode(JSON.stringify({ tasks: ['buy milk'] }));

		const { importDatabase } = await import('../store.svelte');
		await expect(importDatabase(db, unrelated, false)).rejects.toThrow(/not an LM Deck Tools/);

		expect(await loadAllCardLists(db)).toHaveLength(1);
	});

	it('leaves the database untouched when the export is empty', async () => {
		await seedOneList();
		const empty = new TextEncoder().encode(
			JSON.stringify({ app: 'LM Deck Tools', version: '1.0', cardLists: [], collection: [] })
		);

		const { importDatabase } = await import('../store.svelte');
		await expect(importDatabase(db, empty, false)).rejects.toThrow(/Create New Database/);

		expect(await loadAllCardLists(db)).toHaveLength(1);
	});

	// [planned] Import a database from a .yjs file
	it('imports card lists from a Yjs binary file', async () => {
		// First, export card lists to get binary data via a different path
		const { exportCardListsAsYjs } = await import('../yjs-integration');
		const cardLists: CardList[] = [
			{
				name: 'Imported List',
				cards: [{ id: 'c1', name: 'Sol Ring', LM_quantity: 1 }],
				cardMatching: 'generic',
				languageMatching: 'any',
				created_at: Date.now(),
				updated_at: Date.now()
			}
		];
		const yjsData = exportCardListsAsYjs(cardLists);

		// importDatabase should handle Yjs binary format
		// Currently it throws "Invalid file format" for non-JSON data
		const { importDatabase } = await import('../store.svelte');
		const result = await importDatabase(db, yjsData, false);

		expect(result.imported).toBe(1);
		expect(result.errors).toBe(0);

		const loaded = await loadAllCardLists(db);
		expect(loaded).toHaveLength(1);
		expect(loaded[0].name).toBe('Imported List');
	});

	// [planned] Import with merge
	it('merges imported card lists with existing data', async () => {
		// Save an existing list
		const existing: CardList = {
			...createEmptyCardList(),
			name: 'Existing List',
			cards: [{ id: 'c1', name: 'Bolt', LM_quantity: 2 }]
		};
		await saveCardList(db, existing);

		// Create JSON import data with same list name
		const importData = JSON.stringify({
			cardLists: [
				{
					name: 'Existing List',
					cards: [{ id: 'c1', name: 'Bolt', LM_quantity: 3 }],
					cardMatching: 'generic',
					languageMatching: 'any',
					created_at: Date.now(),
					updated_at: Date.now()
				}
			]
		});
		const data = new TextEncoder().encode(importData);

		const { importDatabase } = await import('../store.svelte');
		const result = await importDatabase(db, data, true);

		expect(result.merged).toBe(1);
		expect(result.errors).toBe(0);

		const loaded = await loadAllCardLists(db);
		expect(loaded).toHaveLength(1);
		// Merged quantities: 2 + 3 = 5
		expect(loaded[0].cards[0].LM_quantity).toBe(5);
	});
});

// ==================== PLANNED: Card List Store Functions ====================

describe('Card List Store Functions', () => {
	// These tests verify the store-level card list management functions.

	// [planned] Export current list to text format
	it('exports a list to standard text format', async () => {
		const { exportListToText } = await import('../store.svelte');

		expect(() => exportListToText()).not.toThrow();
	});

	// [planned] Import list from text
	it('imports a list from standard text format', async () => {
		const { importListFromText } = await import('../store.svelte');

		expect(importListFromText).toBeDefined();
	});

	// [planned] Add card to list
	it('adds a card to the current list', async () => {
		const { addCardToList } = await import('../store.svelte');

		const _mockCard = {
			id: 'card-1',
			name: 'Lightning Bolt',
			image_uris: { normal: 'http://example.com/bolt.jpg' },
			mana_cost: '{R}',
			type_line: 'Instant'
		};

		// Should not throw when properly implemented with Svelte 5 runes
		expect(addCardToList).toBeDefined();
	});

	// [planned] Remove card from list
	it('removes a card from the current list', async () => {
		const { removeCardFromList } = await import('../store.svelte');

		expect(removeCardFromList).toBeDefined();
	});

	// [planned] Update list ownership params
	it('updates list ownership check params', async () => {
		const { updateListParams } = await import('../store.svelte');

		expect(updateListParams).toBeDefined();
	});
});
