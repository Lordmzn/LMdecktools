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

// ==================== READ / WRITE ====================

export async function writeToFile(handle: FileSystemFileHandle, data: Uint8Array): Promise<void> {
	const writable = await handle.createWritable();
	await writable.write(new Blob([data.buffer as ArrayBuffer]));
	await writable.close();
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

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let writeInFlight = false;

export function scheduleDebouncedWrite(
	handle: FileSystemFileHandle,
	getData: () => Uint8Array,
	onSuccess: (timestamp: number) => void,
	onError: (error: unknown) => void
): void {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
	}

	debounceTimer = setTimeout(async () => {
		if (writeInFlight) return;
		writeInFlight = true;
		try {
			const data = getData();
			try {
				await writeToFile(handle, data);
			} catch (firstError) {
				// Retry once after a short delay — handles transient filesystem
				// locks from cloud-sync clients (Dropbox, iCloud, OneDrive).
				await new Promise((r) => setTimeout(r, 1000));
				await writeToFile(handle, data);
			}
			const ts = Date.now();
			updateLastKnownModified(ts);
			onSuccess(ts);
		} catch (error) {
			onError(error);
		} finally {
			writeInFlight = false;
		}
	}, 500);
}

/** Cancel any pending debounced write (used when unlinking). */
export function cancelDebouncedWrite(): void {
	if (debounceTimer) {
		clearTimeout(debounceTimer);
		debounceTimer = null;
	}
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
		if (writeInFlight) return;

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
	writeInFlight = false;
	lastKnownModified = null;
}
