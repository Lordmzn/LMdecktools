<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { compareCardLists, exportCompareToText, type CompareResult } from '$lib/compare';
	import type { CardMatching, LanguageMatching } from '$lib/db';
	import CompareColumn from './CompareColumn.svelte';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import * as m from '$lib/paraglide/messages';

	let indexA = $state(0);
	let indexB = $state(1);
	let matching = $state<CardMatching>('generic');
	let languageMatching = $state<LanguageMatching>('any');
	let activeTab = $state<'onlyA' | 'both' | 'onlyB'>('onlyA');
	let showExportModal = $state(false);
	let exportText = $state('');

	let lists = $derived(store.savedCardLists);
	let listA = $derived(lists[indexA] ?? null);
	let listB = $derived(lists[indexB] ?? null);

	let result = $derived<CompareResult>(
		listA && listB
			? compareCardLists(listA.cards, listB.cards, matching, languageMatching)
			: { onlyInA: [], inBoth: [], onlyInB: [] }
	);

	function handleExport() {
		exportText = exportCompareToText(result, listA?.name ?? 'A', listB?.name ?? 'B');
		showExportModal = true;
	}
</script>

<PageMeta title={m.compare_meta_title()} description={m.compare_meta_description()} />

<!-- Export Modal -->
{#if showExportModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showExportModal = false)}
		role="dialog"
		aria-modal="true"
		aria-label={m.compare_export_modal_title()}
	>
		<div
			class="panel w-full max-w-lg rounded-xl p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-4 text-xl font-bold text-slate-100">{m.compare_export_modal_title()}</h2>
			<pre
				data-testid="export-text"
				class="h-64 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-800 p-3 font-mono text-sm whitespace-pre-wrap text-slate-300">{exportText}</pre>
			<div class="mt-4 flex justify-end gap-2">
				<button onclick={() => navigator.clipboard.writeText(exportText)} class="btn btn-quiet">
					{m.common_copy()}
				</button>
				<button onclick={() => (showExportModal = false)} class="btn btn-primary"
					>{m.common_close()}</button
				>
			</div>
		</div>
	</div>
{/if}

<div class="mx-auto max-w-7xl p-4">
	<!-- Guard: need at least 2 lists -->
	{#if lists.length < 2}
		<div class="surface-card p-8 text-center">
			<p class="mb-4 text-slate-400">{m.compare_need_two_lists()}</p>
			<a href="/card-lists" class="btn btn-primary inline-block">{m.compare_back_to_lists()}</a>
		</div>
	{:else}
		<!-- Header panel -->
		<div class="surface-card mb-6 p-6">
			<div class="mb-4 flex items-center gap-2">
				<a
					href="/card-lists"
					class="rounded-lg p-2 text-slate-400 transition hover:bg-orange-500/[0.08] hover:text-orange-300"
					title={m.compare_back_to_lists()}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="m15 18-6-6 6-6" />
					</svg>
				</a>
				<div>
					<div class="eyebrow">{m.compare_eyebrow()}</div>
					<h1 class="text-xl font-extrabold tracking-tight text-white">{m.compare_title()}</h1>
				</div>
			</div>

			<!-- List selectors -->
			<div class="mb-4 flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="text-cat-parchment text-sm font-medium">{m.compare_list_a()}</span>
					<select bind:value={indexA} class="field min-w-[160px]">
						{#each lists as list, i (list.id ?? i)}
							<option value={i}>{list.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-cat-steel text-sm font-medium">{m.compare_list_b()}</span>
					<select bind:value={indexB} class="field min-w-[160px]">
						{#each lists as list, i (list.id ?? i)}
							<option value={i}>{list.name}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Matching toggles -->
			<div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
				<div class="flex items-center gap-2">
					<span class="font-medium text-slate-400">{m.common_card_matching_label()}</span>
					<div class="inline-flex">
						<button
							onclick={() => (matching = 'generic')}
							class="seg seg-l {matching === 'generic' ? 'seg-active' : ''}"
						>
							{m.common_generic()}
						</button>
						<button
							onclick={() => (matching = 'specific')}
							class="seg seg-r {matching === 'specific' ? 'seg-active' : ''}"
						>
							{m.common_specific()}
						</button>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="font-medium text-slate-400">{m.common_language_label()}</span>
					<div class="inline-flex">
						<button
							onclick={() => (languageMatching = 'any')}
							class="seg seg-l {languageMatching === 'any' ? 'seg-active' : ''}"
						>
							{m.common_any()}
						</button>
						<button
							onclick={() => (languageMatching = 'strict')}
							class="seg seg-r {languageMatching === 'strict' ? 'seg-active' : ''}"
						>
							{m.common_strict()}
						</button>
					</div>
				</div>

				<button
					onclick={handleExport}
					disabled={result.onlyInA.length === 0 &&
						result.inBoth.length === 0 &&
						result.onlyInB.length === 0}
					class="btn btn-quiet disabled:cursor-not-allowed disabled:opacity-50"
				>
					{m.common_export()}
				</button>
			</div>

			<!-- Summary badges -->
			<div class="flex flex-wrap gap-2">
				<span
					class="border-cat-parchment-edge bg-cat-parchment-surface text-cat-parchment rounded-lg border px-3 py-1 text-sm"
				>
					{m.compare_badge_only_a({ count: result.onlyInA.length })}
				</span>
				<span
					class="border-cat-sea-edge bg-cat-sea-surface text-cat-sea rounded-lg border px-3 py-1 text-sm"
				>
					{m.compare_badge_both({ count: result.inBoth.length })}
				</span>
				<span
					class="border-cat-steel-edge bg-cat-steel-surface text-cat-steel rounded-lg border px-3 py-1 text-sm"
				>
					{m.compare_badge_only_b({ count: result.onlyInB.length })}
				</span>
			</div>
		</div>

		<!-- Desktop: 3-column grid (lg+) -->
		<div class="hidden gap-4 lg:grid lg:grid-cols-3">
			<CompareColumn
				title={m.compare_column_only_in({ name: listA?.name ?? 'A' })}
				color="onlyA"
				cards={result.onlyInA}
			/>
			<CompareColumn
				title={m.compare_column_both()}
				color="both"
				cards={result.inBoth}
				showBothQuantities
				nameA={listA?.name ?? 'A'}
				nameB={listB?.name ?? 'B'}
			/>
			<CompareColumn
				title={m.compare_column_only_in({ name: listB?.name ?? 'B' })}
				color="onlyB"
				cards={result.onlyInB}
			/>
		</div>

		<!-- Mobile: tab bar + single column -->
		<div class="lg:hidden">
			<div class="mb-4 flex rounded-lg border border-slate-700 bg-slate-800 text-sm">
				<button
					onclick={() => (activeTab = 'onlyA')}
					class="flex-1 rounded-l-lg px-3 py-2 transition {activeTab === 'onlyA'
						? 'bg-cat-parchment-solid text-slate-950'
						: 'text-slate-300 hover:bg-slate-700'}"
				>
					{m.compare_tab_only_a({ count: result.onlyInA.length })}
				</button>
				<button
					onclick={() => (activeTab = 'both')}
					class="flex-1 border-x border-slate-700 px-3 py-2 transition {activeTab === 'both'
						? 'bg-cat-sea-solid text-slate-950'
						: 'text-slate-300 hover:bg-slate-700'}"
				>
					{m.compare_tab_both({ count: result.inBoth.length })}
				</button>
				<button
					onclick={() => (activeTab = 'onlyB')}
					class="flex-1 rounded-r-lg px-3 py-2 transition {activeTab === 'onlyB'
						? 'bg-cat-steel-solid text-slate-950'
						: 'text-slate-300 hover:bg-slate-700'}"
				>
					{m.compare_tab_only_b({ count: result.onlyInB.length })}
				</button>
			</div>

			{#if activeTab === 'onlyA'}
				<CompareColumn
					title={m.compare_column_only_in({ name: listA?.name ?? 'A' })}
					color="onlyA"
					cards={result.onlyInA}
				/>
			{:else if activeTab === 'both'}
				<CompareColumn
					title={m.compare_column_both()}
					color="both"
					cards={result.inBoth}
					showBothQuantities
					nameA={listA?.name ?? 'A'}
					nameB={listB?.name ?? 'B'}
				/>
			{:else}
				<CompareColumn
					title={m.compare_column_only_in({ name: listB?.name ?? 'B' })}
					color="onlyB"
					cards={result.onlyInB}
				/>
			{/if}
		</div>
	{/if}
</div>
