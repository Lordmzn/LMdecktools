/**
 * TypeScript declarations for the File System Access API
 * https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 */

interface FileSystemWritableFileStream extends WritableStream {
	write(data: BufferSource | Blob | string): Promise<void>;
	seek(position: number): Promise<void>;
	truncate(size: number): Promise<void>;
}

interface FileSystemCreateWritableOptions {
	keepExistingData?: boolean;
}

interface FileSystemFileHandle {
	readonly kind: 'file';
	readonly name: string;
	getFile(): Promise<File>;
	createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
	queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
	requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface SaveFilePickerOptions {
	excludeAcceptAllOption?: boolean;
	suggestedName?: string;
	types?: {
		description?: string;
		accept: Record<string, string[]>;
	}[];
}

interface OpenFilePickerOptions {
	excludeAcceptAllOption?: boolean;
	multiple?: boolean;
	types?: {
		description?: string;
		accept: Record<string, string[]>;
	}[];
}

interface Window {
	showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
	showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
}
