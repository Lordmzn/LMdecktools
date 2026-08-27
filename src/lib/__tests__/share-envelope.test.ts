import { describe, it, expect } from 'vitest';
import { buildShareEnvelope, encodeUpdate, decodeUpdate, isShareEnvelope } from '../share-envelope';

describe('share envelope (#91, T2b)', () => {
	it('round-trips arbitrary bytes through base64', () => {
		const bytes = new Uint8Array([0, 1, 2, 254, 255, 128, 42]);
		expect(decodeUpdate(encodeUpdate(bytes))).toEqual(bytes);
	});

	it('round-trips a payload well past the String.fromCharCode argument-spread limit', () => {
		// A 2,000-card document is ~428 KB per C0 — comfortably past the point a
		// naive `String.fromCharCode(...bytes)` blows the call stack.
		const bytes = new Uint8Array(500_000);
		for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
		expect(decodeUpdate(encodeUpdate(bytes))).toEqual(bytes);
	});

	it('builds an envelope carrying app, guid and schema_version alongside the update', () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const json = buildShareEnvelope(bytes, {
			app: 'LM Deck Tools',
			guid: 'abc-123',
			schemaVersion: '2'
		});
		const parsed = JSON.parse(json);

		expect(parsed).toEqual({
			app: 'LM Deck Tools',
			guid: 'abc-123',
			schema_version: '2',
			update: encodeUpdate(bytes)
		});
	});

	describe('isShareEnvelope', () => {
		it('identifies an envelope by its update field', () => {
			expect(isShareEnvelope({ update: 'abc' })).toBe(true);
		});

		it('rejects the legacy plain-JSON shape', () => {
			expect(isShareEnvelope({ cardLists: [], collection: [] })).toBe(false);
		});

		it('rejects arrays, null and primitives', () => {
			expect(isShareEnvelope([])).toBe(false);
			expect(isShareEnvelope(null)).toBe(false);
			expect(isShareEnvelope('update')).toBe(false);
			expect(isShareEnvelope(42)).toBe(false);
		});
	});
});
