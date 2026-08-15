/**
 * Local error journal — the diagnostic context that `console.error` loses the
 * moment the console is closed (#30).
 *
 * Entries live in the `error_journal` IndexedDB store and never leave the
 * machine on their own: the only way out is the user exporting the JSON or
 * clicking "Report on GitHub" on /diagnostics, having seen exactly what goes.
 *
 * This module must not import from `store.svelte.ts` — the dependency runs one
 * way, so the journal stays testable without a rune owner.
 */

import { ERROR_JOURNAL_STORE } from './db';

export const ERROR_CATEGORIES = [
	'scryfall-api',
	'indexeddb',
	'linked-file',
	'import',
	'unhandled',
	'unknown'
] as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

export interface ErrorEntry {
	id?: number;
	timestamp: number;
	category: ErrorCategory;
	message: string;
	stack?: string;
	context?: Record<string, unknown>;
}

/** Keep the journal small enough to stay a diagnostic aid, not a second database. */
export const MAX_ENTRIES = 100;
export const MAX_AGE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

const GITHUB_ISSUE_URL = 'https://github.com/Lordmzn/LMdecktools/issues/new';

/** GitHub truncates very long URLs; keep the body well inside what a browser will send. */
const MAX_ISSUE_BODY_CHARS = 8000;

function hasJournal(db: IDBDatabase): boolean {
	return db.objectStoreNames.contains(ERROR_JOURNAL_STORE);
}

/** Normalise whatever a catch block caught into a message plus, if any, a stack. */
export function describeError(error: unknown): { message: string; stack?: string } {
	if (error instanceof Error) {
		return { message: error.message || error.name, stack: error.stack };
	}
	if (typeof error === 'string') {
		return { message: error };
	}
	try {
		return { message: JSON.stringify(error) ?? String(error) };
	} catch {
		return { message: String(error) };
	}
}

/** Drop anything IndexedDB's structured clone would choke on (functions, DOM nodes, proxies). */
function toStorableContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
	if (!context) return undefined;
	try {
		const plain = JSON.parse(JSON.stringify(context));
		return plain && typeof plain === 'object' ? plain : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Write one entry, then prune. Rejects if the store is unreachable — callers
 * that must not throw (see `logAppError`) catch and fall back to the console.
 */
export async function logError(
	db: IDBDatabase,
	category: ErrorCategory,
	error: unknown,
	context?: Record<string, unknown>
): Promise<ErrorEntry> {
	if (!hasJournal(db)) {
		throw new Error('Error journal store is not available on this database');
	}

	const { message, stack } = describeError(error);
	const storableContext = toStorableContext(context);
	const entry: ErrorEntry = {
		timestamp: Date.now(),
		category,
		message,
		...(stack ? { stack } : {}),
		...(storableContext ? { context: storableContext } : {})
	};

	const id = await new Promise<number>((resolve, reject) => {
		const transaction = db.transaction(ERROR_JOURNAL_STORE, 'readwrite');
		const store = transaction.objectStore(ERROR_JOURNAL_STORE);
		const request = store.add(entry);

		request.onsuccess = () => resolve(request.result as number);
		request.onerror = () => reject(new Error(`Failed to log error: ${request.error?.message}`));
	});

	await pruneErrorJournal(db);

	return { ...entry, id };
}

/** All entries, newest first. */
export async function loadErrorJournal(db: IDBDatabase): Promise<ErrorEntry[]> {
	if (!hasJournal(db)) return [];

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(ERROR_JOURNAL_STORE, 'readonly');
		const index = transaction.objectStore(ERROR_JOURNAL_STORE).index('timestamp');
		const request = index.getAll();

		request.onsuccess = () => resolve((request.result as ErrorEntry[]).reverse());
		request.onerror = () =>
			reject(new Error(`Failed to load error journal: ${request.error?.message}`));
	});
}

export async function clearErrorJournal(db: IDBDatabase): Promise<void> {
	if (!hasJournal(db)) return;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(ERROR_JOURNAL_STORE, 'readwrite');
		const request = transaction.objectStore(ERROR_JOURNAL_STORE).clear();

		request.onsuccess = () => resolve();
		request.onerror = () =>
			reject(new Error(`Failed to clear error journal: ${request.error?.message}`));
	});
}

/**
 * Drop entries older than `maxAgeDays`, then the oldest of whatever is left
 * until at most `maxEntries` remain. Returns how many were deleted.
 */
export async function pruneErrorJournal(
	db: IDBDatabase,
	maxEntries: number = MAX_ENTRIES,
	maxAgeDays: number = MAX_AGE_DAYS
): Promise<number> {
	if (!hasJournal(db)) return 0;

	const cutoff = Date.now() - maxAgeDays * DAY_MS;

	return new Promise((resolve, reject) => {
		const transaction = db.transaction(ERROR_JOURNAL_STORE, 'readwrite');
		const index = transaction.objectStore(ERROR_JOURNAL_STORE).index('timestamp');
		let deleted = 0;

		const countRequest = index.count();
		countRequest.onsuccess = () => {
			let surplus = Math.max(0, countRequest.result - maxEntries);

			// Ascending by timestamp: oldest first, so the walk can stop as soon as
			// an entry is both within the age limit and no longer surplus.
			const cursorRequest = index.openCursor();
			cursorRequest.onsuccess = () => {
				const cursor = cursorRequest.result;
				if (!cursor) return;

				const entry = cursor.value as ErrorEntry;
				if (surplus > 0 || entry.timestamp < cutoff) {
					cursor.delete();
					deleted++;
					if (surplus > 0) surplus--;
					cursor.continue();
				}
			};
		};

		transaction.oncomplete = () => resolve(deleted);
		transaction.onerror = () =>
			reject(new Error(`Failed to prune error journal: ${transaction.error?.message}`));
	});
}

/** The `.json` file behind the Export button on /diagnostics. */
export function exportErrorJournal(entries: ErrorEntry[]): string {
	return JSON.stringify(
		{
			app: 'LMdecktools',
			kind: 'error-journal',
			exported_at: new Date().toISOString(),
			total_entries: entries.length,
			entries
		},
		null,
		2
	);
}

function formatEntry(entry: ErrorEntry, index: number): string {
	const lines = [
		`### ${index + 1}. \`${entry.category}\` — ${new Date(entry.timestamp).toISOString()}`,
		'',
		entry.message
	];

	if (entry.context) {
		lines.push('', 'Context:', '```json', JSON.stringify(entry.context, null, 2), '```');
	}
	if (entry.stack) {
		lines.push('', 'Stack:', '```', entry.stack, '```');
	}

	return lines.join('\n');
}

/** Markdown body shown on /diagnostics before the user opens the GitHub form. */
export function formatEntriesAsMarkdown(entries: ErrorEntry[]): string {
	if (entries.length === 0) {
		return 'No errors selected.';
	}

	const header = [
		'## What happened',
		'',
		'<!-- Please describe what you were doing when this happened. -->',
		'',
		'## Environment',
		'',
		`- User agent: ${typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent}`,
		`- Reported: ${new Date().toISOString()}`,
		'',
		`## Errors (${entries.length})`,
		''
	].join('\n');

	const body = header + entries.map(formatEntry).join('\n\n');

	if (body.length <= MAX_ISSUE_BODY_CHARS) return body;

	const notice =
		'\n\n---\n\n_Truncated for the issue form — use "Export JSON" on the Diagnostics page and attach the full file._';
	return body.slice(0, MAX_ISSUE_BODY_CHARS - notice.length) + notice;
}

/** Pre-filled GitHub issue URL. Opening it is the user's explicit choice, never automatic. */
export function buildGitHubIssueUrl(entries: ErrorEntry[]): string {
	const first = entries[0];
	const title = first
		? `Error report: ${first.category} — ${first.message.slice(0, 80)}`
		: 'Error report';

	const params = new URLSearchParams({
		title,
		body: formatEntriesAsMarkdown(entries),
		labels: 'bug'
	});

	return `${GITHUB_ISSUE_URL}?${params.toString()}`;
}
