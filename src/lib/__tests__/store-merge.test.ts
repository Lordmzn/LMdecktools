/**
 * Reloading a linked file after an external change must never shrink the local
 * database (#46).
 *
 * The regression: `mergeFromFile()` cleared both object stores and re-added
 * only what the remote snapshot contained, so every local-only list, card and
 * collection entry was destroyed on the first reload from a second device.
 *
 * Only the file picker and polling are mocked — the merge, the IndexedDB
 * writes and the Yjs snapshot round-trip are the real implementations.
 * Kept separate from the other store tests to avoid vi.mock conflicts.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import type { CardList, CollectionCard } from '../db';

const mockPickAndLinkNewFile = vi.fn();

vi.mock('../linked-file', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../linked-file')>();
	return {
		...actual,
		pickAndLinkNewFile: mockPickAndLinkNewFile,
		startPolling: vi.fn(),
		stopPolling: vi.fn()
	};
});

const { initDB, closeDB, linkFile, unlinkFile, mergeFromFile, store } = await import(
	'../store.svelte'
);
const { openDatabase, saveCardList, saveCollectionCard } = await import('../db');
const { exportWithMetadata } = await import('../yjs-integration');

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

/** Serialize a remote database state into the linked-file snapshot format. */
function snapshot(cardLists: CardList[], collection: CollectionCard[]): Uint8Array {
	return exportWithMetadata({
		dbMode: 'active',
		dbLoaded: true,
		isReadOnly: false,
		savedCardLists: cardLists,
		collection
	});
}

/** A linked file that always reads back `data`, and swallows writes. */
function makeHandle(data: Uint8Array): FileSystemFileHandle {
	return {
		name: 'lmdecktools.yjs',
		getFile: async () => ({
			lastModified: 1234,
			arrayBuffer: async () => new Uint8Array(data).buffer
		}),
		createWritable: async () => ({
			write: vi.fn().mockResolvedValue(undefined),
			close: vi.fn().mockResolvedValue(undefined),
			abort: vi.fn().mockResolvedValue(undefined)
		})
	} as unknown as FileSystemFileHandle;
}

/** Seed the local database directly, bypassing the store's write guards. */
async function seedLocal(cardLists: CardList[], collection: CollectionCard[]): Promise<void> {
	const db = await openDatabase();
	for (const list of cardLists) await saveCardList(db, list);
	for (const card of collection) await saveCollectionCard(db, card);
	db.close();
}

function listByName(name: string): CardList {
	const list = store.savedCardLists.find((l) => l.name === name);
	expect(list, `list "${name}" is missing`).toBeDefined();
	return list!;
}

function ownedQuantity(id: string): number | undefined {
	return store.collection.find((c) => c.id === id)?.quantity_owned;
}

describe('mergeFromFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await unlinkFile();
		closeDB();
		store.dbMode = 'none';
		store.savedCardLists = [];
		store.collection = [];
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	});

	/** Seed local state, link a file holding the remote snapshot, then merge. */
	async function mergeInto(
		local: { lists: CardList[]; collection: CollectionCard[] },
		remote: { lists: CardList[]; collection: CollectionCard[] }
	): Promise<void> {
		await seedLocal(local.lists, local.collection);
		await initDB();

		mockPickAndLinkNewFile.mockResolvedValue(makeHandle(snapshot(remote.lists, remote.collection)));
		await linkFile();

		await mergeFromFile();
	}

	it('keeps local-only cards, lists and collection entries', async () => {
		await mergeInto(
			{
				lists: [
					makeCardList({
						name: 'Deck A',
						cards: [
							{ id: 'bolt', name: 'Lightning Bolt', LM_quantity: 4 },
							{ id: 'local-only', name: 'Brainstorm', LM_quantity: 2 }
						]
					}),
					makeCardList({ name: 'Local Deck' })
				],
				collection: [
					{ id: 'bolt', name: 'Lightning Bolt', quantity_owned: 4 },
					{ id: 'local-only', name: 'Brainstorm', quantity_owned: 3 }
				]
			},
			{
				lists: [
					makeCardList({
						name: 'Deck A',
						cards: [
							{ id: 'bolt', name: 'Lightning Bolt', LM_quantity: 4 },
							{ id: 'remote-only', name: 'Counterspell', LM_quantity: 1 }
						]
					})
				],
				collection: [{ id: 'remote-only', name: 'Counterspell', quantity_owned: 1 }]
			}
		);

		expect(store.savedCardLists.map((l) => l.name).sort()).toEqual(['Deck A', 'Local Deck']);
		expect(
			listByName('Deck A')
				.cards.map((c) => c.id)
				.sort()
		).toEqual(['bolt', 'local-only', 'remote-only']);

		expect(store.collection.map((c) => c.id).sort()).toEqual(['bolt', 'local-only', 'remote-only']);
		expect(ownedQuantity('local-only')).toBe(3);
	});

	it('resolves quantity conflicts to the higher count, never the file value', async () => {
		await mergeInto(
			{
				lists: [
					makeCardList({ name: 'Deck A', cards: [{ id: 'bolt', name: 'Bolt', LM_quantity: 4 }] })
				],
				collection: [{ id: 'bolt', name: 'Bolt', quantity_owned: 6 }]
			},
			{
				lists: [
					makeCardList({ name: 'Deck A', cards: [{ id: 'bolt', name: 'Bolt', LM_quantity: 1 }] })
				],
				collection: [{ id: 'bolt', name: 'Bolt', quantity_owned: 2 }]
			}
		);

		expect(listByName('Deck A').cards[0].LM_quantity).toBe(4);
		expect(ownedQuantity('bolt')).toBe(6);
	});

	it('leaves the local database intact when the file is empty', async () => {
		await mergeInto(
			{
				lists: [
					makeCardList({ name: 'Deck A', cards: [{ id: 'bolt', name: 'Bolt', LM_quantity: 4 }] })
				],
				collection: [{ id: 'bolt', name: 'Bolt', quantity_owned: 4 }]
			},
			{ lists: [], collection: [] }
		);

		expect(store.savedCardLists).toHaveLength(1);
		expect(listByName('Deck A').cards).toHaveLength(1);
		expect(store.collection).toHaveLength(1);
	});

	it('keeps IndexedDB keys stable for lists that survive the merge', async () => {
		await mergeInto(
			{ lists: [makeCardList({ name: 'Deck A' })], collection: [] },
			{
				lists: [
					makeCardList({
						name: 'Deck A',
						cards: [{ id: 'bolt', name: 'Bolt', LM_quantity: 1 }]
					}),
					makeCardList({ name: 'Remote Deck' })
				],
				collection: []
			}
		);

		// The local list keeps the id it was stored under, and the remote-only
		// list gets a fresh one rather than reusing the snapshot's.
		expect(listByName('Deck A').id).toBe(1);
		expect(listByName('Remote Deck').id).toBeTypeOf('number');
		expect(listByName('Remote Deck').id).not.toBe(1);
	});

	it('clears the external-change flag once the merge is written back', async () => {
		store.linkedFileExternalChange = true;

		await mergeInto(
			{ lists: [makeCardList({ name: 'Deck A' })], collection: [] },
			{ lists: [makeCardList({ name: 'Deck A' })], collection: [] }
		);

		expect(store.linkedFileExternalChange).toBe(false);
	});
});
