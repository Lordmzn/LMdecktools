/**
 * The T2 share envelope (#91, T2b).
 *
 * `docs/durability-convergence-transport.md` T2b: base64 the raw Yjs update
 * inside a `.json` envelope carrying `schema_version`, `guid`, `app`. A raw
 * `.ydelta` is exactly the file iOS greys out in a share sheet or mangles in
 * transit; `.json` is what every platform previews and passes through
 * unmangled. The cost is 33%, and it buys a `schema_version` the outer
 * envelope can be checked against before the bytes inside are ever touched —
 * see `parseShareEnvelopePayload()` in `import-guard.ts`, which is where this
 * module's output actually gets adopted or unioned.
 *
 * Deliberately free of Svelte and of the document model: this is wire format
 * only, the same reason `export-format.ts` is pure functions over arrays.
 */

export interface ShareEnvelope {
	app: string;
	schema_version: string;
	guid: string;
	/** Base64 of a raw Yjs update — `Y.encodeStateAsUpdate()`. */
	update: string;
}

/**
 * `String.fromCharCode(...bytes)` blows the call stack past tens of thousands
 * of arguments, and a 2,000-card document is already ~428 KB (#91, C0). Chunk
 * the conversion instead of spreading the whole array at once.
 */
const CHUNK_SIZE = 0x8000;

export function encodeUpdate(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
		binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
	}
	return btoa(binary);
}

export function decodeUpdate(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

export function buildShareEnvelope(
	update: Uint8Array,
	meta: { app: string; guid: string; schemaVersion: string }
): string {
	const envelope: ShareEnvelope = {
		app: meta.app,
		schema_version: meta.schemaVersion,
		guid: meta.guid,
		update: encodeUpdate(update)
	};
	return JSON.stringify(envelope);
}

/**
 * True when `value` carries the one field that identifies a share envelope.
 * Anything else — including the legacy plain-JSON `cardLists`/`collection`
 * shape — falls through to that format instead (`import-guard.ts`).
 */
export function isShareEnvelope(value: unknown): value is Record<string, unknown> {
	return (
		value !== null &&
		typeof value === 'object' &&
		!Array.isArray(value) &&
		typeof (value as Record<string, unknown>).update === 'string'
	);
}
