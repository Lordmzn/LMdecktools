/**
 * Linked File module — File System Access API integration
 * Encapsulates all logic for linking, reading, writing, and polling a user-chosen file.
 */

import { getMetadata, putMetadata } from './db';

// ==================== TYPES ====================

export type LinkedFileStatus = 'none' | 'active' | 'reconnect' | 'not-found' | 'write-error';

// ==================== FEATURE DETECTION ====================

export function isFileSystemAccessSupported(): boolean {
	return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

// ==================== FILE PICKER & HANDLE STORAGE ====================

const METADATA_KEY = 'linkedFile';

const YJS_FILE_TYPES = [
	{
		description: 'Yjs binary',
		accept: { 'application/octet-stream': ['.yjs'] } as Record<string, string[]>
	}
];

export async function pickAndLinkNewFile(db: IDBDatabase): Promise<FileSystemFileHandle> {
	const handle = await window.showSaveFilePicker({
		suggestedName: 'lmdecktools.yjs',
		types: YJS_FILE_TYPES
	});
	await putMetadata(db, METADATA_KEY, handle);
	return handle;
}

export async function pickAndLinkExistingFile(db: IDBDatabase): Promise<FileSystemFileHandle> {
	const [handle] = await window.showOpenFilePicker({
		multiple: false,
		types: YJS_FILE_TYPES
	});
	await putMetadata(db, METADATA_KEY, handle);
	return handle;
}

export async function loadStoredHandle(db: IDBDatabase): Promise<FileSystemFileHandle | null> {
	const record = await getMetadata(db, METADATA_KEY);
	return record?.value ?? null;
}

export async function unlinkFile(db: IDBDatabase): Promise<void> {
	await putMetadata(db, METADATA_KEY, null);
}

// ==================== PERMISSIONS ====================

export async function checkPermission(handle: FileSystemFileHandle): Promise<PermissionState> {
	return handle.queryPermission({ mode: 'readwrite' });
}

export async function requestPermission(handle: FileSystemFileHandle): Promise<boolean> {
	const result = await handle.requestPermission({ mode: 'readwrite' });
	return result === 'granted';
}

// ==================== ERROR CLASSIFICATION ====================

export type WriteErrorKind = 'not-found' | 'permission' | 'transient' | 'other';

/**
 * Classify a File System Access failure so callers can pick the right recovery.
 * `transient` errors are worth retrying; `permission` and `not-found` never are.
 */
export function classifyWriteError(error: unknown): WriteErrorKind {
	if (!(error instanceof DOMException)) return 'other';

	switch (error.name) {
		case 'NotFoundError':
			return 'not-found';
		case 'NotAllowedError':
		case 'SecurityError':
			return 'permission';
		// NoModificationAllowedError means the file is locked — by another
		// writable stream, or by a cloud-sync client (Dropbox, iCloud, OneDrive).
		case 'NoModificationAllowedError':
		case 'InvalidStateError':
		case 'AbortError':
			return 'transient';
		default:
			return 'other';
	}
}

/** Human-readable error text, keeping the DOMException name so failures are diagnosable. */
export function describeWriteError(error: unknown): string {
	if (error instanceof DOMException) return `${error.name}: ${error.message}`;
	if (error instanceof Error) return error.message;
	return 'Write failed';
}

// ==================== READ / WRITE ====================

export async function writeToFile(handle: FileSystemFileHandle, data: Uint8Array): Promise<void> {
	const writable = await handle.createWritable();
	try {
		// Write an exact view: passing `data.buffer` ignores byteOffset/byteLength
		// and appends trailing bytes when Yjs hands back a pooled buffer.
		await writable.write(
			new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength)
		);
		await writable.close();
	} catch (error) {
		// Releasing the stream is mandatory: createWritable() takes an exclusive
		// lock on the file, and an unclosed stream keeps holding it — turning one
		// transient failure into a permanent "file is locked" state.
		try {
			await writable.abort();
		} catch {
			// Stream already closed or errored out — nothing left to release.
		}
		throw error;
	}
}

const RETRY_DELAYS_MS = [250, 1000, 2000];

/**
 * Write with backoff on transient failures. Reports the *first* error, since the
 * root cause is more useful than whatever the last attempt tripped over.
 */
export async function writeWithRetry(
	handle: FileSystemFileHandle,
	data: Uint8Array
): Promise<void> {
	let firstError: unknown;

	for (let attempt = 0; ; attempt++) {
		try {
			await writeToFile(handle, data);
			return;
		} catch (error) {
			if (attempt === 0) firstError = error;

			const kind = classifyWriteError(error);
			if (kind === 'permission' || kind === 'not-found') throw firstError;
			if (attempt >= RETRY_DELAYS_MS.length) throw firstError;

			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
		}
	}
}

// ==================== WRITE QUEUE ====================

/**
 * Every write goes through this chain so two createWritable() calls can never
 * overlap on the same handle — overlapping calls are themselves a lock error.
 */
let writeChain: Promise<unknown> = Promise.resolve();
let queuedWrites = 0;

export function enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
	queuedWrites++;
	// Run the task whether the previous one resolved or rejected: a failed write
	// must not wedge the queue.
	const run = writeChain.then(task, task);
	writeChain = run.then(
		() => queuedWrites--,
		() => queuedWrites--
	);
	return run;
}

/** True while any write is queued or in flight. */
export function isWriteQueueBusy(): boolean {
	return queuedWrites > 0;
}

export async function readFileData(handle: FileSystemFileHandle): Promise<Uint8Array> {
	const file = await handle.getFile();
	const buffer = await file.arrayBuffer();
	return new Uint8Array(buffer);
}

export async function readFileLastModified(handle: FileSystemFileHandle): Promise<number> {
	const file = await handle.getFile();
	return file.lastModified;
}

// ==================== DEBOUNCED WRITE ====================

const DEBOUNCE_MS = 500;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
/** A debounced write sits in the queue but hasn't started running yet. */
let debouncedWriteQueued = false;
/** Bumped by cancelDebouncedWrite() so already-queued writes bail out. */
let writeGeneration = 0;

export function scheduleDebouncedWrite(
	handle: FileSystemFileHandle,
	getData: () => Uint8Array,
	onSuccess: (timestamp: number) => void,
	onError: (error: unknown) => void
): void {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}

	debounceTimer = setTimeout(() => {
		debounceTimer = null;

		// A queued-but-not-yet-started write will read fresh data when it runs,
		// so there is nothing to gain from enqueuing a second one.
		if (debouncedWriteQueued) return;
		debouncedWriteQueued = true;

		const generation = writeGeneration;

		void enqueueWrite(async () => {
			debouncedWriteQueued = false;
			// Cancelled while waiting in the queue (e.g. the file was unlinked).
			// The caller owns any UI state it set before scheduling.
			if (generation !== writeGeneration) return;

			try {
				// Read at write time, not schedule time, so a write that waited in
				// the queue still persists the latest state.
				await writeWithRetry(handle, getData());
				const ts = Date.now();
				updateLastKnownModified(ts);
				onSuccess(ts);
			} catch (error) {
				onError(error);
			}
		});
	}, DEBOUNCE_MS);
}

/** Cancel any pending debounced write, queued or merely scheduled (used when unlinking). */
export function cancelDebouncedWrite(): void {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
		debounceTimer = null;
	}
	writeGeneration++;
	debouncedWriteQueued = false;
}

// ==================== POLLING ====================

let pollInterval: ReturnType<typeof setInterval> | null = null;
let lastKnownModified: number | null = null;

export function updateLastKnownModified(timestamp: number): void {
	lastKnownModified = timestamp;
}

export function startPolling(handle: FileSystemFileHandle, onExternalChange: () => void): void {
	stopPolling();

	pollInterval = setInterval(async () => {
		if (isWriteQueueBusy()) return;

		try {
			const modified = await readFileLastModified(handle);
			if (lastKnownModified !== null && modified > lastKnownModified) {
				onExternalChange();
				lastKnownModified = modified;
			} else if (lastKnownModified === null) {
				lastKnownModified = modified;
			}
		} catch {
			// File may have been deleted or moved — ignore, status will be
			// updated on the next write attempt.
		}
	}, 60_000);
}

export function stopPolling(): void {
	if (pollInterval) {
		clearInterval(pollInterval);
		pollInterval = null;
	}
}

/** Reset module-level state (for testing). */
export function _resetState(): void {
	cancelDebouncedWrite();
	stopPolling();
	writeChain = Promise.resolve();
	queuedWrites = 0;
	lastKnownModified = null;
}
