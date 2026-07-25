<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { compareCardLists, exportCompareToText, type CompareResult } from '$lib/compare';
	import type { CardMatching, LanguageMatching } from '$lib/db';
	import CompareColumn from './CompareColumn.svelte';

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

<!-- Export Modal -->
{#if showExportModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showExportModal = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Export Comparison"
	>
		<div
			class="panel w-full max-w-lg rounded-xl p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-4 text-xl font-bold text-neutral-100">Export Comparison</h2>
			<pre
				data-testid="export-text"
				class="h-64 w-full overflow-auto rounded-lg border border-neutral-700 bg-neutral-800 p-3 font-mono text-sm whitespace-pre-wrap text-neutral-300">{exportText}</pre>
			<div class="mt-4 flex justify-end gap-2">
				<button
					onclick={() => navigator.clipboard.writeText(exportText)}
					class="rounded-lg border border-neutral-700 px-4 py-2 text-neutral-300 transition hover:bg-neutral-800"
				>
					Copy
				</button>
				<button
					onclick={() => (showExportModal = false)}
					class="rounded-lg bg-orange-500 px-4 py-2 text-neutral-100 transition hover:bg-orange-600"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="mx-auto max-w-7xl p-4">
	<!-- Guard: need at least 2 lists -->
	{#if lists.length < 2}
		<div class="panel rounded-xl p-8 text-center">
			<p class="mb-4 text-neutral-400">You need at least two card lists to compare.</p>
			<a
				href="/card-lists"
				class="inline-block rounded-lg bg-orange-500 px-4 py-2 text-neutral-100 transition hover:bg-orange-600"
			>
				Back to Card Lists
			</a>
		</div>
	{:else}
		<!-- Header panel -->
		<div class="panel mb-6 rounded-xl p-6">
			<div class="mb-4 flex items-center gap-2">
				<a
					href="/card-lists"
					class="rounded-lg p-2 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
					title="Back to Card Lists"
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
				<h1 class="text-xl font-bold text-neutral-100">Compare Lists</h1>
			</div>

			<!-- List selectors -->
			<div class="mb-4 flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-amber-400">List A:</span>
					<select
						bind:value={indexA}
						class="min-w-[160px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
					>
						{#each lists as list, i (list.id ?? i)}
							<option value={i}>{list.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-blue-400">List B:</span>
					<select
						bind:value={indexB}
						class="min-w-[160px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
					>
						{#each lists as list, i (list.id ?? i)}
							<option value={i}>{list.name}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Matching toggles -->
			<div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
				<div class="flex items-center gap-2">
					<span class="font-medium text-neutral-400">Card Matching:</span>
					<button
						onclick={() => (matching = 'generic')}
						class="rounded-l-lg border border-neutral-700 px-3 py-1 transition {matching ===
						'generic'
							? 'bg-orange-500 text-neutral-100'
							: 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
					>
						Generic
					</button>
					<button
						onclick={() => (matching = 'specific')}
						class="-ml-px rounded-r-lg border border-neutral-700 px-3 py-1 transition {matching ===
						'specific'
							? 'bg-orange-500 text-neutral-100'
							: 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
					>
						Specific
					</button>
				</div>
				<div class="flex items-center gap-2">
					<span class="font-medium text-neutral-400">Language:</span>
					<button
						onclick={() => (languageMatching = 'any')}
						class="rounded-l-lg border border-neutral-700 px-3 py-1 transition {languageMatching ===
						'any'
							? 'bg-orange-500 text-neutral-100'
							: 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
					>
						Any
					</button>
					<button
						onclick={() => (languageMatching = 'strict')}
						class="-ml-px rounded-r-lg border border-neutral-700 px-3 py-1 transition {languageMatching ===
						'strict'
							? 'bg-orange-500 text-neutral-100'
							: 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}"
					>
						Strict
					</button>
				</div>

				<button
					onclick={handleExport}
					disabled={result.onlyInA.length === 0 &&
						result.inBoth.length === 0 &&
						result.onlyInB.length === 0}
					class="rounded-lg bg-neutral-800 px-4 py-2 text-neutral-300 transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Export
				</button>
			</div>

			<!-- Summary badges -->
			<div class="flex flex-wrap gap-2">
				<span
					class="rounded-lg border border-amber-800 bg-amber-950 px-3 py-1 text-sm text-amber-400"
				>
					{result.onlyInA.length} only in A
				</span>
				<span
					class="rounded-lg border border-green-800 bg-green-950 px-3 py-1 text-sm text-green-400"
				>
					{result.inBoth.length} in both
				</span>
				<span class="rounded-lg border border-blue-800 bg-blue-950 px-3 py-1 text-sm text-blue-400">
					{result.onlyInB.length} only in B
				</span>
			</div>
		</div>

		<!-- Desktop: 3-column grid (lg+) -->
		<div class="hidden gap-4 lg:grid lg:grid-cols-3">
			<CompareColumn title="Only in {listA?.name ?? 'A'}" color="amber" cards={result.onlyInA} />
			<CompareColumn
				title="In Both Lists"
				color="green"
				cards={result.inBoth}
				showBothQuantities
				nameA={listA?.name ?? 'A'}
				nameB={listB?.name ?? 'B'}
			/>
			<CompareColumn title="Only in {listB?.name ?? 'B'}" color="blue" cards={result.onlyInB} />
		</div>

		<!-- Mobile: tab bar + single column -->
		<div class="lg:hidden">
			<div class="mb-4 flex rounded-lg border border-neutral-700 bg-neutral-800 text-sm">
				<button
					onclick={() => (activeTab = 'onlyA')}
					class="flex-1 rounded-l-lg px-3 py-2 transition {activeTab === 'onlyA'
						? 'bg-amber-500 text-neutral-100'
						: 'text-neutral-300 hover:bg-neutral-700'}"
				>
					Only A ({result.onlyInA.length})
				</button>
				<button
					onclick={() => (activeTab = 'both')}
					class="flex-1 border-x border-neutral-700 px-3 py-2 transition {activeTab === 'both'
						? 'bg-green-500 text-neutral-100'
						: 'text-neutral-300 hover:bg-neutral-700'}"
				>
					Both ({result.inBoth.length})
				</button>
				<button
					onclick={() => (activeTab = 'onlyB')}
					class="flex-1 rounded-r-lg px-3 py-2 transition {activeTab === 'onlyB'
						? 'bg-blue-500 text-neutral-100'
						: 'text-neutral-300 hover:bg-neutral-700'}"
				>
					Only B ({result.onlyInB.length})
				</button>
			</div>

			{#if activeTab === 'onlyA'}
				<CompareColumn title="Only in {listA?.name ?? 'A'}" color="amber" cards={result.onlyInA} />
			{:else if activeTab === 'both'}
				<CompareColumn
					title="In Both Lists"
					color="green"
					cards={result.inBoth}
					showBothQuantities
					nameA={listA?.name ?? 'A'}
					nameB={listB?.name ?? 'B'}
				/>
			{:else}
				<CompareColumn title="Only in {listB?.name ?? 'B'}" color="blue" cards={result.onlyInB} />
			{/if}
		</div>
	{/if}
</div>
