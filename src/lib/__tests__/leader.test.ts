/**
 * Leader election over `navigator.locks` (#47, C3).
 *
 * The lock is what decides which tab owns the *exclusive resources* — the
 * linked file today, the peer connection under #11. It decides nothing about
 * identity: every tab keeps its own random `clientID`, and every tab keeps
 * editing.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { claimLeadership } from '../leader';

/**
 * A Lock Manager with the one behaviour that matters: exclusive means one
 * holder, and the next waiter is granted the moment the holder lets go.
 */
function fakeLockManager() {
	const queues = new Map<string, (() => void)[]>();
	const held = new Set<string>();

	return {
		async request(
			name: string,
			_options: { mode: string },
			callback: () => Promise<void>
		): Promise<void> {
			const run = async () => {
				held.add(name);
				try {
					await callback();
				} finally {
					held.delete(name);
					queues.get(name)?.shift()?.();
				}
			};

			if (held.has(name)) {
				await new Promise<void>((resolve) => {
					const queue = queues.get(name) ?? [];
					queue.push(resolve);
					queues.set(name, queue);
				});
			}

			return run();
		},
		isHeld: (name: string) => held.has(name)
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

/** Let the lock manager's promises settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('claimLeadership', () => {
	it('gives the lock to the first tab and makes the second wait', async () => {
		const locks = fakeLockManager();
		vi.stubGlobal('navigator', { locks });

		const first = claimLeadership();
		await settle();
		const second = claimLeadership();
		await settle();

		expect(first.isLeader).toBe(true);
		expect(second.isLeader).toBe(false);
	});

	it('promotes the waiting tab when the leader goes away', async () => {
		const locks = fakeLockManager();
		vi.stubGlobal('navigator', { locks });

		const promotions: boolean[] = [];
		const first = claimLeadership();
		await settle();
		const second = claimLeadership((isLeader) => promotions.push(isLeader));
		await settle();

		expect(second.isLeader).toBe(false);

		// The browser hands the lock over on close or crash; `release()` is the
		// same transition, and it is why nothing here polls or heartbeats.
		first.release();
		await settle();

		expect(second.isLeader).toBe(true);
		expect(promotions).toEqual([true]);
	});

	it('reports the demotion when a leader releases', async () => {
		const locks = fakeLockManager();
		vi.stubGlobal('navigator', { locks });

		const changes: boolean[] = [];
		const leader = claimLeadership((isLeader) => changes.push(isLeader));
		await settle();

		leader.release();
		await settle();

		expect(changes).toEqual([true, false]);
		expect(leader.isLeader).toBe(false);
	});

	it('leads alone where the Lock Manager is absent', async () => {
		vi.stubGlobal('navigator', {});

		const only = claimLeadership();

		// No locks means no other tab can be coordinated with, so behaving as the
		// sole tab is both the safe answer and what the app did before leaders.
		expect(only.isLeader).toBe(true);
	});

	it('survives a request the browser rejects', async () => {
		vi.stubGlobal('navigator', {
			locks: { request: () => Promise.reject(new Error('aborted')) }
		});

		const follower = claimLeadership();
		await settle();

		// A follower still edits — it just does not own the file.
		expect(follower.isLeader).toBe(false);
		expect(() => follower.release()).not.toThrow();
	});
});
