/**
 * The document model (#47, M1).
 *
 * The tests that matter here are the ones the snapshot format could never pass:
 * a deletion propagating, two replicas converging without either clobbering the
 * other, and a rename staying a rename.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as Y from 'yjs';
import {
	APP_NAME,
	DOC_SCHEMA_VERSION,
	applyRemoteUpdate,
	attachPersistence,
	createDocument,
	destroyPersistence,
	createList,
	isEmptyChange,
	observeDocument,
	observeIncoming,
	peekPayload,
	readCollection,
	readList,
	readLists,
	readMeta,
	removeCollectionCard,
	removeList,
	removeListCard,
	seedDocument,
	setCollectionQuantity,
	setListCardQuantity,
	stateVector,
	updateFor,
	updateList,
	upsertCollectionCard,
	upsertListCard,
	type IncomingChange
} from '../ydoc';

const BOLT = {
	id: 'bolt-1',
	name: 'Lightning Bolt',
	set: 'lea',
	collector_number: '161',
	lang: 'en',
	mana_cost: '{R}',
	type_line: 'Instant',
	// Facts that must never reach the document — they are refetchable (#84).
	image_uris: { small: 'https://cards.scryfall.io/small/bolt.jpg' },
	legalities: { modern: 'legal' },
	oracle_text: 'Lightning Bolt deals 3 damage to any target.'
};

const BRAINSTORM = { id: 'brainstorm-1', name: 'Brainstorm', set: 'ice', mana_cost: '{U}' };

/** Two replicas of one lineage, as a file exchange would produce. */
function replicate(source: Y.Doc): Y.Doc {
	const replica = createDocument(source.guid);
	applyRemoteUpdate(replica, updateFor(source), 'file');
	return replica;
}

/** Bring `a` and `b` into agreement, both directions, the way the port does. */
function sync(a: Y.Doc, b: Y.Doc): void {
	const fromA = updateFor(a, stateVector(b));
	const fromB = updateFor(b, stateVector(a));
	applyRemoteUpdate(b, fromA, 'file');
	applyRemoteUpdate(a, fromB, 'file');
}

describe('identity', () => {
	it('stamps the schema, the app and its own guid into the document', () => {
		const doc = createDocument();
		const meta = readMeta(doc);

		expect(meta.schema_version).toBe(DOC_SCHEMA_VERSION);
		expect(meta.app).toBe(APP_NAME);
		// Inside as well as out: an update does not carry the guid, so without this
		// a file would have no lineage and C4 could not classify it.
		expect(meta.guid).toBe(doc.guid);
	});

	it('reopens the same lineage from a persisted guid', () => {
		const first = createDocument();
		const reopened = createDocument(first.guid);
		expect(readMeta(reopened).guid).toBe(first.guid);
	});

	it('gives each session its own clientID even on one lineage', () => {
		const doc = createDocument('shared-guid');
		const other = createDocument('shared-guid');
		// Sharing a clientID causes order-dependent data loss; sharing a guid does not.
		expect(doc.clientID).not.toBe(other.clientID);
	});
});

describe('the whitelist', () => {
	it('admits the authored fields and drops Scryfall’s facts', () => {
		const doc = createDocument();
		upsertCollectionCard(doc, BOLT, 4);

		const [card] = readCollection(doc) as unknown as Record<string, unknown>[];
		expect(card.name).toBe('Lightning Bolt');
		expect(card.mana_cost).toBe('{R}');
		expect(card.quantity_owned).toBe(4);

		expect(card.image_uris).toBeUndefined();
		expect(card.legalities).toBeUndefined();
		expect(card.oracle_text).toBeUndefined();
	});

	it('does not rewrite unchanged fields when a quantity moves', () => {
		const doc = createDocument();
		upsertCollectionCard(doc, BOLT, 1);
		const afterFirst = updateFor(doc).byteLength;

		setCollectionQuantity(doc, BOLT.id, 2);
		const afterQuantity = updateFor(doc).byteLength;

		// A quantity bump costs one item, not a re-assertion of the whole card.
		expect(afterQuantity - afterFirst).toBeLessThan(40);
	});
});

describe('lists are keyed by uuid', () => {
	it('keeps identity across a rename', () => {
		const doc = createDocument();
		const id = createList(doc, 'Burn');
		upsertListCard(doc, id, BOLT, 4);

		updateList(doc, id, { name: 'Modern Burn' });

		const lists = readLists(doc);
		expect(lists).toHaveLength(1);
		expect(lists[0].id).toBe(id);
		expect(lists[0].name).toBe('Modern Burn');
		expect(lists[0].cards).toHaveLength(1);
	});

	it('a rename on one replica does not duplicate the list on the other', () => {
		const local = createDocument();
		const id = createList(local, 'Burn');
		const remote = replicate(local);

		updateList(local, id, { name: 'Modern Burn' });
		sync(local, remote);

		// Name-keyed, this was a delete plus a create — two decks, one of them empty.
		expect(readLists(remote)).toHaveLength(1);
		expect(readLists(remote)[0].name).toBe('Modern Burn');
	});

	it('two lists may share a name and stay distinct', () => {
		const doc = createDocument();
		const a = createList(doc, 'Burn');
		const b = createList(doc, 'Burn');
		expect(a).not.toBe(b);
		expect(readLists(doc)).toHaveLength(2);
	});
});

describe('convergence', () => {
	it('propagates a deletion — the thing snapshots could never do', () => {
		const pc = createDocument();
		const id = createList(pc, 'Deck 1');
		upsertListCard(pc, id, BOLT, 4);
		upsertListCard(pc, id, BRAINSTORM, 2);

		const phone = replicate(pc);
		expect(readList(phone, id)!.cards).toHaveLength(2);

		removeListCard(phone, id, BRAINSTORM.id);
		sync(pc, phone);

		// Under the old snapshot union, brainstorm lived on the PC forever.
		expect(readList(pc, id)!.cards.map((c) => c.id)).toEqual([BOLT.id]);
	});

	it('converges disjoint offline edits in both directions', () => {
		const pc = createDocument();
		const id = createList(pc, 'Deck 1');
		upsertListCard(pc, id, BOLT, 4);
		const phone = replicate(pc);

		upsertListCard(pc, id, BRAINSTORM, 1);
		upsertListCard(phone, id, { id: 'swords-1', name: 'Swords to Plowshares' }, 1);

		sync(pc, phone);

		const onPc = readList(pc, id)!
			.cards.map((c) => c.id)
			.sort();
		const onPhone = readList(phone, id)!
			.cards.map((c) => c.id)
			.sort();
		expect(onPc).toEqual(['bolt-1', 'brainstorm-1', 'swords-1']);
		expect(onPhone).toEqual(onPc);
	});

	it('a deleted list stays deleted after a later exchange', () => {
		const a = createDocument();
		const id = createList(a, 'Doomed');
		const b = replicate(a);

		removeList(a, id);
		sync(a, b);
		sync(a, b); // a tombstone is not a value that can be reasserted

		expect(readLists(b)).toHaveLength(0);
		expect(readLists(a)).toHaveLength(0);
	});
});

describe('quantities are LWW registers, not counters', () => {
	it('two replicas both asserting "I own 4" yield 4, never 8', () => {
		const home = createDocument();
		upsertCollectionCard(home, BOLT, 0);
		const laptop = replicate(home);

		setCollectionQuantity(home, BOLT.id, 4);
		setCollectionQuantity(laptop, BOLT.id, 4);
		sync(home, laptop);

		expect(readCollection(home)[0].quantity_owned).toBe(4);
		expect(readCollection(laptop)[0].quantity_owned).toBe(4);
	});

	it('a causally ordered edit wins, which is the case a live channel creates', () => {
		const a = createDocument();
		upsertCollectionCard(a, BOLT, 1);
		const b = replicate(a);

		setCollectionQuantity(a, BOLT.id, 2);
		sync(a, b); // b has now seen a's edit
		setCollectionQuantity(b, BOLT.id, 7);
		sync(a, b);

		expect(readCollection(a)[0].quantity_owned).toBe(7);
	});

	it('concurrent edits converge on one value, whichever it is', () => {
		const a = createDocument();
		upsertCollectionCard(a, BOLT, 1);
		const b = replicate(a);

		setCollectionQuantity(a, BOLT.id, 3);
		setCollectionQuantity(b, BOLT.id, 9);
		sync(a, b);

		// The winner is arbitrary by design (the higher clientID, not the later
		// clock) — what is not negotiable is that both sides agree.
		expect(readCollection(a)[0].quantity_owned).toBe(readCollection(b)[0].quantity_owned);
		expect([3, 9]).toContain(readCollection(a)[0].quantity_owned);
	});
});

describe('the transport port', () => {
	it('sends only what the peer is missing', () => {
		const a = createDocument();
		for (let i = 0; i < 50; i++) {
			upsertCollectionCard(a, { id: `card-${i}`, name: `Card ${i}` }, 1);
		}
		const b = replicate(a);

		upsertCollectionCard(a, BOLT, 4);

		const diff = updateFor(a, stateVector(b));
		const whole = updateFor(a);
		expect(diff.byteLength).toBeLessThan(whole.byteLength / 5);
	});

	it('keeps the state vector small enough for a QR code', () => {
		const doc = createDocument();
		upsertCollectionCard(doc, BOLT, 1);
		expect(stateVector(doc).byteLength).toBeLessThan(32);
	});

	it('classifies a payload by lineage without touching the live document', () => {
		const mine = createDocument();
		createList(mine, 'Burn');
		upsertCollectionCard(mine, BOLT, 4);

		const sameLineage = peekPayload(updateFor(replicate(mine)));
		expect(sameLineage.guid).toBe(mine.guid);
		expect(sameLineage.app).toBe(APP_NAME);
		expect(sameLineage.listCount).toBe(1);
		expect(sameLineage.collectionCount).toBe(1);

		const stranger = createDocument();
		createList(stranger, "A friend's deck");
		expect(peekPayload(updateFor(stranger)).guid).not.toBe(mine.guid);
	});
});

describe('seeding', () => {
	it('fills an empty document from plain arrays', () => {
		const doc = createDocument();
		seedDocument(doc, {
			collection: [{ id: BOLT.id, name: BOLT.name, quantity_owned: 3 }],
			cardLists: [
				{
					id: 7 as unknown as string, // a legacy autoIncrement key
					name: 'Old Deck',
					cards: [{ id: BRAINSTORM.id, name: BRAINSTORM.name, LM_quantity: 2 }],
					cardMatching: 'generic',
					languageMatching: 'any',
					created_at: 1,
					updated_at: 2
				}
			]
		});

		expect(readCollection(doc)[0].quantity_owned).toBe(3);
		const [list] = readLists(doc);
		expect(list.name).toBe('Old Deck');
		expect(list.cards[0].LM_quantity).toBe(2);
		// A numeric key is not portable; it gets a UUID on the way in.
		expect(typeof list.id).toBe('string');
		expect(list.id).not.toBe('7');
	});
});

describe('observation', () => {
	it('coalesces a burst of writes into one rebuild', async () => {
		const doc = createDocument();
		const onChange = vi.fn();
		const stop = observeDocument(doc, onChange);

		const id = createList(doc, 'Import');
		for (let i = 0; i < 50; i++) {
			upsertListCard(doc, id, { id: `c-${i}`, name: `Card ${i}` }, 1);
		}

		expect(onChange).not.toHaveBeenCalled(); // still inside the same task
		await Promise.resolve();
		expect(onChange).toHaveBeenCalledTimes(1);

		stop();
	});

	it('stops reporting once detached', async () => {
		const doc = createDocument();
		const onChange = vi.fn();
		observeDocument(doc, onChange)();

		createList(doc, 'Ignored');
		await Promise.resolve();
		expect(onChange).not.toHaveBeenCalled();
	});
});

describe('persistence', () => {
	// A distinct name per test: y-indexeddb keeps its own database, and a shared
	// one would carry state between cases.
	let dbName = '';

	afterEach(async () => {
		if (dbName) await destroyPersistence(dbName);
		dbName = '';
	});

	it('replays the document into a fresh session', async () => {
		dbName = `ydoc-test-${crypto.randomUUID()}`;

		const first = createDocument();
		const guid = first.guid;
		const provider = attachPersistence(first, dbName);
		await provider.whenSynced;

		const listId = createList(first, 'Burn');
		upsertListCard(first, listId, BOLT, 4);
		upsertCollectionCard(first, BRAINSTORM, 2);
		await provider.whenSynced;
		await provider.destroy();

		// A new tab tomorrow: same lineage, new clientID, no file involved.
		const second = createDocument(guid);
		const reopened = attachPersistence(second, dbName);
		await reopened.whenSynced;

		expect(second.guid).toBe(guid);
		expect(readLists(second).map((l) => l.name)).toEqual(['Burn']);
		expect(readList(second, listId)!.cards[0].LM_quantity).toBe(4);
		expect(readCollection(second)[0].quantity_owned).toBe(2);

		await reopened.destroy();
	});

	it('keeps its own database, separate from LMdecktools', async () => {
		dbName = `ydoc-test-${crypto.randomUUID()}`;

		const doc = createDocument();
		const provider = attachPersistence(doc, dbName);
		await provider.whenSynced;
		createList(doc, 'Burn');
		await provider.whenSynced;

		// The note that matters for db.ts: checkLocalDatabase(), clearDatabase()
		// and the DB modal all assume one database, and there are now two.
		const names = (await indexedDB.databases()).map((d) => d.name);
		expect(names).toContain(dbName);
		expect(dbName).not.toBe('LMdecktools');

		await provider.destroy();
	});
});

describe('telling the user what changed', () => {
	/** Everything reported while `run` applies remote updates to `doc`. */
	function capture(doc: Y.Doc, run: () => void): IncomingChange[] {
		const changes: IncomingChange[] = [];
		const stop = observeIncoming(doc, (c) => changes.push(c));
		run();
		stop();
		return changes;
	}

	it('says nothing about the user’s own edits', () => {
		const doc = createDocument();
		const changes = capture(doc, () => {
			const id = createList(doc, 'Mine');
			upsertListCard(doc, id, BOLT, 4);
		});
		expect(changes).toEqual([]);
	});

	it('counts additions, removals and net copies from elsewhere', () => {
		const local = createDocument();
		const id = createList(local, 'Deck 1');
		upsertListCard(local, id, BOLT, 4);
		upsertListCard(local, id, BRAINSTORM, 2);

		const remote = replicate(local);
		removeListCard(remote, id, BRAINSTORM.id);
		upsertListCard(remote, id, { id: 'ponder-1', name: 'Ponder' }, 3);
		setListCardQuantity(remote, id, BOLT.id, 1);

		const [change] = capture(local, () => {
			applyRemoteUpdate(local, updateFor(remote, stateVector(local)), 'file');
		});

		expect(change.origin).toBe('file');
		expect(change.listsChanged).toEqual(['Deck 1']);
		expect(change.cardsAdded).toBe(1);
		// The class of change the app has never been able to produce, so the one
		// users will not expect.
		expect(change.cardsRemoved).toBe(1);
		expect(change.quantitiesChanged).toBe(1);
		expect(change.netCopies).toBe(-3);
		expect(isEmptyChange(change)).toBe(false);
	});

	it('counts collection changes and whole lists arriving', () => {
		const local = createDocument();
		upsertCollectionCard(local, BOLT, 4);
		const remote = replicate(local);

		createList(remote, 'Arrived From Elsewhere');
		upsertCollectionCard(remote, BRAINSTORM, 2);
		setCollectionQuantity(remote, BOLT.id, 1);
		removeCollectionCard(remote, 'nothing-here');

		const [change] = capture(local, () => {
			applyRemoteUpdate(local, updateFor(remote, stateVector(local)), 'peer');
		});

		expect(change.listsAdded).toBe(1);
		expect(change.collectionAdded).toBe(1);
		expect(change.collectionQuantitiesChanged).toBe(1);
		expect(change.listsChanged).toEqual(['Arrived From Elsewhere']);
	});

	it('reports a list deleted elsewhere', () => {
		const local = createDocument();
		const id = createList(local, 'Doomed');
		const remote = replicate(local);

		removeList(remote, id);

		const [change] = capture(local, () => {
			applyRemoteUpdate(local, updateFor(remote, stateVector(local)), 'file');
		});

		expect(change.listsRemoved).toBe(1);
	});
});
