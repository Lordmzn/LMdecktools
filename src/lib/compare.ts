/**
 * Pure comparison logic for card lists.
 * No Svelte dependencies — safe to unit-test directly.
 */

import type { Card, CardMatching, LanguageMatching } from './db';

export interface ComparedCard {
	/** Representative card object (from list A if present, else list B) */
	card: Card;
	/** Aggregated quantity in list A (0 if absent) */
	quantityA: number;
	/** Aggregated quantity in list B (0 if absent) */
	quantityB: number;
}

export interface CompareResult {
	onlyInA: ComparedCard[];
	inBoth: ComparedCard[];
	onlyInB: ComparedCard[];
}

/**
 * Build a grouping key for a card based on matching + language settings.
 */
function cardKey(card: Card, matching: CardMatching, lang: LanguageMatching): string {
	if (matching === 'generic') {
		const base = card.name.toLowerCase();
		return lang === 'strict' ? `${base}|${card.lang ?? ''}` : base;
	}
	// specific
	return lang === 'strict' ? `${card.id}|${card.lang ?? ''}` : card.id;
}

/**
 * Group cards by key, summing LM_quantity.
 * Returns a Map of key → { card, totalQty }.
 */
function groupCards(
	cards: Card[],
	matching: CardMatching,
	lang: LanguageMatching
): Map<string, { card: Card; totalQty: number }> {
	const map = new Map<string, { card: Card; totalQty: number }>();
	for (const c of cards) {
		const key = cardKey(c, matching, lang);
		const existing = map.get(key);
		if (existing) {
			existing.totalQty += c.LM_quantity;
		} else {
			map.set(key, { card: c, totalQty: c.LM_quantity });
		}
	}
	return map;
}

/**
 * Compare two card lists and return three buckets: only-A, both, only-B.
 */
export function compareCardLists(
	cardsA: Card[],
	cardsB: Card[],
	matching: CardMatching,
	languageMatching: LanguageMatching
): CompareResult {
	const mapA = groupCards(cardsA, matching, languageMatching);
	const mapB = groupCards(cardsB, matching, languageMatching);

	const onlyInA: ComparedCard[] = [];
	const inBoth: ComparedCard[] = [];
	const onlyInB: ComparedCard[] = [];

	for (const [key, { card, totalQty }] of mapA) {
		const b = mapB.get(key);
		if (b) {
			inBoth.push({ card, quantityA: totalQty, quantityB: b.totalQty });
		} else {
			onlyInA.push({ card, quantityA: totalQty, quantityB: 0 });
		}
	}

	for (const [key, { card, totalQty }] of mapB) {
		if (!mapA.has(key)) {
			onlyInB.push({ card, quantityA: 0, quantityB: totalQty });
		}
	}

	return { onlyInA, inBoth, onlyInB };
}

/**
 * Export a comparison result to a human-readable text string.
 */
export function exportCompareToText(
	result: CompareResult,
	nameA: string,
	nameB: string
): string {
	let text = '';

	text += `# Only in ${nameA}\n\n`;
	if (result.onlyInA.length === 0) {
		text += '(none)\n';
	} else {
		for (const c of result.onlyInA) {
			text += `${c.quantityA} ${c.card.name}\n`;
		}
	}

	text += `\n# In Both Lists\n\n`;
	if (result.inBoth.length === 0) {
		text += '(none)\n';
	} else {
		for (const c of result.inBoth) {
			text += `${c.quantityA}/${c.quantityB} ${c.card.name}\n`;
		}
	}

	text += `\n# Only in ${nameB}\n\n`;
	if (result.onlyInB.length === 0) {
		text += '(none)\n';
	} else {
		for (const c of result.onlyInB) {
			text += `${c.quantityB} ${c.card.name}\n`;
		}
	}

	return text;
}
