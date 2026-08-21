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
import { resetDatabases } from './reset';
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

const {
	initDB,
	closeDB,
	linkFile,
	unlinkFile,
	mergeFromFile,
	previewMergeFromFile,
	importDatabase,
	store
} = await import('../store.svelte');
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

/**
 * A file from **another device's lineage** — a fresh guid every time, which is
 * what makes it the union path rather than the sync path (C4). That is the case
 * this file exists for: #46 was a union that deleted local-only records.
 */
function snapshot(cardLists: CardList[], collection: CollectionCard[]): Uint8Array {
	const foreign = createDocument();
	seedDocument(foreign, {
		// Ids and creation order spelled out: a `Y.Map` has none of its own, so
		// `readLists()` orders by `created_at` and falls back to the id — and two
		// fixtures made in the same millisecond would otherwise come back in an
		// arbitrary order.
		cardLists: cardLists.map((list, i) => ({
			...list,
			id: list.id ?? `remote-${i}`,
			created_at: i
		})),
		collection
	});
	return updateFor(foreign);
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

/**
 * Put the local document into a known state, through the real import path —
 * there are no object stores to write behind the app's back any more.
 */
async function seedLocal(cardLists: CardList[], collection: CollectionCard[]): Promise<void> {
	if (cardLists.length === 0 && collection.length === 0) return;
	// Through the store's own connection: a second one to `LMdecktools` would
	// keep the afterEach `deleteDatabase()` blocked, and everything after it
	// would queue behind a delete that never lands.
	await importDatabase(snapshot(cardLists, collection), true);
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
		await closeDB();
		store.dbMode = 'none';
		store.savedCardLists = [];
		store.collection = [];
		await resetDatabases();
	});

	/** Seed local state and link a file holding the remote snapshot, without merging. */
	async function linkWith(
		local: { lists: CardList[]; collection: CollectionCard[] },
		remote: { lists: CardList[]; collection: CollectionCard[] }
	): Promise<void> {
		await initDB();
		await seedLocal(local.lists, local.collection);

		mockPickAndLinkNewFile.mockResolvedValue(makeHandle(snapshot(remote.lists, remote.collection)));
		await linkFile();
	}

	/** Seed local state, link a file holding the remote snapshot, then merge. */
	async function mergeInto(
		local: { lists: CardList[]; collection: CollectionCard[] },
		remote: { lists: CardList[]; collection: CollectionCard[] }
	): Promise<void> {
		await linkWith(local, remote);
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

	it('keeps list identity stable for lists that survive the merge', async () => {
		await linkWith(
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
		const deckAId = listByName('Deck A').id;
		await mergeFromFile();

		// The local list keeps the UUID it has always had, and the remote-only list
		// gets a fresh one rather than reusing the foreign document's (#47).
		expect(listByName('Deck A').id).toBe(deckAId);
		expect(listByName('Remote Deck').id).toBeTypeOf('string');
		expect(listByName('Remote Deck').id).not.toBe(deckAId);
	});

	/**
	 * The dry run behind the preview modal (#77). It has to describe the same
	 * merge the commit will perform, and it has to leave the database alone.
	 */
	describe('previewMergeFromFile', () => {
		it('describes the collection and each affected list without writing anything', async () => {
			await linkWith(
				{
					lists: [
						makeCardList({
							name: 'Atraxa',
							cards: [{ id: 'bolt', name: 'Bolt', LM_quantity: 1 }]
						})
					],
					collection: [{ id: 'bolt', name: 'Bolt', quantity_owned: 2 }]
				},
				{
					lists: [
						makeCardList({
							name: 'Atraxa',
							cards: [
								{ id: 'bolt', name: 'Bolt', LM_quantity: 2 },
								{ id: 'counter', name: 'Counterspell', LM_quantity: 3 }
							]
						}),
						makeCardList({
							name: 'Modern Burn',
							cards: [{ id: 'guide', name: 'Goblin Guide', LM_quantity: 4 }]
						})
					],
					collection: [
						{ id: 'bolt', name: 'Bolt', quantity_owned: 5 },
						{ id: 'counter', name: 'Counterspell', quantity_owned: 1 }
					]
				}
			);

			const preview = await previewMergeFromFile();

			expect(preview).toEqual({
				collection: { added: 4, fromNewCards: 1, removed: 0 },
				lists: [
					{
						name: 'Atraxa',
						status: 'updated',
						delta: { added: 4, fromNewCards: 3, removed: 0 },
						settingsChanged: false
					},
					{
						name: 'Modern Burn',
						status: 'added',
						delta: { added: 4, fromNewCards: 4, removed: 0 },
						settingsChanged: false
					}
				],
				unchanged: false,
				// A foreign lineage, so the union — which is why nothing is ever
				// reported as removed here (C4).
				operation: 'union'
			});

			// The dry run must not have touched the database it just described
			expect(store.savedCardLists.map((l) => l.name)).toEqual(['Atraxa']);
			expect(listByName('Atraxa').cards).toHaveLength(1);
			expect(ownedQuantity('bolt')).toBe(2);
		});

		it('reports a snapshot that holds nothing new as unchanged', async () => {
			await linkWith(
				{
					lists: [
						makeCardList({ name: 'Atraxa', cards: [{ id: 'bolt', name: 'Bolt', LM_quantity: 4 }] })
					],
					collection: [{ id: 'bolt', name: 'Bolt', quantity_owned: 4 }]
				},
				{
					lists: [
						makeCardList({ name: 'Atraxa', cards: [{ id: 'bolt', name: 'Bolt', LM_quantity: 1 }] })
					],
					collection: [{ id: 'bolt', name: 'Bolt', quantity_owned: 1 }]
				}
			);

			expect(await previewMergeFromFile()).toEqual({
				collection: { added: 0, fromNewCards: 0, removed: 0 },
				lists: [],
				unchanged: true,
				operation: 'union'
			});
		});

		it('returns null when no file is linked', async () => {
			await initDB();
			expect(await previewMergeFromFile()).toBeNull();
		});
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
