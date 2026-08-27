import { describe, it, expect } from 'vitest';
import {
	parseImportFile,
	assertRestorable,
	describeImport,
	ImportValidationError,
	APP_NAME
} from '../import-guard';
import * as Y from 'yjs';
import { DOC_SCHEMA_VERSION, createDocument, seedDocument, updateFor } from '../ydoc';
import { buildShareEnvelope } from '../share-envelope';

const CURRENT_VERSION = String(DOC_SCHEMA_VERSION);

function encode(value: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(value));
}

/**
 * A document payload, as a linked file or a peer now carries it (#47).
 *
 * `app` and `version` are overridable so the foreign-file cases can build one
 * that claims to be something else — which a real stranger's file would.
 */
function documentExport(options: {
	app?: string;
	version?: string;
	guid?: string;
	lists?: { name: string }[];
	cards?: { id: string; name: string }[];
	createdAt?: number;
}): Uint8Array {
	const doc = createDocument(options.guid);

	const meta = doc.getMap('meta');
	doc.transact(() => {
		if (options.app === undefined) meta.delete('app');
		else meta.set('app', options.app);

		if (options.version === undefined) meta.delete('schema_version');
		else meta.set('schema_version', Number(options.version));

		meta.set('created_at', options.createdAt ?? 1_755_000_000_000);
	});

	seedDocument(doc, {
		cardLists: (options.lists ?? []).map((list, i) => ({
			id: `list-${i}`,
			name: list.name,
			cards: [],
			cardMatching: 'generic' as const,
			languageMatching: 'any' as const,
			created_at: i,
			updated_at: i
		})),
		collection: (options.cards ?? []).map((card) => ({ ...card, quantity_owned: 1 }))
	});

	return updateFor(doc);
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

	it('rejects a document that names another application', () => {
		const data = documentExport({
			app: 'Archidekt',
			version: CURRENT_VERSION,
			lists: [{ name: 'Deck' }]
		});

		expect(() => parseImportFile(data)).toThrow(/exported by "Archidekt"/);
	});

	it('rejects a document with neither app metadata nor content', () => {
		expect(() => parseImportFile(documentExport({ app: undefined, version: undefined }))).toThrow(
			new RegExp(`not an ${APP_NAME} export`)
		);
	});

	it('rejects a document written by a schema this build predates', () => {
		const data = documentExport({ app: APP_NAME, version: '99', lists: [{ name: 'Deck' }] });

		expect(() => parseImportFile(data)).toThrow(/version 99/);
	});

	it('rejects the retired 1.0 snapshot format', () => {
		// A snapshot has no lineage to adopt, and the alpha owes it no support:
		// restoring one would produce a database no other device could sync with.
		const snapshot = new Y.Doc();
		const meta = snapshot.getMap('metadata');
		meta.set('app', APP_NAME);
		meta.set('version', '1.0');
		const lists = snapshot.getMap('card_lists');
		const list = new Y.Map();
		list.set('name', 'Commander');
		list.set('cards', new Y.Map());
		lists.set('Commander', list);

		expect(() => parseImportFile(Y.encodeStateAsUpdate(snapshot))).toThrow(/version 1\.0/);
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
	it('accepts a current document export and reports its metadata', () => {
		const data = documentExport({
			app: APP_NAME,
			version: CURRENT_VERSION,
			lists: [{ name: 'Commander' }],
			cards: [{ id: 'id-bolt', name: 'Lightning Bolt' }]
		});

		const payload = parseImportFile(data);

		expect(payload.format).toBe('document');
		expect(payload.app).toBe(APP_NAME);
		expect(payload.version).toBe(CURRENT_VERSION);
		expect(payload.exportedAt).toBe(1_755_000_000_000);
		expect(payload.cardLists).toHaveLength(1);
		expect(payload.collection).toHaveLength(1);
	});

	it('reports the lineage, which is what decides merge from union (C4)', () => {
		const payload = parseImportFile(
			documentExport({
				app: APP_NAME,
				version: CURRENT_VERSION,
				guid: 'known-lineage',
				lists: [{ name: 'Commander' }]
			})
		);

		expect(payload.guid).toBe('known-lineage');
	});

	it('reports no lineage for a plain-JSON payload, which has none', () => {
		const payload = parseImportFile(encode({ app: APP_NAME, cardLists: [{ name: 'Deck' }] }));

		expect(payload.guid).toBeNull();
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

	it('carries no declared counts for a document, which cannot be truncated silently', () => {
		// A truncated Yjs update fails to decode, which the guard turns into
		// "unrecognised format" — the declared-count check belongs to the JSON
		// path, where a file really can lie about what it holds.
		const payload = parseImportFile(
			documentExport({ app: APP_NAME, version: CURRENT_VERSION, lists: [{ name: 'Commander' }] })
		);

		expect(payload.declaredLists).toBeNull();
		expect(payload.cardLists).toHaveLength(1);
	});
});

describe('parseImportFile — declared counts guard truncation', () => {
	it('rejects a file that declares more lists than it carries', () => {
		const data = encode({
			app: APP_NAME,
			cardLists: [{ name: 'Commander' }],
			total_lists: 4
		});

		expect(() => parseImportFile(data)).toThrow(/declares 4 card lists but contains 1/);
	});

	it('rejects a file that declares more collection cards than it carries', () => {
		const data = encode({
			app: APP_NAME,
			collection: [{ id: 'id-bolt', name: 'Lightning Bolt' }],
			total_cards: 312
		});

		expect(() => parseImportFile(data)).toThrow(/declares 312 collection cards but contains 1/);
	});

	it('accepts a file whose declared counts match', () => {
		const data = encode({
			app: APP_NAME,
			cardLists: [{ name: 'Commander' }],
			collection: [{ id: 'id-bolt', name: 'Lightning Bolt' }],
			total_lists: 1,
			total_cards: 1
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
			documentExport({
				app: APP_NAME,
				version: CURRENT_VERSION,
				lists: [{ name: 'Commander' }, { name: 'Modern' }],
				cards: [{ id: 'id-bolt', name: 'Lightning Bolt' }]
			})
		);

		const summary = describeImport(payload);

		expect(summary).toContain(`${APP_NAME} v${CURRENT_VERSION}`);
		expect(summary).toContain('2 lists, 1 collection card');
	});

	it('labels a file with no app metadata as a legacy export', () => {
		const payload = parseImportFile(encode({ cardLists: [{ name: 'Legacy' }] }));

		expect(describeImport(payload)).toContain('Legacy export');
		expect(describeImport(payload)).toContain('1 list, 0 collection cards');
	});
});

describe('the .json share envelope (#91, T2b)', () => {
	function envelope(options: {
		app?: string;
		version?: string;
		guid?: string;
		lists?: { name: string }[];
	}): Uint8Array {
		const rawUpdate = documentExport({
			app: APP_NAME,
			version: CURRENT_VERSION,
			guid: options.guid,
			lists: options.lists
		});
		const json = buildShareEnvelope(rawUpdate, {
			app: options.app ?? APP_NAME,
			guid: options.guid ?? 'envelope-guid',
			schemaVersion: options.version ?? CURRENT_VERSION
		});
		return new TextEncoder().encode(json);
	}

	it('decodes to the same document payload a raw .ydelta would', () => {
		const payload = parseImportFile(
			envelope({ guid: 'shared-guid', lists: [{ name: 'Shared Deck' }] })
		);

		expect(payload.format).toBe('document');
		expect(payload.guid).toBe('shared-guid');
		expect(payload.cardLists.map((l) => l.name)).toEqual(['Shared Deck']);
		expect(payload.rawUpdate).not.toBeNull();
	});

	it('rejects the envelope by its own app field, before the update is ever decoded', () => {
		expect(() => parseImportFile(envelope({ app: 'Some Other App' }))).toThrow(
			ImportValidationError
		);
	});

	it('rejects the envelope by its own schema_version', () => {
		expect(() => parseImportFile(envelope({ version: '999' }))).toThrow(ImportValidationError);
	});

	it('rejects a corrupt base64 update', () => {
		const json = JSON.stringify({
			app: APP_NAME,
			schema_version: CURRENT_VERSION,
			guid: 'x',
			update: '***not base64***'
		});
		expect(() => parseImportFile(new TextEncoder().encode(json))).toThrow(ImportValidationError);
	});

	it('still reads the legacy plain-JSON shape, which carries no update field', () => {
		const payload = parseImportFile(encode({ app: APP_NAME, cardLists: [{ name: 'Plain' }] }));
		expect(payload.format).toBe('json');
		expect(payload.rawUpdate).toBeNull();
	});
});
