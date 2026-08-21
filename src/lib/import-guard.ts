/**
 * Restore-file validation (#52).
 *
 * `importDatabase()` used to clear the database on the strength of a successful
 * `JSON.parse`, so picking any unrelated `.json` file wiped the collection and
 * every card list and imported nothing. Everything here runs *before* the first
 * write: parse the file, prove it is an LM Deck Tools export of a version we
 * understand, and refuse anything else with an error that names the problem.
 */

import type { CardList, CollectionCard } from './db';
import * as m from './paraglide/messages';
import { DOC_SCHEMA_VERSION, readPayload } from './ydoc';

export const APP_NAME = 'LM Deck Tools';

/**
 * Payload versions this build can read.
 *
 * `1.0` was the snapshot format — a fresh `Y.Doc` per save, no history and no
 * lineage. `2` is the document (#47). The alpha owes no backward compatibility,
 * so 1.0 is gone rather than supported: a snapshot has no guid to adopt, and
 * pretending otherwise would produce a database that no other device could
 * ever sync with.
 */
export const SUPPORTED_VERSIONS = [String(DOC_SCHEMA_VERSION)];

export interface ImportPayload {
	format: 'json' | 'document';
	cardLists: CardList[];
	collection: CollectionCard[];
	/** Metadata as found in the file. Null where the file does not carry the field. */
	app: string | null;
	version: string | null;
	exportedAt: number | null;
	/**
	 * The lineage the payload belongs to (#47). Equal to the local document's
	 * guid means the file is a replica of this database and applying it is a
	 * *merge*; anything else is a foreign lineage and gets the *union*. Null for
	 * a plain-JSON payload, which has no lineage at all.
	 */
	guid: string | null;
	/** Counts the file claims for itself, used as a truncation check. Absent in pre-#52 exports. */
	declaredLists: number | null;
	declaredCards: number | null;
}

/** Thrown for any file we refuse to import. The message is shown to the user verbatim. */
export class ImportValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ImportValidationError';
	}
}

function asString(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asArray(value: unknown): unknown[] | null {
	return Array.isArray(value) ? value : null;
}

/**
 * Reject a file that names another application, or a version this build predates.
 * A file with no `app` field is a legacy export and is judged by its shape instead.
 */
function checkIdentity(app: string | null, version: string | null, hasKnownShape: boolean): void {
	if (app !== null && app !== APP_NAME) {
		throw new ImportValidationError(m.import_error_foreign_app({ app, appName: APP_NAME }));
	}

	if (app === null && !hasKnownShape) {
		throw new ImportValidationError(m.import_error_not_an_export({ appName: APP_NAME }));
	}

	if (version !== null && !SUPPORTED_VERSIONS.includes(version)) {
		throw new ImportValidationError(
			m.import_error_unsupported_version({
				version,
				supported: SUPPORTED_VERSIONS.join(', ')
			})
		);
	}
}

/** A file that declares more content than it carries is truncated — do not restore from it. */
function checkDeclaredCounts(payload: ImportPayload): void {
	const { declaredLists, declaredCards, cardLists, collection } = payload;

	if (declaredLists !== null && declaredLists !== cardLists.length) {
		const params = { declared: declaredLists, actual: cardLists.length };
		throw new ImportValidationError(
			declaredLists === 1
				? m.import_error_truncated_lists_one(params)
				: m.import_error_truncated_lists_other(params)
		);
	}

	if (declaredCards !== null && declaredCards !== collection.length) {
		const params = { declared: declaredCards, actual: collection.length };
		throw new ImportValidationError(
			declaredCards === 1
				? m.import_error_truncated_cards_one(params)
				: m.import_error_truncated_cards_other(params)
		);
	}
}

function parseJSONPayload(raw: unknown): ImportPayload {
	if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
		throw new ImportValidationError(m.import_error_not_an_export({ appName: APP_NAME }));
	}

	const source = raw as Record<string, unknown>;
	// `decks` is the v2 store name, still readable
	const lists = asArray(source.cardLists) ?? asArray(source.decks);
	const collection = asArray(source.collection);

	const app = asString(source.app);
	const version = asString(source.version);
	checkIdentity(app, version, lists !== null || collection !== null);

	return {
		format: 'json',
		cardLists: (lists ?? []) as CardList[],
		collection: (collection ?? []) as CollectionCard[],
		app,
		version,
		exportedAt: asNumber(source.exported_at),
		guid: null,
		declaredLists: asNumber(source.total_lists),
		declaredCards: asNumber(source.total_cards)
	};
}

/**
 * Decode a document payload, without adopting it.
 *
 * The guid comes out with the rest, which is what lets `inspectImportFile()`
 * tell the DB modal whether this file will be merged into the local lineage or
 * unioned in as a stranger's — same bytes, different results (C4).
 */
function parseDocumentPayload(data: Uint8Array): ImportPayload {
	let decoded: ReturnType<typeof readPayload>;
	try {
		decoded = readPayload(data);
	} catch {
		throw new ImportValidationError(m.import_error_unrecognised_format());
	}

	const { cardLists, collection, meta, legacyVersion } = decoded;

	// A 1.0 snapshot decodes cleanly and carries lists — it just has no lineage.
	// Refused by name rather than accepted as a legacy export, because adopting
	// one would leave the database unable to sync with the device it came from.
	if (legacyVersion !== undefined && !SUPPORTED_VERSIONS.includes(legacyVersion)) {
		throw new ImportValidationError(
			m.import_error_unsupported_version({
				version: legacyVersion,
				supported: SUPPORTED_VERSIONS.join(', ')
			})
		);
	}

	const app = asString(meta.app);
	const version = meta.schema_version === undefined ? null : String(meta.schema_version);
	// A foreign binary that happens to decode yields empty maps and no app name
	checkIdentity(app, version, cardLists.length > 0 || collection.length > 0);

	return {
		format: 'document',
		cardLists: cardLists as CardList[],
		collection,
		app,
		version,
		exportedAt: asNumber(meta.created_at),
		guid: asString(meta.guid),
		declaredLists: null,
		declaredCards: null
	};
}

/**
 * Parse a restore file and prove it is ours, without touching the database.
 * Throws {@link ImportValidationError} with a user-facing message for anything else.
 */
export function parseImportFile(data: Uint8Array): ImportPayload {
	let json: unknown;
	try {
		json = JSON.parse(new TextDecoder().decode(data));
	} catch {
		return checkedPayload(parseDocumentPayload(data));
	}

	return checkedPayload(parseJSONPayload(json));
}

function checkedPayload(payload: ImportPayload): ImportPayload {
	checkDeclaredCounts(payload);
	return payload;
}

/**
 * Guard the destructive restore path: a payload with nothing in it is the wrong
 * file or a corrupt one, and clearing the database over it loses everything for
 * no gain. Erasing on purpose is what *Create New Database* is for.
 */
export function assertRestorable(payload: ImportPayload): void {
	if (payload.cardLists.length === 0 && payload.collection.length === 0) {
		throw new ImportValidationError(m.import_error_empty_payload());
	}
}

/** One-line summary of what the user is about to restore, for the confirmation UI. */
export function describeImport(payload: ImportPayload): string {
	const lists =
		payload.cardLists.length === 1
			? m.import_summary_lists_one({ count: payload.cardLists.length })
			: m.import_summary_lists_other({ count: payload.cardLists.length });
	const cards =
		payload.collection.length === 1
			? m.import_summary_cards_one({ count: payload.collection.length })
			: m.import_summary_cards_other({ count: payload.collection.length });

	const parts = [
		`${payload.app ?? m.import_summary_legacy()}${payload.version ? ` v${payload.version}` : ''}`
	];
	if (payload.exportedAt !== null) {
		parts.push(new Date(payload.exportedAt).toLocaleString());
	}
	parts.push(`${lists}, ${cards}`);

	return parts.join(' · ');
}
