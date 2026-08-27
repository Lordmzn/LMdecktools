<script lang="ts">
	/**
	 * Receiving half of the Android share sheet (#91, T2).
	 *
	 * `src/service-worker.ts` intercepts the OS's POST to this route's `action`
	 * (declared in `manifest.webmanifest/+server.ts`), stashes the shared file in
	 * a dedicated cache, and 303-redirects here as a plain GET — a service
	 * worker's response to a share-target POST cannot itself be the page. This
	 * component's whole job is reading that stash back out.
	 *
	 * From there it is the same pipeline as the sibling-import card in the
	 * In-browser DB tab (`DBSelectionModal.svelte`): `previewPayload()` decodes
	 * the T2b `.json` envelope through the same format-detection `importDatabase`
	 * uses, `MergePreviewModal` shows the merge-vs-union classification, and
	 * `importDatabase()` commits. A shared file is not recorded in the copy
	 * registry — unlike a sibling's `.ydelta`, it is not a location this device
	 * can point back to and re-read later.
	 */
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import MergePreviewModal from '$lib/components/MergePreviewModal.svelte';
	import {
		store,
		previewPayload,
		importDatabase,
		logAppError,
		type MergePreview
	} from '$lib/store.svelte';
	import { ImportValidationError } from '$lib/import-guard';
	import { takeShareStash } from '$lib/share-target-stash';
	import * as m from '$lib/paraglide/messages';

	type ViewState = 'loading' | 'empty' | 'no-database' | 'previewing' | 'done' | 'error';

	let view = $state<ViewState>('loading');
	let sharedData: Uint8Array | null = null;
	let preview = $state<MergePreview | null>(null);
	let previewError = $state<string | null>(null);
	let showPreview = $state(false);
	let result = $state<{ imported: number; merged: number; errors: number } | null>(null);
	let errorMessage = $state<string | null>(null);

	async function beginPreview(data: Uint8Array) {
		sharedData = data;
		showPreview = true;
		try {
			preview = previewPayload(data);
			previewError = null;
		} catch (e) {
			if (e instanceof ImportValidationError) {
				showPreview = false;
				view = 'error';
				errorMessage = e.message;
				return;
			}
			logAppError('import', e, { operation: 'previewSharedFile' });
			previewError = m.merge_preview_error();
		}
	}

	async function handleConfirm() {
		showPreview = false;
		if (!sharedData) return;
		try {
			result = await importDatabase(sharedData, true);
			view = 'done';
		} catch (e) {
			logAppError('import', e, { operation: 'importSharedFile' });
			view = 'error';
			errorMessage = e instanceof Error ? e.message : m.db_could_not_read_file();
		}
	}

	function handleCancel() {
		showPreview = false;
		view = 'empty';
	}

	onMount(async () => {
		const data = await takeShareStash();
		if (!data) {
			view = 'empty';
			return;
		}

		// startSession() (`+layout.svelte`) races this on a cold navigation, so
		// the mode this component sees on mount may still be stale — poll briefly
		// rather than sending someone with a database straight to the empty view.
		for (let attempt = 0; store.dbMode !== 'active' && attempt < 20; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		if (store.dbMode !== 'active') {
			view = 'no-database';
			return;
		}

		view = 'previewing';
		await beginPreview(data);
	});
</script>

<PageMeta title={m.share_target_meta_title()} description={m.share_target_meta_description()} />

<div class="mx-auto max-w-lg p-4">
	<div class="surface-card p-6">
		<div class="eyebrow mb-1">{m.share_target_eyebrow()}</div>
		<h1 class="mb-4 text-2xl font-extrabold tracking-tight text-white">
			{m.share_target_title()}
		</h1>

		{#if view === 'loading'}
			<p class="text-sm text-slate-400">{m.share_target_loading()}</p>
		{:else if view === 'empty'}
			<p class="text-sm text-slate-400">{m.share_target_empty()}</p>
		{:else if view === 'no-database'}
			<p class="text-sm text-slate-400">{m.share_target_no_database()}</p>
		{:else if view === 'done' && result}
			<p class="text-success mb-4 text-sm">
				{result.imported === 1
					? m.share_target_done_one({ count: result.imported })
					: m.share_target_done_other({ count: result.imported })}
			</p>
		{:else if view === 'error'}
			<p class="text-danger mb-4 text-sm" data-testid="share-target-error">
				{errorMessage}
			</p>
		{/if}

		{#if view !== 'loading' && view !== 'previewing'}
			<a href="{base}/" class="btn btn-primary mt-2 inline-block">
				{m.share_target_home_link()}
			</a>
		{/if}
	</div>
</div>

<MergePreviewModal
	bind:show={showPreview}
	fileName={m.share_target_title()}
	{preview}
	error={previewError}
	onconfirm={handleConfirm}
	oncancel={handleCancel}
/>
