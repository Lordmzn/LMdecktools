/**
 * Two tabs are two replicas (#47, C2).
 *
 * Node's `BroadcastChannel` is the real one — two channels on the same name in
 * one process deliver to each other exactly as two tabs do — so these are the
 * actual wire messages, not a mock of them.
 *
 * Delivery is asynchronous in both, hence `settle()` rather than a bare
 * assertion after each write.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
	createDocument,
	createList,
	readCollection,
	readList,
	readLists,
	removeListCard,
	setCollectionQuantity,
	upsertCollectionCard,
	upsertListCard
} from '../ydoc';
import { connectTabs, type TabSync } from '../tab-sync';

const BOLT = { id: 'bolt-1', name: 'Lightning Bolt' };
const BRAINSTORM = { id: 'brainstorm-1', name: 'Brainstorm' };

const open: TabSync[] = [];

/** A tab: its own `Y.Doc`, its own clientID, the same lineage and channel. */
function openTab(guid: string, channel: string) {
	const doc = createDocument(guid);
	open.push(connectTabs(doc, channel));
	return doc;
}

/** Let the channel deliver. */
function settle(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 20));
}

afterEach(() => {
	for (const tab of open.splice(0)) tab.disconnect();
});

describe('tab sync', () => {
	it('carries an edit to the other tab within a tick', async () => {
		const channel = `test-${crypto.randomUUID()}`;
		const guid = crypto.randomUUID();
		const tabA = openTab(guid, channel);
		const tabB = openTab(guid, channel);
		await settle();

		const listId = createList(tabA, 'Burn');
		upsertListCard(tabA, listId, BOLT, 4);
		await settle();

		expect(readLists(tabB).map((l) => l.name)).toEqual(['Burn']);
		expect(readList(tabB, listId)!.cards[0].LM_quantity).toBe(4);
	});

	it('carries a deletion, which is the half a reload could never show', async () => {
		const channel = `test-${crypto.randomUUID()}`;
		const guid = crypto.randomUUID();
		const tabA = openTab(guid, channel);
		const tabB = openTab(guid, channel);

		const listId = createList(tabA, 'Burn');
		upsertListCard(tabA, listId, BOLT, 4);
		upsertListCard(tabA, listId, BRAINSTORM, 2);
		await settle();

		removeListCard(tabB, listId, BRAINSTORM.id);
		await settle();

		expect(readList(tabA, listId)!.cards.map((c) => c.id)).toEqual([BOLT.id]);
	});

	it('makes the later edit win, which is the whole point of the channel', async () => {
		const channel = `test-${crypto.randomUUID()}`;
		const guid = crypto.randomUUID();
		const tabA = openTab(guid, channel);
		const tabB = openTab(guid, channel);

		upsertCollectionCard(tabA, BOLT, 1);
		await settle();

		// With a live channel these two writes are *causally ordered*, so the
		// second one wins. Without it they would be concurrent, and the winner
		// would be the higher clientID — arbitrary, and not what a user expects.
		setCollectionQuantity(tabA, BOLT.id, 3);
		await settle();
		setCollectionQuantity(tabB, BOLT.id, 9);
		await settle();

		expect(readCollection(tabA)[0].quantity_owned).toBe(9);
		expect(readCollection(tabB)[0].quantity_owned).toBe(9);
	});

	it('catches a tab up when it opens mid-session', async () => {
		const channel = `test-${crypto.randomUUID()}`;
		const guid = crypto.randomUUID();
		const tabA = openTab(guid, channel);

		const listId = createList(tabA, 'Already Here');
		upsertListCard(tabA, listId, BOLT, 4);
		await settle();

		// The newcomer says what it has and is sent the difference — the transport
		// port, unchanged, and the same handshake a QR-bootstrapped peer will make.
		const tabB = openTab(guid, channel);
		await settle();

		expect(readLists(tabB).map((l) => l.name)).toEqual(['Already Here']);
		expect(readList(tabB, listId)!.cards[0].LM_quantity).toBe(4);
	});

	/**
	 * The bug this file's handshake exists for, and it was not theoretical.
	 *
	 * With a one-way hello the older tab never received the newcomer's history.
	 * The newcomer's next edit then arrived with a causal gap, and Yjs applied
	 * its delete set while holding the matching insert as pending — so the
	 * quantity did not change to the new value, it *vanished*.
	 */
	it('does not lose a value when the newcomer is the one that edits', async () => {
		const channel = `test-${crypto.randomUUID()}`;
		const guid = crypto.randomUUID();
		const tabA = openTab(guid, channel);

		upsertCollectionCard(tabA, BOLT, 1);
		await settle();

		const tabB = openTab(guid, channel);
		await settle();

		setCollectionQuantity(tabB, BOLT.id, 9);
		await settle();

		expect(readCollection(tabA)).toHaveLength(1);
		expect(readCollection(tabA)[0].quantity_owned).toBe(9);
		expect(readCollection(tabB)[0].quantity_owned).toBe(9);
	});

	it('does not echo what it just received', async () => {
		const channel = `test-${crypto.randomUUID()}`;
		const guid = crypto.randomUUID();
		const tabA = openTab(guid, channel);
		const tabB = openTab(guid, channel);
		await settle();

		// A third listener counts what actually goes over the wire.
		let updatesSeen = 0;
		const wiretap = new BroadcastChannel(channel);
		wiretap.onmessage = (event) => {
			if ((event.data as { type: string }).type === 'update') updatesSeen++;
		};

		upsertCollectionCard(tabA, BOLT, 1);
		await settle();

		// One update on the wire, from A. If B re-broadcast what it received, the
		// two tabs would ping-pong the same update forever.
		expect(updatesSeen).toBe(1);
		expect(readCollection(tabB)).toHaveLength(1);
		wiretap.close();
	});

	it('stops carrying anything once disconnected', async () => {
		const channel = `test-${crypto.randomUUID()}`;
		const guid = crypto.randomUUID();
		const tabA = openTab(guid, channel);
		const tabB = openTab(guid, channel);
		await settle();

		open.pop()!.disconnect(); // tabB leaves
		createList(tabA, 'After The Split');
		await settle();

		expect(readLists(tabB)).toHaveLength(0);
	});

	it('degrades to a lone tab where BroadcastChannel is absent', async () => {
		const original = globalThis.BroadcastChannel;
		// @ts-expect-error — deleting a global for the duration of the case
		delete globalThis.BroadcastChannel;

		try {
			const doc = createDocument();
			const sync = connectTabs(doc, 'never-used');
			createList(doc, 'Still Works');

			expect(readLists(doc)).toHaveLength(1);
			expect(() => sync.disconnect()).not.toThrow();
		} finally {
			globalThis.BroadcastChannel = original;
		}
	});
});
