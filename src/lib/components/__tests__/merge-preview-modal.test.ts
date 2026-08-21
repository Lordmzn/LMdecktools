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
		collection: { added: 0, fromNewCards: 0, removed: 0 },
		lists: [],
		unchanged: false,
		operation: 'union',
		...overrides
	};
}

afterEach(cleanup);

describe('MergePreviewModal', () => {
	it('names the collection first, ahead of every list', () => {
		show(
			preview({
				collection: { added: 12, fromNewCards: 9, removed: 0 },
				lists: [
					{
						name: 'Atraxa',
						status: 'updated',
						delta: { added: 4, fromNewCards: 3, removed: 0 },
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
						delta: { added: 4, fromNewCards: 3, removed: 0 },
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
						delta: { added: 4, fromNewCards: 4, removed: 0 },
						settingsChanged: false
					},
					{
						name: 'Top Ups',
						status: 'updated',
						delta: { added: 4, fromNewCards: 0, removed: 0 },
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
						delta: { added: 60, fromNewCards: 60, removed: 0 },
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
						delta: { added: 0, fromNewCards: 0, removed: 0 },
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
						delta: { added: 1, fromNewCards: 1, removed: 0 },
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

	/**
	 * Same bytes, two operations (#47, C4). A union never removes anything; a
	 * merge with this database's own lineage can, and the modal has to say which
	 * one the user is looking at before they commit to it.
	 */
	it('promises that nothing is removed when the file is unioned in', () => {
		const { getByRole } = show(
			preview({
				operation: 'union',
				lists: [
					{
						name: 'Atraxa',
						status: 'updated',
						delta: { added: 1, fromNewCards: 1, removed: 0 },
						settingsChanged: false
					}
				]
			})
		);

		expect(
			within(getByRole('dialog')).getByText(/nothing of yours is removed/)
		).toBeInTheDocument();
	});

	it('warns that a merge carries deletions across', () => {
		const { getByRole } = show(
			preview({
				operation: 'merge',
				lists: [
					{
						name: 'Atraxa',
						status: 'updated',
						delta: { added: 0, fromNewCards: 0, removed: 3 },
						settingsChanged: false
					}
				]
			})
		);

		const dialog = within(getByRole('dialog'));
		expect(dialog.getByText(/including anything deleted there/)).toBeInTheDocument();
		// The change users will not expect, spelled out rather than netted off.
		expect(dialog.getByText('3 cards removed')).toBeInTheDocument();
	});

	it('names a list deleted on the other device', () => {
		const { getByRole } = show(
			preview({
				operation: 'merge',
				lists: [
					{
						name: 'Retired Deck',
						status: 'removed',
						delta: { added: 0, fromNewCards: 0, removed: 60 },
						settingsChanged: false
					}
				]
			})
		);

		expect(
			within(getByRole('dialog')).getByText(/list deleted on the other device/)
		).toBeInTheDocument();
	});
});
