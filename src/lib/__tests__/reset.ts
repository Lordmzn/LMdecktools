/**
 * Wipe everything this browser holds, between tests.
 *
 * There are **two** databases since #47 — `LMdecktools` for device-local state
 * and the one `y-indexeddb` opens for the document — and deleting only the
 * first leaves the previous test's lists and collection to be replayed into the
 * next one. That is the same one-database assumption the design doc flagged in
 * `checkLocalDatabase()` and `clearDatabase()`, and it fails just as quietly
 * here as it would in the app.
 */
import { DOC_PERSISTENCE_NAME } from '../ydoc';

function drop(name: string): Promise<void> {
	return new Promise((resolve) => {
		const request = indexedDB.deleteDatabase(name);
		request.onsuccess = () => resolve();
		request.onerror = () => resolve();
		request.onblocked = () => resolve();
	});
}

/** Delete both databases. Call after closing the store, or the delete blocks. */
export async function resetDatabases(): Promise<void> {
	await drop('LMdecktools');
	await drop(DOC_PERSISTENCE_NAME);
}
