/**
 * Tests for linked-file write handling at the store level: how failures map to
 * UI status, and that writes never overlap.
 *
 * Only the file picker and polling are mocked — the write path, retry logic and
 * queue are the real implementations.
 * Kept separate from store.test.ts to avoid vi.mock conflicts.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';

const mockPickAndLinkNewFile = vi.fn();

vi.mock('../linked-file', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../linked-file')>();
	return {
		...actual,
		pickAndLinkNewFile: mockPickAndLinkNewFile,
		startPolling: vi.fn(),
		stopPolling: vi.fn()
	};
});

const { linkFile, saveNow, unlinkFile, closeDB, store } = await import('../store.svelte');

type WritableMock = {
	write: ReturnType<typeof vi.fn>;
	close: ReturnType<typeof vi.fn>;
	abort: ReturnType<typeof vi.fn>;
};

function makeHandle(createWritable: ReturnType<typeof vi.fn>) {
	return { name: 'lmdecktools.yjs', createWritable } as unknown as FileSystemFileHandle;
}

function workingWritable(): WritableMock {
	return {
		write: vi.fn().mockResolvedValue(undefined),
		close: vi.fn().mockResolvedValue(undefined),
		abort: vi.fn().mockResolvedValue(undefined)
	};
}

/** Link a file backed by `createWritable`, leaving the store in the 'active' state. */
async function link(createWritable: ReturnType<typeof vi.fn>): Promise<FileSystemFileHandle> {
	const handle = makeHandle(createWritable);
	mockPickAndLinkNewFile.mockResolvedValue(handle);
	await linkFile();
	return handle;
}

describe('linked file write status', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(async () => {
		await unlinkFile();
		closeDB();
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
		vi.restoreAllMocks();
	});

	it('marks the link active after a successful first write', async () => {
		await link(vi.fn().mockResolvedValue(workingWritable()));

		expect(store.linkedFileStatus).toBe('active');
		expect(store.linkedFileWriting).toBe(false);
		expect(store.linkedFileLastSaved).toBeTypeOf('number');
		expect(store.linkedFileError).toBeNull();
	});

	it('routes a revoked permission to reconnect, not write-error', async () => {
		const createWritable = vi.fn().mockResolvedValue(workingWritable());
		await link(createWritable);

		createWritable.mockRejectedValue(new DOMException('denied', 'NotAllowedError'));
		await saveNow();

		// "Retry" cannot re-prompt for permission — only "Reconnect" can
		expect(store.linkedFileStatus).toBe('reconnect');
		expect(store.linkedFilePermissionDenied).toBe(false);
		expect(store.linkedFileWriting).toBe(false);
	});

	it('routes a missing file to not-found', async () => {
		const createWritable = vi.fn().mockResolvedValue(workingWritable());
		await link(createWritable);

		createWritable.mockRejectedValue(new DOMException('gone', 'NotFoundError'));
		await saveNow();

		expect(store.linkedFileStatus).toBe('not-found');
		expect(store.linkedFileWriting).toBe(false);
	});

	it('retries a locked file, then reports the DOMException name and recovers', async () => {
		const createWritable = vi.fn().mockResolvedValue(workingWritable());
		await link(createWritable);

		createWritable.mockRejectedValue(
			new DOMException('file is locked', 'NoModificationAllowedError')
		);
		createWritable.mockClear();
		await saveNow();

		// Initial attempt plus one per backoff step
		expect(createWritable).toHaveBeenCalledTimes(4);
		expect(store.linkedFileStatus).toBe('write-error');
		expect(store.linkedFileError).toBe('NoModificationAllowedError: file is locked');
		// The UI must never be left stuck on "Saving…"
		expect(store.linkedFileWriting).toBe(false);

		// A later write recovers — the lock was released instead of leaking
		createWritable.mockResolvedValue(workingWritable());
		store.linkedFileStatus = 'active';
		await saveNow();

		expect(store.linkedFileStatus).toBe('active');
		expect(store.linkedFileError).toBeNull();
	});

	it('does not waste retries on a non-recoverable failure', async () => {
		const createWritable = vi.fn().mockResolvedValue(workingWritable());
		await link(createWritable);

		createWritable.mockRejectedValue(new DOMException('gone', 'NotFoundError'));
		createWritable.mockClear();
		await saveNow();

		expect(createWritable).toHaveBeenCalledOnce();
	});

	it('never opens two writable streams at once', async () => {
		let open = 0;
		let maxOpen = 0;
		const createWritable = vi.fn().mockImplementation(async () => {
			open++;
			maxOpen = Math.max(maxOpen, open);
			return {
				write: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockImplementation(async () => {
					open--;
				}),
				abort: vi.fn().mockResolvedValue(undefined)
			};
		});

		await link(createWritable);
		await Promise.all([saveNow(), saveNow(), saveNow()]);

		expect(maxOpen).toBe(1);
		expect(store.linkedFileStatus).toBe('active');
	});
});
