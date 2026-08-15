import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openDatabase } from '../db';
import {
	logError,
	loadErrorJournal,
	clearErrorJournal,
	pruneErrorJournal,
	exportErrorJournal,
	formatEntriesAsMarkdown,
	buildGitHubIssueUrl,
	describeError,
	MAX_ENTRIES,
	type ErrorEntry
} from '../error-journal';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('Error Journal', () => {
	let db: IDBDatabase;

	beforeEach(async () => {
		db = await openDatabase();
	});

	afterEach(async () => {
		db.close();
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	});

	/** Write an entry straight to the store so its timestamp can be backdated. */
	async function seed(entry: Omit<ErrorEntry, 'id'>): Promise<number> {
		return new Promise((resolve, reject) => {
			const request = db
				.transaction('error_journal', 'readwrite')
				.objectStore('error_journal')
				.add(entry);
			request.onsuccess = () => resolve(request.result as number);
			request.onerror = () => reject(request.error);
		});
	}

	describe('describeError', () => {
		it('takes message and stack from an Error', () => {
			const error = new Error('boom');
			const described = describeError(error);

			expect(described.message).toBe('boom');
			expect(described.stack).toContain('Error');
		});

		it('accepts a plain string', () => {
			expect(describeError('just text')).toEqual({ message: 'just text' });
		});

		it('serialises anything else rather than throwing', () => {
			expect(describeError({ code: 42 }).message).toBe('{"code":42}');
			expect(describeError(undefined).message).toBe('undefined');
		});
	});

	describe('logError / loadErrorJournal', () => {
		it('writes an entry and reads it back', async () => {
			await logError(db, 'scryfall-api', new Error('search failed'), { query: 'bolt' });

			const entries = await loadErrorJournal(db);
			expect(entries).toHaveLength(1);
			expect(entries[0].category).toBe('scryfall-api');
			expect(entries[0].message).toBe('search failed');
			expect(entries[0].context).toEqual({ query: 'bolt' });
			expect(entries[0].stack).toBeTypeOf('string');
			expect(entries[0].id).toBeTypeOf('number');
		});

		it('returns entries newest first', async () => {
			await seed({ timestamp: 1000, category: 'import', message: 'oldest' });
			await seed({ timestamp: 3000, category: 'import', message: 'newest' });
			await seed({ timestamp: 2000, category: 'import', message: 'middle' });

			const entries = await loadErrorJournal(db);
			expect(entries.map((e) => e.message)).toEqual(['newest', 'middle', 'oldest']);
		});

		it('drops context that cannot survive a structured clone', async () => {
			await logError(db, 'unknown', 'bad context', { fn: () => 1, ok: 'kept' } as Record<
				string,
				unknown
			>);

			const entries = await loadErrorJournal(db);
			expect(entries[0].context).toEqual({ ok: 'kept' });
		});
	});

	describe('clearErrorJournal', () => {
		it('removes every entry', async () => {
			await logError(db, 'indexeddb', 'one');
			await logError(db, 'indexeddb', 'two');

			await clearErrorJournal(db);

			expect(await loadErrorJournal(db)).toEqual([]);
		});
	});

	describe('pruneErrorJournal', () => {
		it('drops entries older than the age limit', async () => {
			const now = Date.now();
			await seed({ timestamp: now - 40 * DAY_MS, category: 'unknown', message: 'ancient' });
			await seed({ timestamp: now - 2 * DAY_MS, category: 'unknown', message: 'recent' });

			const deleted = await pruneErrorJournal(db, 100, 30);

			expect(deleted).toBe(1);
			expect((await loadErrorJournal(db)).map((e) => e.message)).toEqual(['recent']);
		});

		it('keeps only the newest maxEntries', async () => {
			const now = Date.now();
			for (let i = 0; i < 5; i++) {
				await seed({ timestamp: now + i, category: 'unknown', message: `entry-${i}` });
			}

			const deleted = await pruneErrorJournal(db, 2, 30);

			expect(deleted).toBe(3);
			expect((await loadErrorJournal(db)).map((e) => e.message)).toEqual(['entry-4', 'entry-3']);
		});

		it('runs on every write so the journal cannot grow without bound', async () => {
			const now = Date.now();
			for (let i = 0; i < MAX_ENTRIES + 5; i++) {
				await seed({
					timestamp: now - (MAX_ENTRIES + 5 - i),
					category: 'unknown',
					message: `${i}`
				});
			}

			await logError(db, 'unknown', 'the one that triggers the prune');

			const entries = await loadErrorJournal(db);
			expect(entries).toHaveLength(MAX_ENTRIES);
			expect(entries[0].message).toBe('the one that triggers the prune');
		});
	});

	describe('exportErrorJournal', () => {
		it('produces JSON carrying the entries and a count', () => {
			const entries: ErrorEntry[] = [
				{ id: 1, timestamp: 1000, category: 'import', message: 'nope' }
			];

			const parsed = JSON.parse(exportErrorJournal(entries));

			expect(parsed.app).toBe('LMdecktools');
			expect(parsed.kind).toBe('error-journal');
			expect(parsed.total_entries).toBe(1);
			expect(parsed.entries).toEqual(entries);
			expect(parsed.exported_at).toBeTypeOf('string');
		});
	});

	describe('formatEntriesAsMarkdown', () => {
		it('includes the message, context and stack of each entry', () => {
			const body = formatEntriesAsMarkdown([
				{
					id: 1,
					timestamp: Date.now(),
					category: 'linked-file',
					message: 'write failed',
					stack: 'at write()',
					context: { fileName: 'deck.yjs' }
				}
			]);

			expect(body).toContain('write failed');
			expect(body).toContain('linked-file');
			expect(body).toContain('deck.yjs');
			expect(body).toContain('at write()');
		});

		it('truncates a very long body and says where the rest is', () => {
			const entries: ErrorEntry[] = Array.from({ length: 200 }, (_, i) => ({
				id: i,
				timestamp: Date.now(),
				category: 'unknown' as const,
				message: 'x'.repeat(200)
			}));

			const body = formatEntriesAsMarkdown(entries);

			expect(body.length).toBeLessThanOrEqual(8000);
			expect(body).toContain('Export JSON');
		});
	});

	describe('buildGitHubIssueUrl', () => {
		it('points at the project issue form with a pre-filled title and body', () => {
			const url = new URL(
				buildGitHubIssueUrl([
					{ id: 1, timestamp: Date.now(), category: 'scryfall-api', message: 'search failed' }
				])
			);

			expect(url.origin + url.pathname).toBe('https://github.com/Lordmzn/LMdecktools/issues/new');
			expect(url.searchParams.get('title')).toContain('search failed');
			expect(url.searchParams.get('body')).toContain('search failed');
			expect(url.searchParams.get('labels')).toBe('bug');
		});

		it('handles an empty selection without throwing', () => {
			expect(() => buildGitHubIssueUrl([])).not.toThrow();
		});
	});
});
