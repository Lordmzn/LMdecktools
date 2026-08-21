/**
 * Which tab owns the exclusive resources (#47, C3).
 *
 * Every tab edits freely and keeps its own `clientID` — they are replicas, and
 * that is correct. But some things must not be done by two tabs at once: the
 * linked file has one handle and one lock, and the peer connection of #11 will
 * have one socket. Those go to a leader.
 *
 * `navigator.locks` gives it for nothing. A tab requests an exclusive lock and
 * simply never releases it; the browser hands it to another tab the moment this
 * one closes or crashes, which is exactly the failover wanted and is not
 * something a hand-rolled heartbeat gets right.
 *
 * **Leader election is for exclusive resources, never for a shared identity.**
 * The `clientID` stays random per session — a shared one causes silent,
 * order-dependent data loss (`persistent-ydoc.md`, "Replica identity"), and the
 * stable per-device id that the file transport needs is a *filename*, not this.
 */

export const LEADER_LOCK = 'lmdt-leader';

export interface Leadership {
	/** True once this tab holds the lock. */
	readonly isLeader: boolean;
	/** Release the lock, handing leadership to whichever tab is waiting. */
	release(): void;
}

/**
 * Ask for leadership, and take it whenever it becomes free.
 *
 * Resolves as soon as the request is *placed*, not when it is granted — the
 * caller carries on as a follower and `onChange(true)` fires if and when this
 * tab is promoted. A browser without the Lock Manager (none of the targets, but
 * a test environment or an old WebView) is treated as the sole tab: it leads,
 * which is the behaviour the app had before leaders existed.
 */
export function claimLeadership(
	onChange: (isLeader: boolean) => void = () => {},
	lockName: string = LEADER_LOCK
): Leadership {
	let isLeader = false;
	let releaseLock: (() => void) | null = null;

	const state: Leadership = {
		get isLeader() {
			return isLeader;
		},
		release() {
			releaseLock?.();
			releaseLock = null;
			if (isLeader) {
				isLeader = false;
				onChange(false);
			}
		}
	};

	const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
	if (!locks) {
		isLeader = true;
		onChange(true);
		return state;
	}

	// The lock is held for as long as this promise is unresolved — which is until
	// `release()` or until the tab goes away. Nothing polls, and nothing has to
	// notice a crash.
	locks
		.request(lockName, { mode: 'exclusive' }, () => {
			isLeader = true;
			onChange(true);
			return new Promise<void>((resolve) => {
				releaseLock = resolve;
			});
		})
		.catch(() => {
			// An aborted or failed request leaves this tab a follower, which is safe:
			// followers still edit, they just do not own the file.
		});

	return state;
}
