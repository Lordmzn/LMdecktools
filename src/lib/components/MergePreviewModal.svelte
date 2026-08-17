<script lang="ts">
	/**
	 * What a linked-file merge is about to bring in (#77).
	 *
	 * The toast stays the notification — an unexpected file change should not
	 * throw a blocking dialog at someone mid-edit — and its Merge button opens
	 * this. Counts are card *copies*, and the collection always leads the list.
	 */
	import type { MergePreview } from '$lib/store.svelte';
	import type { CardsDelta } from '$lib/merge';
	import * as m from '$lib/paraglide/messages';

	let {
		show = $bindable(false),
		fileName,
		preview,
		loading = false,
		error = null,
		onconfirm,
		oncancel
	} = $props<{
		show: boolean;
		fileName: string;
		preview: MergePreview | null;
		loading?: boolean;
		error?: string | null;
		onconfirm: () => void;
		oncancel: () => void;
	}>();

	/** "4 cards added (3 new)" — the parenthetical only where it says something. */
	function describeDelta(delta: CardsDelta): string {
		const added =
			delta.added === 1
				? m.merge_delta_added_one({ count: delta.added })
				: m.merge_delta_added_other({ count: delta.added });

		// All copies new: "(4 new)" after "4 cards added" is noise. None new: every
		// copy tops up a card already held, which "N cards added" alone implies wrongly.
		if (delta.fromNewCards === delta.added) return added;
		if (delta.fromNewCards === 0) return `${added} ${m.merge_delta_all_copies()}`;
		return `${added} ${m.merge_delta_new({ count: delta.fromNewCards })}`;
	}

	function describeList(detail: MergePreview['lists'][number]): string {
		if (detail.status === 'added') {
			return detail.delta.added === 1
				? m.merge_delta_new_list_one({ count: detail.delta.added })
				: m.merge_delta_new_list_other({ count: detail.delta.added });
		}

		// A list can be in the merge purely because the newer side owns the
		// matching settings, with not a single card moving.
		if (detail.delta.added === 0) return m.merge_delta_settings();
		if (detail.settingsChanged) {
			return `${describeDelta(detail.delta)} · ${m.merge_delta_settings()}`;
		}
		return describeDelta(detail.delta);
	}

	let hasChanges = $derived(preview !== null && !preview.unchanged);
	let showsCollection = $derived(preview !== null && preview.collection.added > 0);

	function handleKeydown(event: KeyboardEvent) {
		if (show && event.key === 'Escape') oncancel();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
	<!-- The backdrop is decoration; Escape is handled on the window, so dismissing
	     it never depends on being able to click it. -->
	<div
		class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		onclick={(e) => {
			// Only the backdrop itself dismisses; a click inside the panel bubbles
			// here too, and stopping it on the panel would need a handler there.
			if (e.target === e.currentTarget) oncancel();
		}}
		role="presentation"
	>
		<div
			class="panel w-full max-w-lg rounded-xl p-6 shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label={m.merge_preview_aria()}
			tabindex="-1"
		>
			<h3 class="mb-3 text-lg font-bold text-slate-100">{m.merge_preview_title()}</h3>

			{#if loading}
				<p class="py-6 text-center text-sm text-slate-400">{m.merge_preview_loading()}</p>
			{:else if error}
				<p class="text-danger mb-5 text-sm" data-testid="merge-preview-error">{error}</p>
			{:else if preview && !hasChanges}
				<p class="mb-5 text-sm text-slate-400" data-testid="merge-preview-unchanged">
					{m.merge_preview_unchanged()}
				</p>
			{:else if preview}
				<p class="mb-4 text-sm text-slate-400">
					{m.merge_preview_intro({ name: fileName })}
				</p>

				<ul
					class="mb-4 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/50 p-3"
					data-testid="merge-preview-items"
				>
					{#if showsCollection}
						<li class="flex items-baseline justify-between gap-3 text-sm">
							<span class="font-medium text-slate-100">{m.merge_preview_collection()}</span>
							<span class="text-success text-right text-xs whitespace-nowrap">
								{describeDelta(preview.collection)}
							</span>
						</li>
					{/if}
					{#each preview.lists as detail (detail.name)}
						<li class="flex items-baseline justify-between gap-3 text-sm">
							<span class="truncate font-medium text-slate-100">{detail.name}</span>
							<span
								class="text-right text-xs whitespace-nowrap {detail.status === 'added'
									? 'text-success'
									: 'text-slate-400'}"
							>
								{describeList(detail)}
							</span>
						</li>
					{/each}
				</ul>

				<p class="mb-5 text-xs text-slate-500">{m.merge_preview_additive()}</p>
			{/if}

			<div class="flex gap-3">
				<button onclick={oncancel} class="btn btn-quiet flex-1">
					{hasChanges ? m.common_cancel() : m.merge_preview_close()}
				</button>
				{#if hasChanges}
					<button
						onclick={onconfirm}
						class="btn bg-warning-solid hover:bg-warning flex-1 text-slate-950"
						data-testid="merge-preview-confirm"
					>
						{m.merge_preview_confirm()}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
