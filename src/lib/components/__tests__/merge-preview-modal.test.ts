/**
 * @vitest-environment jsdom
 *
 * What the merge preview says is the whole point of it (#77): the user is being
 * asked to approve a write they cannot otherwise inspect. These pin the wording
 * of each delta case and the collection-first ordering.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/svelte';
import MergePreviewModal from '../MergePreviewModal.svelte';
import type { MergePreview } from '$lib/store.svelte';

function show(preview: MergePreview | null, extra: Record<string, unknown> = {}) {
	return render(MergePreviewModal, {
		props: {
			show: true,
			fileName: 'lmdecktools.yjs',
			preview,
			onconfirm: () => {},
			oncancel: () => {},
			...extra
		}
	});
}

/** The rendered lines, as `["Collection", "12 cards added (9 new)"]` pairs. */
function rows(): [string, string][] {
	const list = document.querySelector('[data-testid="merge-preview-items"]')!;
	return [...list.querySelectorAll('li')].map((li) => {
		const [name, delta] = [...li.querySelectorAll('span')].map((s) => s.textContent!.trim());
		return [name, delta];
	});
}

function preview(overrides: Partial<MergePreview> = {}): MergePreview {
	return {
		collection: { added: 0, fromNewCards: 0 },
		lists: [],
		unchanged: false,
		...overrides
	};
}

afterEach(cleanup);

describe('MergePreviewModal', () => {
	it('names the collection first, ahead of every list', () => {
		show(
			preview({
				collection: { added: 12, fromNewCards: 9 },
				lists: [
					{
						name: 'Atraxa',
						status: 'updated',
						delta: { added: 4, fromNewCards: 3 },
						settingsChanged: false
					}
				]
			})
		);

		expect(rows().map(([name]) => name)).toEqual(['Collection', 'Atraxa']);
	});

	it('reads "4 cards added (3 new)" when only some copies are of new cards', () => {
		show(
			preview({
				lists: [
					{
						name: 'Atraxa',
						status: 'updated',
						delta: { added: 4, fromNewCards: 3 },
						settingsChanged: false
					}
				]
			})
		);

		expect(rows()).toEqual([['Atraxa', '4 cards added (3 new)']]);
	});

	it('drops the parenthetical when every copy is new, and names the case when none is', () => {
		show(
			preview({
				lists: [
					{
						name: 'All New',
						status: 'updated',
						delta: { added: 4, fromNewCards: 4 },
						settingsChanged: false
					},
					{
						name: 'Top Ups',
						status: 'updated',
						delta: { added: 4, fromNewCards: 0 },
						settingsChanged: false
					}
				]
			})
		);

		expect(rows()).toEqual([
			['All New', '4 cards added'],
			['Top Ups', '4 cards added (all extra copies)']
		]);
	});

	it('describes a list that exists only in the file as new, with its size', () => {
		show(
			preview({
				lists: [
					{
						name: 'Modern Burn',
						status: 'added',
						delta: { added: 60, fromNewCards: 60 },
						settingsChanged: false
					}
				]
			})
		);

		expect(rows()).toEqual([['Modern Burn', 'new list, 60 cards']]);
	});

	it('says so when a list is in the merge but no card moves', () => {
		show(
			preview({
				lists: [
					{
						name: 'Atraxa',
						status: 'updated',
						delta: { added: 0, fromNewCards: 0 },
						settingsChanged: true
					}
				]
			})
		);

		expect(rows()).toEqual([['Atraxa', 'matching settings updated']]);
	});

	it('omits the collection row when the merge adds nothing to it', () => {
		show(
			preview({
				lists: [
					{
						name: 'Atraxa',
						status: 'updated',
						delta: { added: 1, fromNewCards: 1 },
						settingsChanged: false
					}
				]
			})
		);

		expect(rows().map(([name]) => name)).toEqual(['Atraxa']);
	});

	it('offers no Merge button when the file holds nothing new', () => {
		const { getByTestId, queryByTestId } = show(preview({ unchanged: true }));

		expect(getByTestId('merge-preview-unchanged')).toBeInTheDocument();
		expect(queryByTestId('merge-preview-confirm')).toBeNull();
		expect(queryByTestId('merge-preview-items')).toBeNull();
	});

	it('offers no Merge button while the file is still being read, or after it failed', () => {
		const loading = show(null, { loading: true });
		expect(loading.queryByTestId('merge-preview-confirm')).toBeNull();
		cleanup();

		const failed = show(null, { error: 'boom' });
		expect(failed.queryByTestId('merge-preview-confirm')).toBeNull();
		expect(failed.getByTestId('merge-preview-error')).toHaveTextContent('boom');
	});

	it('promises that nothing is removed, which is the reassurance the merge rests on', () => {
		const { getByRole } = show(
			preview({
				lists: [
					{
						name: 'Atraxa',
						status: 'updated',
						delta: { added: 1, fromNewCards: 1 },
						settingsChanged: false
					}
				]
			})
		);

		expect(within(getByRole('dialog')).getByText(/Nothing will be removed/)).toBeInTheDocument();
	});
});
