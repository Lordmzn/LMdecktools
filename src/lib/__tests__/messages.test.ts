/**
 * Catalogue integrity (#39).
 *
 * Paraglide compiles a missing key into a function that returns the key name, so
 * a forgotten translation ships as `db_restore_title` rendered on the page rather
 * than as a build failure. These tests are the thing that fails instead.
 */

import { describe, it, expect } from 'vitest';
import en from '../../../messages/en.json';
import itIt from '../../../messages/it-it.json';
import { availableLanguageTags, sourceLanguageTag } from '../paraglide/runtime';

const CATALOGUES: Record<string, Record<string, string>> = {
	en: en as Record<string, string>,
	'it-it': itIt as Record<string, string>
};

/** `{name}` placeholders, which must match across locales or the value goes missing. */
function params(pattern: string): string[] {
	return [...pattern.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

function keysOf(catalogue: Record<string, string>): string[] {
	return Object.keys(catalogue)
		.filter((key) => !key.startsWith('$'))
		.sort();
}

describe('message catalogues', () => {
	it('covers every configured language tag', () => {
		expect(Object.keys(CATALOGUES).sort()).toEqual([...availableLanguageTags].sort());
		expect(sourceLanguageTag).toBe('en');
	});

	it.each(availableLanguageTags.filter((tag) => tag !== 'en'))(
		'%s translates exactly the keys en does',
		(tag) => {
			const source = keysOf(CATALOGUES.en);
			const target = keysOf(CATALOGUES[tag]);

			expect(target.filter((key) => !source.includes(key))).toEqual([]);
			expect(source.filter((key) => !target.includes(key))).toEqual([]);
		}
	);

	it.each(availableLanguageTags.filter((tag) => tag !== 'en'))(
		'%s uses the same placeholders as en in every message',
		(tag) => {
			const mismatched = keysOf(CATALOGUES.en)
				.filter((key) => params(CATALOGUES.en[key]).join() !== params(CATALOGUES[tag][key]).join())
				.map((key) => ({
					key,
					en: params(CATALOGUES.en[key]),
					translated: params(CATALOGUES[tag][key])
				}));

			expect(mismatched).toEqual([]);
		}
	);

	it('has a translation for every singular/plural partner', () => {
		const orphans = keysOf(CATALOGUES.en)
			.filter((key) => key.endsWith('_one'))
			.filter((key) => !CATALOGUES.en[`${key.slice(0, -4)}_other`]);

		expect(orphans).toEqual([]);
	});

	it('leaves no message empty', () => {
		for (const [tag, catalogue] of Object.entries(CATALOGUES)) {
			const empty = keysOf(catalogue).filter((key) => catalogue[key].trim() === '');
			expect(empty, `empty messages in ${tag}`).toEqual([]);
		}
	});
});
