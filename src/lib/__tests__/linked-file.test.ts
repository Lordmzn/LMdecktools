import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetDatabases } from './reset';
import { openDatabase, getMetadata } from '../db';
import {
	isFileSystemAccessSupported,
	loadStoredHandle,
	unlinkFile,
	writeToFile,
	writeWithRetry,
	enqueueWrite,
	isWriteQueueBusy,
	classifyWriteError,
	describeWriteError,
	readFileData,
	scheduleDebouncedWrite,
	cancelDebouncedWrite,
	startPolling,
	stopPolling,
	pickAndLinkNewFile,
	_resetState
} from '../linked-file';

describe('isFileSystemAccessSupported', () => {
	it('returns false when showSaveFilePicker is not available', () => {
		// In the test environment (Node/jsdom), the API is not available
		expect(isFileSystemAccessSupported()).toBe(false);
	});

	it('returns true when showSaveFilePicker is available', () => {
		// Temporarily add the property to globalThis (window may not exist in Node)
		(globalThis as any).window = globalThis;
		(globalThis as any).showSaveFilePicker = vi.fn();
		expect(isFileSystemAccessSupported()).toBe(true);
		delete (globalThis as any).showSaveFilePicker;
		delete (globalThis as any).window;
	});
});

describe('Handle storage with IDB', () => {
	let db: IDBDatabase;

	beforeEach(async () => {
		db = await openDatabase();
	});

	afterEach(async () => {
		db.close();
		await resetDatabases();
	});

	it('loadStoredHandle returns null when no handle is stored', async () => {
		const handle = await loadStoredHandle(db);
		expect(handle).toBeNull();
	});

	it('unlinkFile sets metadata to null', async () => {
		await unlinkFile(db);
		const record = await getMetadata(db, 'linkedFile');
		expect(record.value).toBeNull();
	});

	it('pickAndLinkNewFile suggests <deviceId>.ydelta (#91, T3)', async () => {
		const mockHandle = { name: 'device-abc.ydelta' } as unknown as FileSystemFileHandle;
		const showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);
		(globalThis as any).window = globalThis;
		(globalThis as any).showSaveFilePicker = showSaveFilePicker;

		const handle = await pickAndLinkNewFile(db, 'device-abc');

		expect(handle).toBe(mockHandle);
		expect(showSaveFilePicker).toHaveBeenCalledWith(
			expect.objectContaining({
				suggestedName: 'device-abc.ydelta',
				types: [expect.objectContaining({ accept: { 'application/octet-stream': ['.ydelta'] } })]
			})
		);

		delete (globalThis as any).showSaveFilePicker;
		delete (globalThis as any).window;
	});
});

describe('writeToFile', () => {
	it('calls createWritable, write, and close in order', async () => {
		const closeFn = vi.fn().mockResolvedValue(undefined);
		const writeFn = vi.fn().mockResolvedValue(undefined);
		const mockWritable = { write: writeFn, close: closeFn };
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue(mockWritable)
		} as unknown as FileSystemFileHandle;

		const data = new Uint8Array([1, 2, 3]);
		await writeToFile(mockHandle, data);

		expect(mockHandle.createWritable).toHaveBeenCalledOnce();
		expect(writeFn).toHaveBeenCalledOnce();
		expect(closeFn).toHaveBeenCalledOnce();

		// Ensure write was called before close
		const writeOrder = writeFn.mock.invocationCallOrder[0];
		const closeOrder = closeFn.mock.invocationCallOrder[0];
		expect(writeOrder).toBeLessThan(closeOrder);
	});

	it('writes only the view, not the whole backing buffer', async () => {
		const writeFn = vi.fn().mockResolvedValue(undefined);
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue({ write: writeFn, close: vi.fn() })
		} as unknown as FileSystemFileHandle;

		// A view into the middle of a larger pooled buffer, as Yjs may return
		const backing = new Uint8Array([9, 9, 1, 2, 3, 9, 9]);
		await writeToFile(mockHandle, backing.subarray(2, 5));

		expect(writeFn).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]));
	});

	it('aborts the writable when write fails, releasing the file lock', async () => {
		const error = new Error('disk full');
		const abortFn = vi.fn().mockResolvedValue(undefined);
		const closeFn = vi.fn();
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue({
				write: vi.fn().mockRejectedValue(error),
				close: closeFn,
				abort: abortFn
			})
		} as unknown as FileSystemFileHandle;

		await expect(writeToFile(mockHandle, new Uint8Array([1]))).rejects.toThrow('disk full');
		expect(abortFn).toHaveBeenCalledOnce();
		expect(closeFn).not.toHaveBeenCalled();
	});

	it('aborts the writable when close fails', async () => {
		const abortFn = vi.fn().mockResolvedValue(undefined);
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue({
				write: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockRejectedValue(new Error('close failed')),
				abort: abortFn
			})
		} as unknown as FileSystemFileHandle;

		await expect(writeToFile(mockHandle, new Uint8Array([1]))).rejects.toThrow('close failed');
		expect(abortFn).toHaveBeenCalledOnce();
	});

	it('does not abort on a successful write', async () => {
		const abortFn = vi.fn();
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue({
				write: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined),
				abort: abortFn
			})
		} as unknown as FileSystemFileHandle;

		await writeToFile(mockHandle, new Uint8Array([1]));
		expect(abortFn).not.toHaveBeenCalled();
	});
});

describe('classifyWriteError', () => {
	it.each([
		['NotFoundError', 'not-found'],
		['NotAllowedError', 'permission'],
		['SecurityError', 'permission'],
		['NoModificationAllowedError', 'transient'],
		['InvalidStateError', 'transient'],
		['AbortError', 'transient'],
		['QuotaExceededError', 'other']
	])('maps %s to %s', (name, expected) => {
		expect(classifyWriteError(new DOMException('boom', name))).toBe(expected);
	});

	it('treats non-DOMException failures as other', () => {
		expect(classifyWriteError(new Error('boom'))).toBe('other');
	});
});

describe('describeWriteError', () => {
	it('includes the DOMException name so failures are diagnosable', () => {
		const error = new DOMException('file is locked', 'NoModificationAllowedError');
		expect(describeWriteError(error)).toBe('NoModificationAllowedError: file is locked');
	});

	it('falls back to the message for plain errors', () => {
		expect(describeWriteError(new Error('boom'))).toBe('boom');
	});

	it('falls back to a generic message for non-errors', () => {
		expect(describeWriteError('nope')).toBe('Write failed');
	});
});

describe('writeWithRetry', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('retries transient failures and succeeds', async () => {
		const createWritable = vi
			.fn()
			.mockRejectedValueOnce(new DOMException('locked', 'NoModificationAllowedError'))
			.mockResolvedValue({
				write: vi.fn().mockResolvedValue(undefined),
				close: vi.fn().mockResolvedValue(undefined)
			});
		const mockHandle = { createWritable } as unknown as FileSystemFileHandle;

		const promise = writeWithRetry(mockHandle, new Uint8Array([1]));
		await vi.advanceTimersByTimeAsync(300);

		await expect(promise).resolves.toBeUndefined();
		expect(createWritable).toHaveBeenCalledTimes(2);
	});

	it('does not retry permission failures', async () => {
		const error = new DOMException('denied', 'NotAllowedError');
		const createWritable = vi.fn().mockRejectedValue(error);
		const mockHandle = { createWritable } as unknown as FileSystemFileHandle;

		await expect(writeWithRetry(mockHandle, new Uint8Array([1]))).rejects.toBe(error);
		expect(createWritable).toHaveBeenCalledOnce();
	});

	it('does not retry not-found failures', async () => {
		const error = new DOMException('gone', 'NotFoundError');
		const createWritable = vi.fn().mockRejectedValue(error);
		const mockHandle = { createWritable } as unknown as FileSystemFileHandle;

		await expect(writeWithRetry(mockHandle, new Uint8Array([1]))).rejects.toBe(error);
		expect(createWritable).toHaveBeenCalledOnce();
	});

	it('reports the first error after exhausting retries', async () => {
		const first = new DOMException('locked by sync client', 'NoModificationAllowedError');
		const createWritable = vi
			.fn()
			.mockRejectedValueOnce(first)
			.mockRejectedValue(new DOMException('locked', 'NoModificationAllowedError'));
		const mockHandle = { createWritable } as unknown as FileSystemFileHandle;

		const promise = writeWithRetry(mockHandle, new Uint8Array([1]));
		const assertion = expect(promise).rejects.toBe(first);
		await vi.advanceTimersByTimeAsync(4000);
		await assertion;

		// Initial attempt + one per retry delay
		expect(createWritable).toHaveBeenCalledTimes(4);
	});
});

describe('enqueueWrite', () => {
	beforeEach(() => {
		_resetState();
	});

	it('never runs two writes concurrently', async () => {
		let concurrent = 0;
		let maxConcurrent = 0;
		const task = async () => {
			concurrent++;
			maxConcurrent = Math.max(maxConcurrent, concurrent);
			await Promise.resolve();
			concurrent--;
		};

		await Promise.all([enqueueWrite(task), enqueueWrite(task), enqueueWrite(task)]);

		expect(maxConcurrent).toBe(1);
	});

	it('keeps draining the queue after a failed write', async () => {
		const failing = enqueueWrite(async () => {
			throw new Error('boom');
		});
		await expect(failing).rejects.toThrow('boom');

		await expect(enqueueWrite(async () => 'ok')).resolves.toBe('ok');
	});

	it('reports queue busy state', async () => {
		expect(isWriteQueueBusy()).toBe(false);

		const inFlight = enqueueWrite(async () => {
			expect(isWriteQueueBusy()).toBe(true);
		});
		expect(isWriteQueueBusy()).toBe(true);

		await inFlight;
		// Let the bookkeeping continuation settle
		await Promise.resolve();
		expect(isWriteQueueBusy()).toBe(false);
	});
});

describe('readFileData', () => {
	it('reads file contents as Uint8Array', async () => {
		const testData = new Uint8Array([10, 20, 30]);
		const mockFile = {
			arrayBuffer: vi.fn().mockResolvedValue(testData.buffer)
		} as unknown as File;
		const mockHandle = {
			getFile: vi.fn().mockResolvedValue(mockFile)
		} as unknown as FileSystemFileHandle;

		const result = await readFileData(mockHandle);
		expect(result).toEqual(testData);
	});
});

describe('scheduleDebouncedWrite', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		_resetState();
	});

	afterEach(() => {
		_resetState();
		vi.useRealTimers();
	});

	it('debounces multiple rapid calls into a single write', async () => {
		const closeFn = vi.fn().mockResolvedValue(undefined);
		const writeFn = vi.fn().mockResolvedValue(undefined);
		const mockWritable = { write: writeFn, close: closeFn };
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue(mockWritable)
		} as unknown as FileSystemFileHandle;

		const getData = vi.fn().mockReturnValue(new Uint8Array([1]));
		const onSuccess = vi.fn();
		const onError = vi.fn();

		// Call 3 times rapidly
		scheduleDebouncedWrite(mockHandle, getData, onSuccess, onError);
		scheduleDebouncedWrite(mockHandle, getData, onSuccess, onError);
		scheduleDebouncedWrite(mockHandle, getData, onSuccess, onError);

		// Fast-forward past debounce
		await vi.advanceTimersByTimeAsync(600);

		// Should only have written once
		expect(getData).toHaveBeenCalledOnce();
		expect(writeFn).toHaveBeenCalledOnce();
		expect(onSuccess).toHaveBeenCalledOnce();
		expect(onError).not.toHaveBeenCalled();
	});

	it('calls onError when write fails after retries', async () => {
		const error = new Error('Write failed');
		const mockHandle = {
			createWritable: vi.fn().mockRejectedValue(error)
		} as unknown as FileSystemFileHandle;

		const getData = vi.fn().mockReturnValue(new Uint8Array([1]));
		const onSuccess = vi.fn();
		const onError = vi.fn();

		scheduleDebouncedWrite(mockHandle, getData, onSuccess, onError);
		// Advance past debounce (500ms) + all retry delays (250 + 1000 + 2000ms)
		await vi.advanceTimersByTimeAsync(4000);

		expect(onSuccess).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith(error);
	});

	it('reads data at write time, not at schedule time', async () => {
		let state = 1;
		const writeFn = vi.fn().mockResolvedValue(undefined);
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue({ write: writeFn, close: vi.fn() })
		} as unknown as FileSystemFileHandle;

		scheduleDebouncedWrite(mockHandle, () => new Uint8Array([state]), vi.fn(), vi.fn());
		state = 2;
		await vi.advanceTimersByTimeAsync(600);

		expect(writeFn).toHaveBeenCalledWith(new Uint8Array([2]));
	});

	it('queues a follow-up write instead of dropping it when one is in flight', async () => {
		let releaseFirstWrite: () => void = () => {};
		const writeFn = vi
			.fn()
			.mockImplementationOnce(() => new Promise<void>((resolve) => (releaseFirstWrite = resolve)))
			.mockResolvedValue(undefined);
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue({ write: writeFn, close: vi.fn() })
		} as unknown as FileSystemFileHandle;

		const onSuccess = vi.fn();
		const getData = vi.fn().mockReturnValue(new Uint8Array([1]));

		// First write starts and hangs
		scheduleDebouncedWrite(mockHandle, getData, onSuccess, vi.fn());
		await vi.advanceTimersByTimeAsync(600);
		expect(writeFn).toHaveBeenCalledOnce();
		expect(onSuccess).not.toHaveBeenCalled();

		// A second write is scheduled while the first is still in flight
		scheduleDebouncedWrite(mockHandle, getData, onSuccess, vi.fn());
		await vi.advanceTimersByTimeAsync(600);

		releaseFirstWrite();
		await vi.advanceTimersByTimeAsync(0);

		// The second write ran after the first rather than being dropped
		expect(writeFn).toHaveBeenCalledTimes(2);
		expect(onSuccess).toHaveBeenCalledTimes(2);
	});

	it('coalesces writes that are still waiting in the queue', async () => {
		let releaseFirstWrite: () => void = () => {};
		const writeFn = vi
			.fn()
			.mockImplementationOnce(() => new Promise<void>((resolve) => (releaseFirstWrite = resolve)))
			.mockResolvedValue(undefined);
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue({ write: writeFn, close: vi.fn() })
		} as unknown as FileSystemFileHandle;

		const getData = vi.fn().mockReturnValue(new Uint8Array([1]));

		scheduleDebouncedWrite(mockHandle, getData, vi.fn(), vi.fn());
		await vi.advanceTimersByTimeAsync(600);

		// Two more debounce cycles complete while the first write is still stuck;
		// both should collapse into the single queued write.
		scheduleDebouncedWrite(mockHandle, getData, vi.fn(), vi.fn());
		await vi.advanceTimersByTimeAsync(600);
		scheduleDebouncedWrite(mockHandle, getData, vi.fn(), vi.fn());
		await vi.advanceTimersByTimeAsync(600);

		releaseFirstWrite();
		await vi.advanceTimersByTimeAsync(0);

		expect(writeFn).toHaveBeenCalledTimes(2);
	});

	it('cancelDebouncedWrite drops a write already waiting in the queue', async () => {
		let releaseFirstWrite: () => void = () => {};
		const writeFn = vi
			.fn()
			.mockImplementationOnce(() => new Promise<void>((resolve) => (releaseFirstWrite = resolve)))
			.mockResolvedValue(undefined);
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue({ write: writeFn, close: vi.fn() })
		} as unknown as FileSystemFileHandle;

		const getData = vi.fn().mockReturnValue(new Uint8Array([1]));

		scheduleDebouncedWrite(mockHandle, getData, vi.fn(), vi.fn());
		await vi.advanceTimersByTimeAsync(600);

		scheduleDebouncedWrite(mockHandle, getData, vi.fn(), vi.fn());
		await vi.advanceTimersByTimeAsync(600);

		// Unlink-style cancellation while the second write sits in the queue
		cancelDebouncedWrite();
		releaseFirstWrite();
		await vi.advanceTimersByTimeAsync(0);

		expect(writeFn).toHaveBeenCalledOnce();
	});
});

describe('Polling lifecycle', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		_resetState();
	});

	afterEach(() => {
		_resetState();
		vi.useRealTimers();
	});

	it('starts and stops polling without errors', () => {
		const mockHandle = {
			getFile: vi.fn().mockResolvedValue({ lastModified: Date.now() })
		} as unknown as FileSystemFileHandle;

		const onChange = vi.fn();

		// Should not throw
		startPolling(mockHandle, onChange);
		stopPolling();
	});

	it('calls onExternalChange when file is modified externally', async () => {
		let callCount = 0;
		const mockHandle = {
			getFile: vi.fn().mockImplementation(() => {
				callCount++;
				return Promise.resolve({
					// First poll: 1000, second poll: 2000 (simulates external change)
					lastModified: callCount === 1 ? 1000 : 2000
				});
			})
		} as unknown as FileSystemFileHandle;

		const onChange = vi.fn();
		startPolling(mockHandle, onChange);

		// First poll — sets lastKnownModified
		await vi.advanceTimersByTimeAsync(60_000);
		expect(onChange).not.toHaveBeenCalled();

		// Second poll — detects change
		await vi.advanceTimersByTimeAsync(60_000);
		expect(onChange).toHaveBeenCalledOnce();

		stopPolling();
	});

	it('cancelDebouncedWrite prevents pending writes', async () => {
		const writeFn = vi.fn();
		const mockHandle = {
			createWritable: vi.fn().mockResolvedValue({ write: writeFn, close: vi.fn() })
		} as unknown as FileSystemFileHandle;

		const getData = vi.fn().mockReturnValue(new Uint8Array([1]));
		scheduleDebouncedWrite(mockHandle, getData, vi.fn(), vi.fn());

		// Cancel before debounce fires
		cancelDebouncedWrite();
		await vi.advanceTimersByTimeAsync(600);

		expect(getData).not.toHaveBeenCalled();
		expect(writeFn).not.toHaveBeenCalled();
	});
});
