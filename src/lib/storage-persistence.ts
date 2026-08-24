/**
 * Persistent storage — the floor under the user's data (#88).
 *
 * `navigator.storage.persist()` asks the browser to exempt this origin from
 * eviction under disk pressure. Free on Chromium, which grants it from
 * engagement heuristics with no prompt; one permission prompt on Firefox;
 * best-effort on WebKit, where the grant does not survive a browser restart.
 *
 * **It buys one thing and no others.** It defends against eviction when the
 * device runs out of space. It does nothing about clearing browsing data,
 * deleting the Home Screen icon, a lost phone, a new phone, or — as far as
 * anyone has documented — WebKit's 7-day ITP timer. Most of that list is
 * unaddressable by any storage API on any platform, which is why durability in
 * this app is a copy count (D1, #90) and not a storage setting. The UI must
 * never read this as "your data is safe"; see
 * `docs/durability-convergence-transport.md` D2.
 *
 * Everything here is a pure function over an injected `StorageManager`, so the
 * rules are testable without a browser, and nothing here ever throws or blocks
 * startup: a browser without the API gets the app unchanged.
 */

/**
 * The parts of `navigator.storage` this module reads. A structural type rather
 * than the DOM's `StorageManager` so a test can hand over two functions, and so
 * the three optional members model the browsers that implement only some of
 * them (WebKit shipped `estimate()` long before `persist()`).
 */
export interface StorageManagerLike {
	persist?: () => Promise<boolean>;
	persisted?: () => Promise<boolean>;
	estimate?: () => Promise<{ usage?: number; quota?: number }>;
}

/** What the DB modal shows. `null` numbers mean the browser would not say. */
export interface StorageReport {
	/** Whether this browser can answer at all — drives "unknown" rather than "no". */
	supported: boolean;
	/** Whether the origin's storage is exempt from eviction under disk pressure. */
	persisted: boolean;
	/** Bytes this origin holds, across IndexedDB, the Cache API and the rest. */
	usage: number | null;
	/** Bytes the browser is prepared to let it hold. */
	quota: number | null;
}

function currentStorageManager(): StorageManagerLike | null {
	if (typeof navigator === 'undefined') return null;
	return (navigator.storage as StorageManagerLike | undefined) ?? null;
}

/**
 * Ask for persistent storage, once the app has data worth keeping.
 *
 * Called from `openDocument()` on the persisting path only, and never awaited:
 * the answer changes nothing about what the app does, so it must not sit in
 * front of the first render. Preview mode does not reach it, which is the point
 * — an iOS browser tab writes nothing to the Safari container, so there is
 * nothing there to protect and no reason to prompt about it (#87).
 *
 * `persisted()` is checked first so a granted origin never asks again. On
 * Firefox that second ask is a permission prompt, and a prompt on every load is
 * how a user learns to click Deny.
 *
 * @returns whether the origin's storage is persistent afterwards.
 */
export async function requestPersistentStorage(
	manager: StorageManagerLike | null = currentStorageManager()
): Promise<boolean> {
	if (!manager?.persist) return false;

	try {
		if (manager.persisted && (await manager.persisted())) return true;
		return await manager.persist();
	} catch {
		// Insecure contexts and some private-browsing modes reject outright. The
		// app is unchanged either way; only the eviction floor is lost.
		return false;
	}
}

/**
 * What to report in the DB modal: granted or not, and usage against quota.
 *
 * Both halves degrade independently — a browser may estimate without being able
 * to persist — so a failure in one does not blank the other. `supported` is
 * false only when the browser offers neither, which is what lets the modal say
 * "unknown" instead of claiming the storage is unprotected.
 */
export async function readStorageReport(
	manager: StorageManagerLike | null = currentStorageManager()
): Promise<StorageReport> {
	const supported = Boolean(manager?.persisted || manager?.estimate);
	const report: StorageReport = { supported, persisted: false, usage: null, quota: null };
	if (!manager) return report;

	try {
		if (manager.persisted) report.persisted = await manager.persisted();
	} catch {
		report.persisted = false;
	}

	try {
		if (manager.estimate) {
			const estimate = await manager.estimate();
			report.usage = finiteBytes(estimate?.usage);
			report.quota = finiteBytes(estimate?.quota);
		}
	} catch {
		report.usage = null;
		report.quota = null;
	}

	return report;
}

/** A byte count only when the browser gave a real one — `estimate()` may omit either field. */
function finiteBytes(value: number | undefined): number | null {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
