/**
 * `previewPayload()` / `importDatabase()` fed a `.json` share envelope (#91,
 * T2b) rather than a raw `.ydelta`.
 *
 * This is the plumbing fix the envelope needed to actually be importable
 * through the app's existing file inputs (restore, sibling import): both
 * functions used to assume their `Uint8Array` argument was already a raw Yjs
 * update, which stopped being true the moment a JSON-wrapped one could reach
 * them. `ImportPayload.rawUpdate` is what closes that gap — this file pins
 * that the fix actually works end to end, not just that `import-guard.ts`
 * decodes the envelope correctly in isolation (`import-guard.test.ts` already
 * covers that).
 *
 * Kept separate from the other store test files to avoid vi.mock conflicts.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { resetDatabases } from './reset';
import type { CardList } from '../db';

const { initDB, closeDB, importDatabase, previewPayload, documentGuid, store } = await import(
	'../store.svelte'
);
const { createDocument, seedDocument, updateFor } = await import('../ydoc');
const { buildShareEnvelope } = await import('../share-envelope');

function makeCardList(overrides: Partial<CardList> = {}): CardList {
	return {
		name: 'Deck A',
		cards: [],
		cardMatching: 'generic',
		languageMatching: 'any',
		created_at: 1000,
		updated_at: 2000,
		...overrides
	};
}

/** A same-guid replica, wrapped as a `.json` share envelope — the merge path. */
function sharedSiblingEnvelope(listName: string): Uint8Array {
	const sibling = createDocument(documentGuid() ?? undefined);
	seedDocument(sibling, { cardLists: [makeCardList({ name: listName })] });
	const json = buildShareEnvelope(new Uint8Array(updateFor(sibling)), {
		app: 'LM Deck Tools',
		guid: documentGuid()!,
		schemaVersion: '2'
	});
	return new TextEncoder().encode(json);
}

/** A different lineage entirely, wrapped as a `.json` share envelope — the union path. */
function sharedForeignEnvelope(listName: string): Uint8Array {
	const foreign = createDocument();
	seedDocument(foreign, { cardLists: [makeCardList({ name: listName })] });
	const json = buildShareEnvelope(new Uint8Array(updateFor(foreign)), {
		app: 'LM Deck Tools',
		guid: foreign.guid,
		schemaVersion: '2'
	});
	return new TextEncoder().encode(json);
}

afterEach(async () => {
	await closeDB();
	store.dbMode = 'none';
	store.savedCardLists = [];
	store.collection = [];
	await resetDatabases();
});

describe('a .json share envelope through the ordinary import paths', () => {
	it('previews as a merge and applies through importDatabase', async () => {
		await initDB();
		const data = sharedSiblingEnvelope('Shared From Phone');

		const preview = previewPayload(data);
		expect(preview.operation).toBe('merge');

		await importDatabase(data, true);
		expect(store.savedCardLists.map((l) => l.name)).toContain('Shared From Phone');
	});

	it('previews as a union and applies through importDatabase', async () => {
		await initDB();
		const data = sharedForeignEnvelope("Friend's Shared Deck");

		const preview = previewPayload(data);
		expect(preview.operation).toBe('union');

		await importDatabase(data, true);
		expect(store.savedCardLists.map((l) => l.name)).toContain("Friend's Shared Deck");
	});
});
