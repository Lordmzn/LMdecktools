/**
 * @vitest-environment jsdom
 *
 * The header's copy counter (#90) — how many places the collection exists,
 * escalating to the warning lane at one. Never green, never a checkmark (see
 * `docs/wireframes.md` → Feedback Colours): those rules are checked here by
 * class name rather than by trusting the component's own comments.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import CopyCounter from '../CopyCounter.svelte';
import { store } from '$lib/store.svelte';

afterEach(() => {
	cleanup();
	store.dbMode = 'none';
	store.installContext = 'browser';
	store.deviceId = null;
	store.copyRegistryEntries = [];
});

describe('CopyCounter', () => {
	it('renders nothing with no database open', () => {
		store.deviceId = null;
		const { queryByTestId } = render(CopyCounter, { onclick: vi.fn() });
		expect(queryByTestId('copy-counter')).toBeNull();
	});

	it('renders nothing in preview mode — deviceId is never provisioned there', () => {
		store.dbMode = 'active';
		store.installContext = 'ios-browser';
		store.deviceId = null;
		const { queryByTestId } = render(CopyCounter, { onclick: vi.fn() });
		expect(queryByTestId('copy-counter')).toBeNull();
	});

	it('warns, in the singular, at one copy', () => {
		store.dbMode = 'active';
		store.deviceId = 'device-a';
		store.copyRegistryEntries = [];
		const { getByTestId } = render(CopyCounter, { onclick: vi.fn() });

		const chip = getByTestId('copy-counter');
		expect(chip.textContent).toContain('1 copy');
		expect(chip.className).toContain('text-warning');
	});

	it('reads as neutral chrome above one copy, and never as success green', () => {
		store.dbMode = 'active';
		store.deviceId = 'device-a';
		store.copyRegistryEntries = [
			{ id: 'export', kind: 'export', label: 'backup.yjs', lastSeen: Date.now() }
		];
		const { getByTestId } = render(CopyCounter, { onclick: vi.fn() });

		const chip = getByTestId('copy-counter');
		expect(chip.textContent).toContain('2 copies');
		expect(chip.className).not.toContain('warning');
		expect(chip.className).not.toContain('success');
	});

	it('opens the Copies tab when clicked', async () => {
		store.dbMode = 'active';
		store.deviceId = 'device-a';
		const onclick = vi.fn();
		const { getByTestId } = render(CopyCounter, { onclick });

		getByTestId('copy-counter').click();
		expect(onclick).toHaveBeenCalledOnce();
	});
});
