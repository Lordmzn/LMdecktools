import { describe, it, expect } from 'vitest';
import {
	parseImportFile,
	assertRestorable,
	describeImport,
	ImportValidationError,
	APP_NAME
} from '../import-guard';
import * as Y from 'yjs';

function encode(value: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(value));
}

/** A minimal genuine export, as `exportWithMetadata()` writes it. */
function yjsExport(options: {
	app?: string;
	version?: string;
	lists?: { name: string }[];
	cards?: { id: string; name: string }[];
	totalLists?: number;
	totalCards?: number;
}): Uint8Array {
	const ydoc = new Y.Doc();
	const meta = ydoc.getMap('metadata');
	if (options.app !== undefined) meta.set('app', options.app);
	if (options.version !== undefined) meta.set('version', options.version);
	meta.set('exported_at', 1_755_000_000_000);
	if (options.totalLists !== undefined) meta.set('total_lists', options.totalLists);
	if (options.totalCards !== undefined) meta.set('total_cards', options.totalCards);

	const yLists = ydoc.getMap('card_lists');
	for (const list of options.lists ?? []) {
		const yList = new Y.Map();
		yList.set('name', list.name);
		yList.set('cards', new Y.Map());
		yLists.set(list.name, yList);
	}

	const yCollection = ydoc.getMap('collection');
	for (const card of options.cards ?? []) {
		const yCard = new Y.Map();
		yCard.set('id', card.id);
		yCard.set('name', card.name);
		yCard.set('quantity_owned', 1);
		yCollection.set(card.id, yCard);
	}

	return Y.encodeStateAsUpdate(ydoc);
}

describe('parseImportFile — foreign files are refused', () => {
	it('rejects JSON exported by another application', () => {
		const data = encode({ app: 'Moxfield', version: '1.0', cardLists: [{ name: 'Deck' }] });

		expect(() => parseImportFile(data)).toThrow(ImportValidationError);
		expect(() => parseImportFile(data)).toThrow(/exported by "Moxfield"/);
	});

	it('rejects unrelated JSON with no recognisable keys', () => {
		expect(() => parseImportFile(encode({ hello: 'world', items: [1, 2, 3] }))).toThrow(
			new RegExp(`not an ${APP_NAME} export`)
		);
	});

	it('rejects a JSON array and a bare JSON scalar', () => {
		expect(() => parseImportFile(encode([{ name: 'Deck' }]))).toThrow(ImportValidationError);
		expect(() => parseImportFile(encode(42))).toThrow(ImportValidationError);
	});

	it('rejects binary that is neither JSON nor a Yjs update', () => {
		const junk = new Uint8Array([0xff, 0xfe, 0x00, 0x01, 0x02, 0x03]);

		expect(() => parseImportFile(junk)).toThrow(/Unrecognised file format/);
	});

	it('rejects an export format version this build does not know', () => {
		const data = encode({ app: APP_NAME, version: '9.9', cardLists: [{ name: 'Deck' }] });

		expect(() => parseImportFile(data)).toThrow(/version 9\.9/);
	});

	it('rejects a Yjs document that names another application', () => {
		const data = yjsExport({ app: 'Archidekt', version: '1.0', lists: [{ name: 'Deck' }] });

		expect(() => parseImportFile(data)).toThrow(/exported by "Archidekt"/);
	});

	it('rejects a Yjs document with neither app metadata nor content', () => {
		expect(() => parseImportFile(yjsExport({}))).toThrow(new RegExp(`not an ${APP_NAME} export`));
	});

	it('every rejection names the file and says nothing was changed', () => {
		const cases = [
			encode({ app: 'Moxfield', cardLists: [] }),
			encode({ hello: 'world' }),
			encode({ app: APP_NAME, version: '9.9', cardLists: [{ name: 'x' }] }),
			new Uint8Array([0xff, 0xfe, 0x00])
		];

		for (const data of cases) {
			expect(() => parseImportFile(data)).toThrow(/Nothing was changed/);
		}
	});
});

describe('parseImportFile — genuine exports are accepted', () => {
	it('accepts a current Yjs export and reports its metadata', () => {
		const data = yjsExport({
			app: APP_NAME,
			version: '1.0',
			lists: [{ name: 'Commander' }],
			cards: [{ id: 'id-bolt', name: 'Lightning Bolt' }],
			totalLists: 1,
			totalCards: 1
		});

		const payload = parseImportFile(data);

		expect(payload.format).toBe('yjs');
		expect(payload.app).toBe(APP_NAME);
		expect(payload.version).toBe('1.0');
		expect(payload.exportedAt).toBe(1_755_000_000_000);
		expect(payload.cardLists).toHaveLength(1);
		expect(payload.collection).toHaveLength(1);
	});

	it('accepts a legacy JSON export with no app field but recognisable keys', () => {
		const payload = parseImportFile(
			encode({ cardLists: [{ name: 'Legacy' }], collection: [{ id: 'c1' }] })
		);

		expect(payload.app).toBeNull();
		expect(payload.cardLists).toHaveLength(1);
		expect(payload.collection).toHaveLength(1);
	});

	it('accepts the v2 `decks` key', () => {
		const payload = parseImportFile(encode({ decks: [{ name: 'Old Deck' }] }));

		expect(payload.cardLists).toHaveLength(1);
	});

	it('accepts a Yjs export from before total_lists/total_cards were written', () => {
		const payload = parseImportFile(
			yjsExport({ app: APP_NAME, version: '1.0', lists: [{ name: 'Commander' }] })
		);

		expect(payload.declaredLists).toBeNull();
		expect(payload.cardLists).toHaveLength(1);
	});
});

describe('parseImportFile — declared counts guard truncation', () => {
	it('rejects a file that declares more lists than it carries', () => {
		const data = yjsExport({
			app: APP_NAME,
			version: '1.0',
			lists: [{ name: 'Commander' }],
			totalLists: 4
		});

		expect(() => parseImportFile(data)).toThrow(/declares 4 card lists but contains 1/);
	});

	it('rejects a file that declares more collection cards than it carries', () => {
		const data = yjsExport({
			app: APP_NAME,
			version: '1.0',
			cards: [{ id: 'id-bolt', name: 'Lightning Bolt' }],
			totalCards: 312
		});

		expect(() => parseImportFile(data)).toThrow(/declares 312 collection cards but contains 1/);
	});

	it('accepts a file whose declared counts match', () => {
		const data = yjsExport({
			app: APP_NAME,
			version: '1.0',
			lists: [{ name: 'Commander' }],
			cards: [{ id: 'id-bolt', name: 'Lightning Bolt' }],
			totalLists: 1,
			totalCards: 1
		});

		expect(() => parseImportFile(data)).not.toThrow();
	});
});

describe('assertRestorable', () => {
	it('refuses an empty payload rather than clearing the database over it', () => {
		const payload = parseImportFile(encode({ app: APP_NAME, cardLists: [], collection: [] }));

		expect(() => assertRestorable(payload)).toThrow(ImportValidationError);
		expect(() => assertRestorable(payload)).toThrow(/Create New Database/);
	});

	it('allows a payload holding only a collection, or only lists', () => {
		const collectionOnly = parseImportFile(encode({ app: APP_NAME, collection: [{ id: 'c1' }] }));
		const listsOnly = parseImportFile(encode({ app: APP_NAME, cardLists: [{ name: 'Deck' }] }));

		expect(() => assertRestorable(collectionOnly)).not.toThrow();
		expect(() => assertRestorable(listsOnly)).not.toThrow();
	});
});

describe('describeImport', () => {
	it('summarises what the user is about to restore', () => {
		const payload = parseImportFile(
			yjsExport({
				app: APP_NAME,
				version: '1.0',
				lists: [{ name: 'Commander' }, { name: 'Modern' }],
				cards: [{ id: 'id-bolt', name: 'Lightning Bolt' }]
			})
		);

		const summary = describeImport(payload);

		expect(summary).toContain(`${APP_NAME} v1.0`);
		expect(summary).toContain('2 lists, 1 collection card');
	});

	it('labels a file with no app metadata as a legacy export', () => {
		const payload = parseImportFile(encode({ cardLists: [{ name: 'Legacy' }] }));

		expect(describeImport(payload)).toContain('Legacy export');
		expect(describeImport(payload)).toContain('1 list, 0 collection cards');
	});
});
