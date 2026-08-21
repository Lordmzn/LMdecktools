import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetDatabases } from './reset';
import { exportCollectionToText, exportCollectionToCSV } from '../store.svelte';
import { openDatabase } from '../db';
import { createDocument, destroyPersistence, seedDocument, updateFor } from '../ydoc';

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

// ==================== Database Import ====================

describe('Database Import', () => {
	let db: IDBDatabase;

	beforeEach(async () => {
		db = await openDatabase();
		const { initDB } = await import('../store.svelte');
		await initDB();
	});

	afterEach(async () => {
		const { closeDB, store } = await import('../store.svelte');
		await closeDB();
		store.dbMode = 'none';
		store.savedCardLists = [];
		store.collection = [];
		store.currentCardListId = null;
		db.close();
		await destroyPersistence();
		await resetDatabases();
	});

	// #52 — restoring is destructive, so an unusable file must never reach the
	// point where the local lineage is thrown away.
	async function seedOneList(): Promise<void> {
		const { createNewCardList, updateListName, replaceListCards } = await import('../store.svelte');
		const list = await createNewCardList();
		await updateListName('Precious Local List');
		await replaceListCards(list.id!, [{ id: 'c1', name: 'Bolt', LM_quantity: 4 }]);
	}

	function localListNames(lists: { name: string }[]): string[] {
		return lists.map((l) => l.name);
	}

	it('leaves the database untouched when the file belongs to another app', async () => {
		await seedOneList();
		const foreign = new TextEncoder().encode(
			JSON.stringify({ app: 'Moxfield', cardLists: [{ name: 'Theirs' }] })
		);

		const { importDatabase, store } = await import('../store.svelte');
		await expect(importDatabase(foreign, false)).rejects.toThrow(/not LM Deck Tools/);

		expect(localListNames(store.savedCardLists)).toEqual(['Precious Local List']);
	});

	it('leaves the database untouched when the file is unrelated JSON', async () => {
		await seedOneList();
		const unrelated = new TextEncoder().encode(JSON.stringify({ tasks: ['buy milk'] }));

		const { importDatabase, store } = await import('../store.svelte');
		await expect(importDatabase(unrelated, false)).rejects.toThrow(/not an LM Deck Tools/);

		expect(store.savedCardLists).toHaveLength(1);
	});

	it('leaves the database untouched when the export is empty', async () => {
		await seedOneList();
		const empty = new TextEncoder().encode(
			JSON.stringify({ app: 'LM Deck Tools', version: '2', cardLists: [], collection: [] })
		);

		const { importDatabase, store } = await import('../store.svelte');
		await expect(importDatabase(empty, false)).rejects.toThrow(/Create New Database/);

		expect(store.savedCardLists).toHaveLength(1);
	});

	it('adopts the lineage of a restored document rather than copying its values', async () => {
		await seedOneList();

		// A file from another device: its own guid, which the restore must take on
		// — otherwise the restored database is a stranger to every replica of it.
		const source = createDocument();
		seedDocument(source, {
			cardLists: [
				{
					id: 'list-imported',
					name: 'Imported List',
					cards: [{ id: 'c1', name: 'Sol Ring', LM_quantity: 1 }],
					cardMatching: 'generic',
					languageMatching: 'any',
					created_at: 1,
					updated_at: 2
				}
			],
			collection: []
		});

		const { importDatabase, documentGuid, store } = await import('../store.svelte');
		const result = await importDatabase(updateFor(source), false);

		expect(result.errors).toBe(0);
		expect(localListNames(store.savedCardLists)).toEqual(['Imported List']);
		expect(documentGuid()).toBe(source.guid);
	});

	it('unions a foreign document in when merging rather than replacing', async () => {
		await seedOneList();

		const source = createDocument();
		seedDocument(source, {
			cardLists: [
				{
					id: 'list-theirs',
					name: 'Precious Local List',
					cards: [{ id: 'c1', name: 'Bolt', LM_quantity: 3 }],
					cardMatching: 'generic',
					languageMatching: 'any',
					created_at: 1,
					updated_at: 2
				}
			],
			collection: []
		});

		const { importDatabase, store } = await import('../store.svelte');
		const result = await importDatabase(updateFor(source), true);

		expect(result.errors).toBe(0);
		expect(store.savedCardLists).toHaveLength(1);
		// Union semantics: the higher count wins, and nothing local is lost.
		expect(store.savedCardLists[0].cards[0].LM_quantity).toBe(4);
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
