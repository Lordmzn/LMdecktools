/**
 * Transport zero: the other tabs of this browser (#47, C2).
 *
 * Two tabs are one origin and one IndexedDB, but **two** `Y.Doc`s with two
 * heaps and two `clientID`s — two replicas that can edit concurrently. And
 * `y-indexeddb` does not bridge them: it reads every stored update once at
 * construction and thereafter only appends, so a second tab learns nothing
 * until it is reloaded.
 *
 * Left alone the tabs fork and reconverge on the next load, losing nothing —
 * the CRDT does its job. What they lose is *intuition*: without a live channel
 * two writes to the same key are **concurrent**, so the winner is the higher
 * clientID rather than the later edit. A `BroadcastChannel` makes them causally
 * ordered, at which point the later edit wins and the app behaves the way the
 * person using it expects.
 *
 * So this is not a nicety for live-updating a second tab. It is what converts
 * an arbitrary conflict into an intuitive one — and it puts the sync path into
 * production on day one, long before #11, where multi-tab exercises it for
 * free.
 */

import * as Y from 'yjs';
import { applyRemoteUpdate, stateVector, updateFor } from './ydoc';

export const TAB_CHANNEL = 'lmdt-doc';

/** Origin tag for anything that arrived from another tab. */
export const BROADCAST_ORIGIN = 'broadcast';

/**
 * Wire messages. Deliberately three cases and no versioning: the channel is
 * same-origin, same-build, and lives for one session.
 */
type TabMessage =
	| { type: 'update'; update: number[] }
	/** "Here is what I have — send me the rest." Also the repair request. */
	| { type: 'hello'; sv: number[] }
	/**
	 * The answer to a hello: what the asker is missing, **plus the answerer's own
	 * state vector**, so the exchange is symmetric. A one-way handshake leaves the
	 * older tab missing the newer one's history, and the next edit it receives
	 * arrives with a gap — at which point Yjs applies the update's delete set and
	 * holds the matching insert as pending, so the value does not change, it
	 * *disappears*. Measured, not theorised.
	 */
	| { type: 'catch-up'; update: number[]; sv: number[] };

export interface TabSync {
	/** Stop listening and close the channel. */
	disconnect(): void;
}

/**
 * Keep `doc` in step with the same document in every other tab.
 *
 * The handshake is the transport port, unchanged (T0): a new tab says what it
 * has, and whoever hears it sends back the difference. It is what makes a tab
 * opened mid-session correct immediately rather than at its next reload — and
 * it is the same three calls a QR-bootstrapped peer will make in #11, which is
 * the point of proving them here first.
 */
export function connectTabs(doc: Y.Doc, channelName: string = TAB_CHANNEL): TabSync {
	if (typeof BroadcastChannel === 'undefined') {
		// Every target platform has it; a missing one degrades to what the app did
		// before this existed, which is fork-and-reconverge-on-reload.
		return { disconnect() {} };
	}

	const channel = new BroadcastChannel(channelName);

	const post = (message: TabMessage) => {
		try {
			channel.postMessage(message);
		} catch {
			// A closed channel during teardown is not worth a journal entry.
		}
	};

	// Local edits go out; anything that arrived from another tab does not go
	// straight back, or two tabs ping-pong one update forever.
	const onUpdate = (update: Uint8Array, origin: unknown) => {
		if (origin === BROADCAST_ORIGIN) return;
		post({ type: 'update', update: [...update] });
	};

	/**
	 * Did that apply leave a hole?
	 *
	 * Yjs buffers structs whose causal predecessors are missing, so an update can
	 * land partially — deletes applied, inserts held back. Asking again is the
	 * repair: the answer is computed from this tab's state vector, so it contains
	 * exactly the missing range.
	 */
	const repairIfIncomplete = () => {
		if (doc.store.pendingStructs) post({ type: 'hello', sv: [...stateVector(doc)] });
	};

	const onMessage = (event: MessageEvent<TabMessage>) => {
		const message = event.data;
		if (!message) return;

		switch (message.type) {
			case 'update':
				applyRemoteUpdate(doc, new Uint8Array(message.update), BROADCAST_ORIGIN);
				repairIfIncomplete();
				break;
			case 'catch-up': {
				applyRemoteUpdate(doc, new Uint8Array(message.update), BROADCAST_ORIGIN);
				// The other half of the exchange: send back whatever *they* lack, so
				// both tabs end up complete rather than only the one that asked.
				const theirs = updateFor(doc, new Uint8Array(message.sv));
				if (theirs.byteLength > 0) post({ type: 'update', update: [...theirs] });
				break;
			}
			case 'hello': {
				// Every tab that hears a hello answers, which is redundant and
				// harmless: applying an update you already have is a no-op.
				const missing = updateFor(doc, new Uint8Array(message.sv));
				post({ type: 'catch-up', update: [...missing], sv: [...stateVector(doc)] });
				break;
			}
		}
	};

	doc.on('update', onUpdate);
	channel.addEventListener('message', onMessage);
	post({ type: 'hello', sv: [...stateVector(doc)] });

	return {
		disconnect() {
			doc.off('update', onUpdate);
			channel.removeEventListener('message', onMessage);
			channel.close();
		}
	};
}
