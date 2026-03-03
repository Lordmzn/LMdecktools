import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openDatabase, getMetadata } from '../db';
import {
	isFileSystemAccessSupported,
	pickAndLinkNewFile,
	loadStoredHandle,
	unlinkFile,
	writeToFile,
	readFileData,
	scheduleDebouncedWrite,
	cancelDebouncedWrite,
	startPolling,
	stopPolling,
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
		await new Promise<void>((resolve, reject) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
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

	it('calls onError when write fails after retry', async () => {
		const error = new Error('Write failed');
		const mockHandle = {
			createWritable: vi.fn().mockRejectedValue(error)
		} as unknown as FileSystemFileHandle;

		const getData = vi.fn().mockReturnValue(new Uint8Array([1]));
		const onSuccess = vi.fn();
		const onError = vi.fn();

		scheduleDebouncedWrite(mockHandle, getData, onSuccess, onError);
		// Advance past debounce (500ms) + retry delay (1000ms)
		await vi.advanceTimersByTimeAsync(1600);

		expect(onSuccess).not.toHaveBeenCalled();
		expect(onError).toHaveBeenCalledWith(error);
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
