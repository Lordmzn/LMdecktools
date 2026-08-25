<script lang="ts">
	import {
		store,
		loadErrorJournal,
		clearErrorJournal,
		isErrorJournalAvailable
	} from '$lib/store.svelte';
	import {
		ERROR_CATEGORIES,
		MAX_AGE_DAYS,
		MAX_ENTRIES,
		buildGitHubIssueUrl,
		exportErrorJournal,
		formatEntriesAsMarkdown,
		type ErrorCategory,
		type ErrorEntry
	} from '$lib/error-journal';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import { triggerDownload } from '$lib/download';
	import * as m from '$lib/paraglide/messages';

	let entries = $state<ErrorEntry[]>([]);
	let loaded = $state(false);
	let journalAvailable = $state(true);
	let categoryFilter = $state<ErrorCategory | 'all'>('all');
	let searchText = $state('');
	let selectedIds = $state<number[]>([]);
	let expandedIds = $state<number[]>([]);
	let showClearConfirm = $state(false);
	let showReportPreview = $state(false);

	// Category → badge tint, drawn from the categorical lane (#40). A category is
	// a label, not an alarm — every entry in this list is already an error, so
	// tinting one of them redder than the rest would rank them by hue rather than
	// by what they are. Matched lightness across all six is the point.
	const CATEGORY_STYLES: Record<ErrorCategory, string> = {
		'scryfall-api': 'border-cat-steel/30 bg-cat-steel/10 text-cat-steel',
		indexeddb: 'border-cat-violet/30 bg-cat-violet/10 text-cat-violet',
		'linked-file': 'border-cat-parchment/30 bg-cat-parchment/10 text-cat-parchment',
		import: 'border-cat-sea/30 bg-cat-sea/10 text-cat-sea',
		unhandled: 'border-cat-rose/30 bg-cat-rose/10 text-cat-rose',
		unknown: 'border-cat-stone/30 bg-cat-stone/10 text-cat-stone'
	};

	// Keyed on dbMode, not onMount: the layout's tryAutoLoadDB() often opens the
	// database after this page has mounted, and the journal is unreachable until it does.
	$effect(() => {
		void store.dbMode;
		void refresh();
	});

	async function refresh() {
		journalAvailable = isErrorJournalAvailable();
		entries = await loadErrorJournal();
		loaded = true;
	}

	let filteredEntries = $derived(
		entries.filter((entry) => {
			if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
			if (searchText.trim() === '') return true;
			const needle = searchText.toLowerCase();
			return (
				entry.message.toLowerCase().includes(needle) ||
				entry.category.includes(needle) ||
				JSON.stringify(entry.context ?? {})
					.toLowerCase()
					.includes(needle)
			);
		})
	);

	let selectedEntries = $derived(entries.filter((entry) => selectedIds.includes(entry.id!)));

	function toggleSelected(id: number) {
		selectedIds = selectedIds.includes(id)
			? selectedIds.filter((s) => s !== id)
			: [...selectedIds, id];
	}

	function toggleExpanded(id: number) {
		expandedIds = expandedIds.includes(id)
			? expandedIds.filter((s) => s !== id)
			: [...expandedIds, id];
	}

	function selectAllFiltered() {
		selectedIds = filteredEntries.map((entry) => entry.id!);
	}

	function handleExport() {
		triggerDownload(
			exportErrorJournal(entries),
			`lm-decktools-errors-${new Date().toISOString().slice(0, 10)}.json`,
			'application/json'
		);
	}

	async function handleClear() {
		await clearErrorJournal();
		showClearConfirm = false;
		selectedIds = [];
		expandedIds = [];
		await refresh();
	}

	function handleReport() {
		window.open(buildGitHubIssueUrl(selectedEntries), '_blank', 'noopener,noreferrer');
		showReportPreview = false;
	}

	function formatTimestamp(timestamp: number): string {
		return new Date(timestamp).toLocaleString();
	}
</script>

<PageMeta title={m.diagnostics_meta_title()} description={m.diagnostics_meta_description()} />

<div class="mx-auto max-w-5xl p-4">
	<div class="surface-card p-6">
		<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
			<div>
				<div class="eyebrow mb-1">{m.diagnostics_eyebrow()}</div>
				<h1 class="text-3xl font-extrabold tracking-tight text-white">{m.diagnostics_title()}</h1>
				<p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
					{m.diagnostics_intro({ maxEntries: MAX_ENTRIES, maxAgeDays: MAX_AGE_DAYS })}
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<button onclick={handleExport} disabled={entries.length === 0} class="btn btn-ghost btn-sm">
					{m.diagnostics_export_json()}
				</button>
				<button
					onclick={() => (showClearConfirm = true)}
					disabled={entries.length === 0}
					class="btn btn-danger btn-sm"
				>
					{m.diagnostics_clear_all()}
				</button>
			</div>
		</div>

		{#if !journalAvailable}
			<div class="py-12 text-center text-slate-400">
				<p>{m.diagnostics_no_db_title()}</p>
				<p class="mt-2 text-sm">{m.diagnostics_no_db_body()}</p>
			</div>
		{:else if !loaded}
			<div class="py-12 text-center text-slate-400"><p>{m.common_loading()}</p></div>
		{:else if entries.length === 0}
			<div class="py-12 text-center text-slate-400">
				<p>{m.diagnostics_empty_title()}</p>
				<p class="mt-2 text-sm">{m.diagnostics_empty_body()}</p>
			</div>
		{:else}
			<div class="mb-4 flex flex-wrap items-center gap-2">
				<input
					type="text"
					bind:value={searchText}
					placeholder={m.diagnostics_search_placeholder()}
					class="field flex-1 sm:flex-none"
					data-testid="diagnostics-search"
				/>

				<select bind:value={categoryFilter} class="field" data-testid="diagnostics-category">
					<option value="all">{m.diagnostics_all_categories()}</option>
					{#each ERROR_CATEGORIES as category (category)}
						<option value={category}>{category}</option>
					{/each}
				</select>

				<span class="font-mono text-xs tracking-wider text-slate-400 uppercase">
					{m.diagnostics_shown_of_total({ shown: filteredEntries.length, total: entries.length })}
				</span>

				<div class="ml-auto flex flex-wrap items-center gap-2">
					<button
						onclick={selectAllFiltered}
						disabled={filteredEntries.length === 0}
						class="btn btn-quiet btn-sm"
					>
						{m.diagnostics_select_shown()}
					</button>
					<button
						onclick={() => (selectedIds = [])}
						disabled={selectedIds.length === 0}
						class="btn btn-quiet btn-sm"
					>
						{m.diagnostics_clear_selection()}
					</button>
					<button
						onclick={() => (showReportPreview = true)}
						disabled={selectedIds.length === 0}
						class="btn btn-primary btn-sm"
					>
						{selectedIds.length > 0
							? m.diagnostics_report_selected({ count: selectedIds.length })
							: m.diagnostics_report()}
					</button>
				</div>
			</div>

			{#if filteredEntries.length === 0}
				<div class="py-12 text-center text-slate-400">
					<p>{m.diagnostics_no_match()}</p>
				</div>
			{:else}
				<ul class="space-y-2" data-testid="diagnostics-list">
					{#each filteredEntries as entry (entry.id)}
						<li class="rounded-lg border border-orange-500/[0.08] bg-slate-900/60 p-4">
							<div class="flex items-start gap-3">
								<input
									type="checkbox"
									checked={selectedIds.includes(entry.id!)}
									onchange={() => toggleSelected(entry.id!)}
									class="mt-1 rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500"
									aria-label={m.diagnostics_select_entry_aria()}
								/>

								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<span
											class="rounded-full border px-2 py-0.5 font-mono text-[0.62rem] tracking-wider uppercase {CATEGORY_STYLES[
												entry.category
											] ?? CATEGORY_STYLES.unknown}"
										>
											{entry.category}
										</span>
										<span class="font-mono text-xs text-slate-500">
											{formatTimestamp(entry.timestamp)}
										</span>
									</div>

									<p class="mt-2 break-words text-slate-200">{entry.message}</p>

									{#if entry.context || entry.stack}
										<button
											onclick={() => toggleExpanded(entry.id!)}
											class="mt-2 font-mono text-[0.68rem] tracking-wider text-orange-400/80 uppercase transition-colors hover:text-orange-300"
										>
											{expandedIds.includes(entry.id!)
												? m.diagnostics_hide_details()
												: m.diagnostics_show_details()}
										</button>

										{#if expandedIds.includes(entry.id!)}
											{#if entry.context}
												<pre
													class="mt-2 overflow-x-auto rounded-lg bg-slate-950/80 p-3 font-mono text-xs text-slate-300">{JSON.stringify(
														entry.context,
														null,
														2
													)}</pre>
											{/if}
											{#if entry.stack}
												<pre
													class="mt-2 overflow-x-auto rounded-lg bg-slate-950/80 p-3 font-mono text-xs text-slate-400">{entry.stack}</pre>
											{/if}
										{/if}
									{/if}
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
</div>

<!-- Clear confirmation -->
{#if showClearConfirm}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="panel w-full max-w-md rounded-xl p-6 shadow-xl">
			<h2 class="text-xl font-bold text-slate-50">{m.diagnostics_clear_confirm_title()}</h2>
			<p class="mt-2 text-sm text-slate-400">
				{m.diagnostics_clear_confirm_body({ count: entries.length })}
			</p>
			<div class="mt-6 flex justify-end gap-2">
				<button onclick={() => (showClearConfirm = false)} class="btn btn-quiet"
					>{m.common_cancel()}</button
				>
				<button onclick={handleClear} class="btn btn-danger">{m.diagnostics_clear_all()}</button>
			</div>
		</div>
	</div>
{/if}

<!-- Report preview — the user sees exactly what would leave the device -->
{#if showReportPreview}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
		<div class="panel max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl shadow-xl">
			<div class="border-b border-orange-500/[0.08] p-6">
				<h2 class="text-xl font-bold text-slate-50">{m.diagnostics_report()}</h2>
				<p class="mt-2 text-sm text-slate-400">
					{m.diagnostics_report_body_prefix()}
					<span class="font-mono">github.com</span>
					{m.diagnostics_report_body_suffix()}
				</p>
			</div>

			<div class="max-h-[calc(90vh-220px)] overflow-y-auto p-6">
				<pre
					class="overflow-x-auto rounded-lg bg-slate-950/80 p-4 font-mono text-xs whitespace-pre-wrap text-slate-300"
					data-testid="report-preview">{formatEntriesAsMarkdown(selectedEntries)}</pre>
			</div>

			<div class="flex justify-end gap-2 border-t border-orange-500/[0.08] p-6">
				<button onclick={() => (showReportPreview = false)} class="btn btn-quiet"
					>{m.common_cancel()}</button
				>
				<button onclick={handleReport} class="btn btn-primary">{m.diagnostics_open_issue()}</button>
			</div>
		</div>
	</div>
{/if}
