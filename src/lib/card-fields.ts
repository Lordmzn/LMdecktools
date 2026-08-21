/**
 * What a stored card record is allowed to contain (#84).
 *
 * Every record used to carry the whole Scryfall object — `image_uris`,
 * `card_faces`, `legalities`, `prices`, `all_parts`, `related_uris` and the
 * rest — once per collection entry and once per list the card appears in. At a
 * median 5,184 bytes per card that made a 1,000-card database a 7.1 MB `.yjs`
 * file, rewritten whole on every single add or remove.
 *
 * Scryfall fields are immutable third-party facts, not user data: they never
 * conflict, and they are refetchable from `/cards/collection`. So the stored
 * record is a **whitelist** of what the user authored plus the minimum needed
 * to show a readable row and re-resolve the printing later, and everything else
 * moves to the local, non-synced card-facts cache (`card-facts.ts`).
 *
 * The whitelist is a whitelist and must stay one. The temptation is always to
 * spread the Scryfall object and be done; that is exactly how the bloat
 * happened. Fields join this list one at a time, deliberately — under the
 * document model of #47 each one costs ~30 bytes per card forever, in a payload
 * that moves in full on every sync.
 *
 * Pure module, no Svelte and no IndexedDB: the store calls in here for the work.
 */

import type { Card, CollectionCard } from './db';

/**
 * The only card fields that reach disk. `id` keys the record; `name`, `set` and
 * `collector_number` are what make a card readable and re-resolvable without
 * the network; `lang` decides ownership matching; `mana_cost` and `type_line`
 * are shown in list rows. `is_foil` describes the physical copy the user owns,
 * so it is theirs, not Scryfall's.
 */
export const STORED_CARD_FIELDS = [
	'id',
	'name',
	'set',
	'collector_number',
	'lang',
	'mana_cost',
	'type_line',
	'is_foil'
] as const;

export interface StoredCard {
	id: string;
	name: string;
	set?: string;
	collector_number?: string;
	lang?: string;
	mana_cost?: string;
	type_line?: string;
	is_foil?: boolean;
}

/** The image sizes the UI actually renders. The other four Scryfall returns are dead weight. */
export interface ImageFacts {
	small?: string;
	normal?: string;
}

export interface CardFaceFacts {
	name?: string;
	image_uris?: ImageFacts;
}

/**
 * The refetchable half of a card: what it takes to draw it, keyed by Scryfall
 * id. Cached locally, never written to a user data file — see `card-facts.ts`.
 */
export interface CardFacts {
	id: string;
	set_name?: string;
	image_uris?: ImageFacts;
	card_faces?: CardFaceFacts[];
}

/** Copy the defined whitelisted fields, and nothing else, into a plain object. */
export function toStoredCard(card: unknown): StoredCard {
	const source = (card ?? {}) as Record<string, unknown>;
	const stored: Record<string, unknown> = {};

	for (const field of STORED_CARD_FIELDS) {
		const value = source[field];
		if (value !== undefined && value !== null) {
			stored[field] = value;
		}
	}

	return stored as unknown as StoredCard;
}

/**
 * A collection row: the whitelist plus the quantity owned.
 *
 * Doubles as the proxy stripper the old `toPlainCard()` was — every whitelisted
 * value is a primitive, so the copy is already structured-cloneable and there is
 * no `JSON.parse(JSON.stringify(...))` round trip over a 5 KB object.
 */
export function toStoredCollectionCard(card: unknown, quantityOwned?: number): CollectionCard {
	const source = (card ?? {}) as Record<string, unknown>;
	const quantity = quantityOwned ?? (source.quantity_owned as number | undefined) ?? 0;

	return { ...toStoredCard(card), quantity_owned: quantity } as CollectionCard;
}

/** A card-list row: the whitelist plus the quantity in the list. */
export function toStoredListCard(card: unknown, quantity?: number): Card {
	const source = (card ?? {}) as Record<string, unknown>;
	const lmQuantity = quantity ?? (source.LM_quantity as number | undefined) ?? 1;

	return { ...toStoredCard(card), LM_quantity: lmQuantity } as Card;
}

function toImageFacts(value: unknown): ImageFacts | undefined {
	if (!value || typeof value !== 'object') return undefined;

	const uris = value as Record<string, unknown>;
	const facts: ImageFacts = {};
	if (typeof uris.small === 'string') facts.small = uris.small;
	if (typeof uris.normal === 'string') facts.normal = uris.normal;

	return facts.small || facts.normal ? facts : undefined;
}

/**
 * Pull the renderable half out of whatever Scryfall (or an old fat record)
 * handed us. Returns `null` when there is nothing worth caching, so callers can
 * skip the write rather than store an empty row.
 */
export function extractCardFacts(card: unknown): CardFacts | null {
	if (!card || typeof card !== 'object') return null;

	const source = card as Record<string, unknown>;
	if (typeof source.id !== 'string') return null;

	const facts: CardFacts = { id: source.id };

	if (typeof source.set_name === 'string') facts.set_name = source.set_name;

	const imageUris = toImageFacts(source.image_uris);
	if (imageUris) facts.image_uris = imageUris;

	if (Array.isArray(source.card_faces)) {
		const faces: CardFaceFacts[] = [];
		for (const rawFace of source.card_faces) {
			const face = (rawFace ?? {}) as Record<string, unknown>;
			const entry: CardFaceFacts = {};
			if (typeof face.name === 'string') entry.name = face.name;
			const faceImages = toImageFacts(face.image_uris);
			if (faceImages) entry.image_uris = faceImages;
			faces.push(entry);
		}
		if (faces.length > 0) facts.card_faces = faces;
	}

	// `set_name` alone is worth caching (the collection filters on it); an id
	// with nothing attached is not.
	return facts.set_name || facts.image_uris || facts.card_faces ? facts : null;
}

/**
 * Whether an object carries its own renderable facts — true for a card fresh
 * from a Scryfall search, false for one loaded from the database. Lets the UI
 * render search results directly and fall back to the cache for stored cards.
 */
export function carriesCardFacts(card: unknown): boolean {
	if (!card || typeof card !== 'object') return false;
	const source = card as Record<string, unknown>;
	return Boolean(source.image_uris || source.card_faces || source.set_name);
}
