/**
 * `importSiblingFile()` (#91, T3): reading another device's `<deviceId>.ydelta`
 * from a shared folder. Same two-way classification as every other import path
 * (C4) — this file only pins the two things specific to the sibling flow: it
 * is reachable directly (no linked-file handle involved), and a successful
 * import is recorded in the copy registry under a `sibling:` id so it never
 * collides with the device's own linked-file entry.
 *
 * Kept separate from the other store test files to avoid vi.mock conflicts.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { resetDatabases } from './reset';
import type { CardList, CollectionCard } from '../db';

const { initDB, closeDB, importSiblingFile, documentGuid, store } = await import('../store.svelte');
const { createDocument, seedDocument, updateFor } = await import('../ydoc');

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

/** A sibling replica of the local lineage — same guid, so this is the merge path. */
function siblingSnapshot(cardLists: CardList[], collection: CollectionCard[]): Uint8Array {
	const sibling = createDocument(documentGuid() ?? undefined);
	seedDocument(sibling, { cardLists, collection });
	return updateFor(sibling);
}

/** A file from a different database entirely — the union path. */
function foreignSnapshot(cardLists: CardList[], collection: CollectionCard[]): Uint8Array {
	const foreign = createDocument();
	seedDocument(foreign, { cardLists, collection });
	return updateFor(foreign);
}

describe('importSiblingFile', () => {
	afterEach(async () => {
		await closeDB();
		store.dbMode = 'none';
		store.savedCardLists = [];
		store.collection = [];
		store.copyRegistryEntries = [];
		await resetDatabases();
	});

	it('merges a same-guid sibling and records it as a copy', async () => {
		await initDB();

		const data = siblingSnapshot(
			[makeCardList({ name: 'From MacBook' })],
			[{ id: 'bolt', name: 'Lightning Bolt', quantity_owned: 4 }]
		);
		const result = await importSiblingFile(data, 'MacBook.ydelta');

		expect(result.errors).toBe(0);
		expect(store.savedCardLists.map((l) => l.name)).toContain('From MacBook');
		expect(store.collection.find((c) => c.id === 'bolt')?.quantity_owned).toBe(4);
		expect(store.copyRegistryEntries).toContainEqual(
			expect.objectContaining({ id: 'sibling:MacBook.ydelta', kind: 'linked-file' })
		);
	});

	it('unions a foreign-guid file and records it as a copy too', async () => {
		await initDB();

		const data = foreignSnapshot([makeCardList({ name: "Friend's Deck" })], []);
		await importSiblingFile(data, 'friend.ydelta');

		expect(store.savedCardLists.map((l) => l.name)).toContain("Friend's Deck");
		expect(store.copyRegistryEntries).toContainEqual(
			expect.objectContaining({ id: 'sibling:friend.ydelta' })
		);
	});

	it('keeps two siblings as distinct registry entries', async () => {
		await initDB();

		await importSiblingFile(siblingSnapshot([makeCardList({ name: 'A' })], []), 'a.ydelta');
		await importSiblingFile(siblingSnapshot([makeCardList({ name: 'B' })], []), 'b.ydelta');

		const ids = store.copyRegistryEntries.map((e) => e.id);
		expect(ids).toContain('sibling:a.ydelta');
		expect(ids).toContain('sibling:b.ydelta');
	});
});
