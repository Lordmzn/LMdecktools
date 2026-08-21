/**
 * The document (#47, M1).
 *
 * One long-lived `Y.Doc`, mutated in place, with a stable `guid` that identifies
 * the *database lineage* rather than the device. Everything the user authored
 * lives here; everything else — the error journal, the linked-file handle, the
 * card-facts cache — stays device-local and out of the document.
 *
 * ```
 * ydoc (guid: stable per database lineage)
 * ├── meta          Y.Map    schema_version, app, guid, created_at
 * ├── collection    Y.Map<scryfall_id, Y.Map>   quantity_owned + whitelist
 * └── card_lists    Y.Map<list_id, Y.Map>       name, matching, timestamps
 *                        cards: Y.Map<scryfall_id, Y.Map>  LM_quantity + whitelist
 * ```
 *
 * Three choices here are load-bearing, and all three are argued in
 * `docs/persistent-ydoc.md` rather than here:
 *
 * - **Maps at every level, and a `Y.Map` per card.** Order is not user-authored
 *   anywhere in this app, and a per-card map is what makes "quantity changed" a
 *   per-card operation — two replicas touching two different cards in one deck
 *   commute instead of colliding on a whole row.
 * - **Quantities are LWW scalars, never counters.** A quantity asserts the state
 *   of a physical stack of cardboard, not an accumulator: two devices each
 *   recording "I own 4 Bolt" must not yield 8 (Decision 1).
 * - **Lists are keyed by `crypto.randomUUID()`.** Name-keying makes a rename
 *   indistinguishable from delete-and-recreate, which under sync is a duplicated
 *   deck.
 *
 * This module is deliberately free of Svelte and of `db.ts`: it is the data
 * model and the transport port, and nothing above it leaks in.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import { toStoredCard, type StoredCard } from './card-fields';
import type { Card, CardList, CardMatching, CollectionCard, LanguageMatching } from './db';

/** Bumped when the shape above changes in a way a reader must know about. */
export const DOC_SCHEMA_VERSION = 2;

export const APP_NAME = 'LM Deck Tools';

/**
 * The IndexedDB database `y-indexeddb` opens — its own, separate from
 * `LMdecktools`. One per origin rather than one per guid: adopting a foreign
 * document replaces the lineage in place, so a second store would only ever
 * hold an orphan.
 */
export const DOC_PERSISTENCE_NAME = 'lmdecktools-doc';

/** Top-level keys, spelled once. */
const META = 'meta';
const COLLECTION = 'collection';
const CARD_LISTS = 'card_lists';

/**
 * Transaction origins. `local` marks an edit made in this tab, which is what
 * lets the change reporter tell "the user did this" from "this arrived from
 * somewhere else" — the distinction the whole "say what changed" requirement
 * rests on.
 */
export const LOCAL_ORIGIN = 'local';
export type ChangeOrigin = 'local' | 'file' | 'broadcast' | 'peer' | 'seed';

/** A list as the app reads it. `id` is a UUID, not the old autoIncrement key. */
export interface DocumentList {
	id: string;
	name: string;
	cards: Card[];
	cardMatching: CardMatching;
	languageMatching: LanguageMatching;
	created_at: number;
	updated_at: number;
}

export interface DocumentMeta {
	schema_version?: number;
	app?: string;
	guid?: string;
	created_at?: number;
}

// ==================== LIFECYCLE ====================

/**
 * A document with a known lineage. Pass the guid persisted in `metadata`; omit
 * it only when creating a genuinely new database, and persist what comes back.
 *
 * No `clientID` is ever passed or restored. Yjs mints a random one per session
 * and that is correct: two tabs are two replicas, and forcing them to share an
 * id causes silent, order-dependent data loss (measured — `persistent-ydoc.md`
 * "Replica identity").
 */
export function createDocument(guid?: string): Y.Doc {
	const doc = guid ? new Y.Doc({ guid }) : new Y.Doc();
	initialiseMeta(doc);
	return doc;
}

/**
 * Stamp identity into the document itself, once.
 *
 * The guid goes *inside* as well as out: `Y.encodeStateAsUpdate()` does not
 * carry it, so a file would otherwise be lineage-less and the import guard could
 * not tell a peer's document from a stranger's (C4).
 */
export function initialiseMeta(doc: Y.Doc): void {
	const meta = doc.getMap(META);
	if (meta.get('schema_version') !== undefined) return;

	doc.transact(() => {
		meta.set('schema_version', DOC_SCHEMA_VERSION);
		meta.set('app', APP_NAME);
		meta.set('guid', doc.guid);
		meta.set('created_at', Date.now());
	}, LOCAL_ORIGIN);
}

export function readMeta(doc: Y.Doc): DocumentMeta {
	const meta = doc.getMap(META);
	return {
		schema_version: meta.get('schema_version') as number | undefined,
		app: meta.get('app') as string | undefined,
		guid: (meta.get('guid') as string | undefined) ?? doc.guid,
		created_at: meta.get('created_at') as number | undefined
	};
}

/**
 * Attach IndexedDB persistence — an append-per-update log that the provider
 * compacts, rather than the O(document) rewrite that hooking `update` and
 * re-encoding the whole state would cost on every keystroke.
 *
 * Not attached in preview mode (#87): `y-indexeddb` reaches for the global
 * `indexedDB` directly, so the only way to keep an iOS browser tab from writing
 * is not to give it a provider at all.
 */
export function attachPersistence(doc: Y.Doc, name = DOC_PERSISTENCE_NAME): IndexeddbPersistence {
	return new IndexeddbPersistence(name, doc);
}

/** Discard the persisted document. The lineage goes with it. */
export async function destroyPersistence(name = DOC_PERSISTENCE_NAME): Promise<void> {
	await new Promise<void>((resolve) => {
		const request = indexedDB.deleteDatabase(name);
		request.onsuccess = () => resolve();
		request.onerror = () => resolve();
		request.onblocked = () => resolve();
	});
}

// ==================== ACCESSORS ====================

function collectionMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
	return doc.getMap(COLLECTION);
}

function listsMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
	return doc.getMap(CARD_LISTS);
}

function listCards(yList: Y.Map<unknown>): Y.Map<Y.Map<unknown>> {
	return yList.get('cards') as Y.Map<Y.Map<unknown>>;
}

/**
 * Write a value only when it differs.
 *
 * Not a micro-optimisation: every `set` is an `Item` with its own id and origin,
 * kept forever. Re-asserting a card's unchanged name on each quantity bump would
 * grow the document — and therefore every sync payload — for nothing.
 */
function setIfChanged(target: Y.Map<unknown>, key: string, value: unknown): void {
	if (value === undefined) return;
	if (target.get(key) === value) return;
	target.set(key, value);
}

/** A card as it enters the document: the whitelist, plus the one quantity. */
function writeCard(target: Y.Map<unknown>, card: unknown, quantityKey: string, quantity: number) {
	const stored = toStoredCard(card) as unknown as Record<string, unknown>;
	for (const [key, value] of Object.entries(stored)) {
		setIfChanged(target, key, value);
	}
	setIfChanged(target, quantityKey, quantity);
}

function readCard(yCard: Y.Map<unknown>, id: string): StoredCard & Record<string, unknown> {
	const card: Record<string, unknown> = {};
	yCard.forEach((value, key) => {
		card[key] = value;
	});
	card.id = id;
	return card as StoredCard & Record<string, unknown>;
}

// ==================== PROJECTIONS ====================

export function readCollection(doc: Y.Doc): CollectionCard[] {
	const out: CollectionCard[] = [];
	collectionMap(doc).forEach((yCard, id) => {
		out.push(readCard(yCard, id) as unknown as CollectionCard);
	});
	return out;
}

export function readList(doc: Y.Doc, listId: string): DocumentList | null {
	const yList = listsMap(doc).get(listId);
	return yList ? projectList(yList, listId) : null;
}

function projectList(yList: Y.Map<unknown>, id: string): DocumentList {
	const cards: Card[] = [];
	const yCards = listCards(yList);
	if (yCards) {
		yCards.forEach((yCard, cardId) => {
			cards.push(readCard(yCard, cardId) as unknown as Card);
		});
	}

	return {
		id,
		name: (yList.get('name') as string) ?? '',
		cards,
		cardMatching: (yList.get('cardMatching') as CardMatching) ?? 'generic',
		languageMatching: (yList.get('languageMatching') as LanguageMatching) ?? 'any',
		created_at: (yList.get('created_at') as number) ?? 0,
		updated_at: (yList.get('updated_at') as number) ?? 0
	};
}

/**
 * Every list, oldest first.
 *
 * A `Y.Map` has no order of its own, and the app used to lean on the insertion
 * order of an autoIncrement key. Sorting by `created_at` reproduces that without
 * making position meaningful — which it cannot be once a remote replica can
 * insert a list.
 */
export function readLists(doc: Y.Doc): DocumentList[] {
	const out: DocumentList[] = [];
	listsMap(doc).forEach((yList, id) => {
		out.push(projectList(yList, id));
	});
	return out.sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id));
}

// ==================== MUTATIONS ====================

export function upsertCollectionCard(doc: Y.Doc, card: unknown, quantityOwned: number): void {
	const id = (card as { id?: string })?.id;
	if (!id) throw new Error('A collection card needs a Scryfall id.');

	doc.transact(() => {
		const collection = collectionMap(doc);
		let yCard = collection.get(id);
		if (!yCard) {
			yCard = new Y.Map<unknown>();
			collection.set(id, yCard);
		}
		writeCard(yCard, { ...(card as object), id }, 'quantity_owned', quantityOwned);
	}, LOCAL_ORIGIN);
}

export function setCollectionQuantity(doc: Y.Doc, cardId: string, quantity: number): void {
	const yCard = collectionMap(doc).get(cardId);
	if (!yCard) return;
	doc.transact(() => setIfChanged(yCard, 'quantity_owned', quantity), LOCAL_ORIGIN);
}

export function removeCollectionCard(doc: Y.Doc, cardId: string): void {
	doc.transact(() => collectionMap(doc).delete(cardId), LOCAL_ORIGIN);
}

/** A new, empty list. Returns the UUID it will answer to for the rest of its life. */
export function createList(
	doc: Y.Doc,
	name: string,
	params?: { cardMatching?: CardMatching; languageMatching?: LanguageMatching }
): string {
	const id = crypto.randomUUID();
	const now = Date.now();

	doc.transact(() => {
		const yList = new Y.Map<unknown>();
		yList.set('name', name);
		yList.set('cardMatching', params?.cardMatching ?? 'generic');
		yList.set('languageMatching', params?.languageMatching ?? 'any');
		yList.set('created_at', now);
		yList.set('updated_at', now);
		yList.set('cards', new Y.Map<Y.Map<unknown>>());
		listsMap(doc).set(id, yList);
	}, LOCAL_ORIGIN);

	return id;
}

export function updateList(
	doc: Y.Doc,
	listId: string,
	patch: Partial<Pick<DocumentList, 'name' | 'cardMatching' | 'languageMatching'>>
): void {
	const yList = listsMap(doc).get(listId);
	if (!yList) return;

	doc.transact(() => {
		setIfChanged(yList, 'name', patch.name);
		setIfChanged(yList, 'cardMatching', patch.cardMatching);
		setIfChanged(yList, 'languageMatching', patch.languageMatching);
		yList.set('updated_at', Date.now());
	}, LOCAL_ORIGIN);
}

export function removeList(doc: Y.Doc, listId: string): void {
	doc.transact(() => listsMap(doc).delete(listId), LOCAL_ORIGIN);
}

export function upsertListCard(doc: Y.Doc, listId: string, card: unknown, quantity: number): void {
	const id = (card as { id?: string })?.id;
	if (!id) throw new Error('A list card needs a Scryfall id.');

	const yList = listsMap(doc).get(listId);
	if (!yList) return;

	doc.transact(() => {
		const cards = listCards(yList);
		let yCard = cards.get(id);
		if (!yCard) {
			yCard = new Y.Map<unknown>();
			cards.set(id, yCard);
		}
		writeCard(yCard, { ...(card as object), id }, 'LM_quantity', quantity);
		yList.set('updated_at', Date.now());
	}, LOCAL_ORIGIN);
}

export function setListCardQuantity(
	doc: Y.Doc,
	listId: string,
	cardId: string,
	quantity: number
): void {
	const yList = listsMap(doc).get(listId);
	if (!yList) return;
	const yCard = listCards(yList).get(cardId);
	if (!yCard) return;

	doc.transact(() => {
		setIfChanged(yCard, 'LM_quantity', quantity);
		yList.set('updated_at', Date.now());
	}, LOCAL_ORIGIN);
}

export function removeListCard(doc: Y.Doc, listId: string, cardId: string): void {
	const yList = listsMap(doc).get(listId);
	if (!yList) return;

	doc.transact(() => {
		listCards(yList).delete(cardId);
		yList.set('updated_at', Date.now());
	}, LOCAL_ORIGIN);
}

/**
 * Fill an empty document from plain arrays — the seed path, and the union
 * path's landing point. Not a merge: it writes what it is given.
 */
export function seedDocument(
	doc: Y.Doc,
	data: { collection?: CollectionCard[]; cardLists?: (CardList | DocumentList)[] },
	origin: ChangeOrigin = 'seed'
): void {
	doc.transact(() => {
		const collection = collectionMap(doc);
		for (const card of data.collection ?? []) {
			const yCard = collection.get(card.id) ?? new Y.Map<unknown>();
			if (!collection.get(card.id)) collection.set(card.id, yCard);
			writeCard(yCard, card, 'quantity_owned', card.quantity_owned ?? 0);
		}

		const lists = listsMap(doc);
		for (const list of data.cardLists ?? []) {
			// A list from the old numeric-keyed world has no UUID yet; one from a
			// document does, and keeping it is what preserves identity across a union.
			const id = typeof list.id === 'string' ? list.id : crypto.randomUUID();
			const yList = lists.get(id) ?? new Y.Map<unknown>();
			if (!lists.get(id)) {
				yList.set('cards', new Y.Map<Y.Map<unknown>>());
				lists.set(id, yList);
			}
			setIfChanged(yList, 'name', list.name);
			setIfChanged(yList, 'cardMatching', list.cardMatching ?? 'generic');
			setIfChanged(yList, 'languageMatching', list.languageMatching ?? 'any');
			setIfChanged(yList, 'created_at', list.created_at ?? Date.now());
			setIfChanged(yList, 'updated_at', list.updated_at ?? Date.now());

			const cards = listCards(yList);
			for (const card of list.cards ?? []) {
				const yCard = cards.get(card.id) ?? new Y.Map<unknown>();
				if (!cards.get(card.id)) cards.set(card.id, yCard);
				writeCard(yCard, card, 'LM_quantity', card.LM_quantity ?? 1);
			}
		}
	}, origin);
}

// ==================== TRANSPORT PORT (T0) ====================
//
// `IHAVE` / `SENDME`, 1986. Defined with the document model so that file, tab
// and peer transports all speak the same three calls and no file semantics ever
// leak into the store. Each transport on top is then about a hundred lines.

/** "Here is what I have." 8 bytes at one writing client, ~6 B per client after. */
export function stateVector(doc: Y.Doc): Uint8Array {
	return Y.encodeStateVector(doc);
}

/** "Here is what you are missing." Everything, when the peer's vector is unknown. */
export function updateFor(doc: Y.Doc, remoteStateVector?: Uint8Array): Uint8Array {
	return Y.encodeStateAsUpdate(doc, remoteStateVector);
}

/** "Merge it." The origin is what keeps a remote apply out of the local echo. */
export function applyRemoteUpdate(doc: Y.Doc, update: Uint8Array, origin: ChangeOrigin): void {
	Y.applyUpdate(doc, update, origin);
}

/**
 * The guid a payload claims, without touching the live document.
 *
 * This is the two-way classification C4 needs: same guid means the file is a
 * replica of this database and applying it is a *merge*; a different guid means
 * a foreign lineage that has to go through the explicit union in `merge.ts`.
 * Same bytes, different results — which is why the UI has to say which.
 */
export function peekPayload(update: Uint8Array): {
	guid?: string;
	app?: string;
	schema_version?: number;
	collectionCount: number;
	listCount: number;
} {
	const probe = new Y.Doc();
	Y.applyUpdate(probe, update);
	const meta = readMeta(probe);

	return {
		guid: meta.guid,
		app: meta.app,
		schema_version: meta.schema_version,
		collectionCount: probe.getMap(COLLECTION).size,
		listCount: probe.getMap(CARD_LISTS).size
	};
}

// ==================== OBSERVATION ====================

/**
 * Run `onChange` after any change to the document, once per microtask.
 *
 * Coalescing is what makes "rebuild the whole array" affordable: a 300-card
 * import is one rebuild, not three hundred. Rebuilding wholesale rather than
 * patching incrementally is deliberate — at this scale it is cheap, and
 * incremental patching is a source of subtle divergence bugs for a saving
 * nobody will measure.
 */
export function observeDocument(doc: Y.Doc, onChange: () => void): () => void {
	let scheduled = false;

	const handler = () => {
		if (scheduled) return;
		scheduled = true;
		queueMicrotask(() => {
			scheduled = false;
			onChange();
		});
	};

	doc.on('afterTransaction', handler);
	return () => doc.off('afterTransaction', handler);
}

/** What arrived from somewhere else, in the vocabulary `merge.ts` already uses. */
export interface IncomingChange {
	origin: ChangeOrigin;
	listsChanged: string[];
	listsAdded: number;
	listsRemoved: number;
	cardsAdded: number;
	cardsRemoved: number;
	quantitiesChanged: number;
	netCopies: number;
	collectionAdded: number;
	collectionRemoved: number;
	collectionQuantitiesChanged: number;
}

function emptyChange(origin: ChangeOrigin): IncomingChange {
	return {
		origin,
		listsChanged: [],
		listsAdded: 0,
		listsRemoved: 0,
		cardsAdded: 0,
		cardsRemoved: 0,
		quantitiesChanged: 0,
		netCopies: 0,
		collectionAdded: 0,
		collectionRemoved: 0,
		collectionQuantitiesChanged: 0
	};
}

export function isEmptyChange(change: IncomingChange): boolean {
	return (
		change.listsAdded === 0 &&
		change.listsRemoved === 0 &&
		change.cardsAdded === 0 &&
		change.cardsRemoved === 0 &&
		change.quantitiesChanged === 0 &&
		change.collectionAdded === 0 &&
		change.collectionRemoved === 0 &&
		change.collectionQuantitiesChanged === 0
	);
}

/**
 * Report what a *remote* apply changed, as it is applied.
 *
 * On apply, not on open: the counts belong to one specific incoming change, so
 * they are captured during the transaction that carries them rather than
 * recomputed later by diffing two states.
 *
 * Removals are counted deliberately and prominently. They are the one class of
 * change the app has never been able to produce, so they are the one a user will
 * not expect, and "3 cards removed elsewhere" is the sentence that prevents a
 * support question.
 */
export function observeIncoming(doc: Y.Doc, report: (change: IncomingChange) => void): () => void {
	const collection = collectionMap(doc);
	const lists = listsMap(doc);

	// One report per transaction, not one per subtree. The collection observer
	// and the list observer both fire for the same apply, and a user told twice
	// about one file pull would reasonably conclude it happened twice. Yjs runs
	// observers before `afterTransaction`, so accumulating here and flushing
	// there is exactly one incoming change per exchange.
	let pending: IncomingChange | null = null;
	const touchedLists = new Map<string, string | undefined>();

	const listName = (listId: string, deletedValue?: unknown): string | undefined => {
		const live = lists.get(listId)?.get('name');
		if (typeof live === 'string') return live;
		try {
			const was = (deletedValue as Y.Map<unknown>)?.get?.('name');
			return typeof was === 'string' ? was : undefined;
		} catch {
			// The item is gone and its content collected — the count still reports it.
			return undefined;
		}
	};

	const handler = (events: Y.YEvent<any>[], transaction: Y.Transaction) => {
		const origin = transaction.origin;
		if (origin === LOCAL_ORIGIN || origin === null || origin === undefined) return;

		const change = (pending ??= emptyChange(
			(typeof origin === 'string' ? origin : 'peer') as ChangeOrigin
		));

		for (const event of events) {
			const path = event.path;

			// collection · [] on the collection map itself
			if (event.target === collection) {
				for (const [, action] of event.changes.keys) {
					if (action.action === 'add') change.collectionAdded++;
					else if (action.action === 'delete') change.collectionRemoved++;
				}
				continue;
			}

			// collection · [cardId] — a quantity or a field on one card
			if (path.length === 1 && collection.get(path[0] as string) === event.target) {
				if (event.changes.keys.has('quantity_owned')) change.collectionQuantitiesChanged++;
				continue;
			}

			if (event.target === lists) {
				for (const [listId, action] of event.changes.keys) {
					if (action.action === 'add') change.listsAdded++;
					else if (action.action === 'delete') change.listsRemoved++;
					touchedLists.set(listId, listName(listId, action.oldValue));
				}
				continue;
			}

			// card_lists · [listId] … — anything below a list
			const listId = path[0] as string;
			if (typeof listId === 'string' && lists.has(listId)) {
				touchedLists.set(listId, listName(listId));

				// card_lists · [listId, 'cards'] — cards added to or removed from it
				if (path.length === 2 && path[1] === 'cards') {
					for (const [, action] of event.changes.keys) {
						if (action.action === 'add') change.cardsAdded++;
						else if (action.action === 'delete') change.cardsRemoved++;
					}
				}

				// card_lists · [listId, 'cards', cardId] — a quantity on one card
				if (path.length === 3 && path[1] === 'cards') {
					const quantity = event.changes.keys.get('LM_quantity');
					if (quantity) {
						change.quantitiesChanged++;
						const before = (quantity.oldValue as number) ?? 0;
						const after = (event.target as Y.Map<unknown>).get('LM_quantity') as number;
						change.netCopies += (after ?? 0) - before;
					}
				}
			}
		}
	};

	const flush = () => {
		if (!pending) return;

		const change = pending;
		change.listsChanged = [...touchedLists.values()].filter(
			(name): name is string => typeof name === 'string' && name.length > 0
		);

		pending = null;
		touchedLists.clear();

		if (!isEmptyChange(change)) report(change);
	};

	collection.observeDeep(handler);
	lists.observeDeep(handler);
	doc.on('afterTransaction', flush);

	return () => {
		collection.unobserveDeep(handler);
		lists.unobserveDeep(handler);
		doc.off('afterTransaction', flush);
	};
}
