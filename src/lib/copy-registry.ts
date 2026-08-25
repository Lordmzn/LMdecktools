/**
 * The copy registry — durability as a copy count, not a storage setting (#90).
 *
 * `docs/durability-convergence-transport.md` D1: no storage API on any
 * platform survives a cleared browser, a lost phone, or a new device, so the
 * only promise this app can keep is *"your data exists in as many places as
 * you have put it, and the app reports how many, and how old each is."* This
 * module is the bookkeeping behind that promise — two values under the
 * existing `metadata` store, no schema change.
 *
 * `deviceId` is stable per device, forever, and is not the `Y.Doc` `clientID`
 * (`ydoc.ts`), which stays random per session — two identities with different
 * lifetimes, kept deliberately apart. It is what T3 (#91) will later use as a
 * filename.
 *
 * The registry itself never stores "this device" — that entry is synthesized
 * by the caller from `deviceId`, since it is always live by definition. It is
 * scoped to a document lineage by `guid`: a read for a different guid (a
 * fresh `clearDB()`, or a restored file with a foreign lineage) returns an
 * empty list rather than a stale one, which is what a copy of a *different*
 * collection would otherwise look like.
 */
import { getMetadata, putMetadata } from './db';

const DEVICE_ID_KEY = 'deviceId';
const COPY_REGISTRY_KEY = 'copyRegistry';

/** `peer` is defined for M4 (#11) forward-compat; nothing populates it yet. */
export type CopyKind = 'linked-file' | 'export' | 'peer';

export interface CopyEntry {
	/** Stable per kind, so a repeated save updates one entry rather than growing an unbounded list. */
	id: string;
	kind: CopyKind;
	label: string;
	lastSeen: number;
}

interface CopyRegistryRecord {
	guid: string;
	entries: CopyEntry[];
}

/** The device's own identity, minted once and persisted forever. */
export async function getOrCreateDeviceId(db: IDBDatabase): Promise<string> {
	const stored = await getMetadata(db, DEVICE_ID_KEY);
	if (typeof stored?.value === 'string') return stored.value;

	const id = crypto.randomUUID();
	await putMetadata(db, DEVICE_ID_KEY, id);
	return id;
}

/** Every known copy of the document with the given lineage, besides this device. */
export async function getCopyRegistry(db: IDBDatabase, guid: string): Promise<CopyEntry[]> {
	const stored = await getMetadata(db, COPY_REGISTRY_KEY);
	const record = stored?.value as CopyRegistryRecord | undefined;
	if (!record || record.guid !== guid) return [];
	return record.entries;
}

/** Upsert a copy by `entry.id`, and return the updated list. */
export async function recordCopy(
	db: IDBDatabase,
	guid: string,
	entry: CopyEntry
): Promise<CopyEntry[]> {
	const existing = await getCopyRegistry(db, guid);
	const entries = [...existing.filter((e) => e.id !== entry.id), entry];
	const record: CopyRegistryRecord = { guid, entries };
	await putMetadata(db, COPY_REGISTRY_KEY, record);
	return entries;
}
