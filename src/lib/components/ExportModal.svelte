<script lang="ts">
	import { exportCollectionToText } from '$lib/store.svelte';

	let { show = $bindable(false) } = $props();

	// Define available options
	const fieldOptions = [
		{ label: 'Count', value: 'Count' },
		{ label: 'Name', value: 'Name' },
		{ label: 'Edition', value: 'Edition' },
		{ label: 'Collector #', value: 'Collector Number' },
		{ label: 'Foil', value: 'Foil' },
		{ label: 'Language', value: 'Language' },
		{ label: 'Scryfall ID', value: 'Scryfall ID' }
	];

	let selectedFields = $state(['Count', 'Name', 'Edition']);

	let text = $derived.by(() => exportCollectionToText(selectedFields));

	function handleCopy() {
		navigator.clipboard.writeText(text);
	}

	function handleDownload() {
		if (!text) return;
		const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = 'mtg_collection_export.csv';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="button"
		tabindex="0"
		onclick={(e) => {
			if (e.target === e.currentTarget) show = false;
		}}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				if (e.target === e.currentTarget) {
					e.preventDefault();
					show = false;
				}
			}
		}}
	>
		<div class="panel w-full max-w-2xl rounded-xl p-6 shadow-xl">
			<h3 class="mb-4 text-2xl font-bold text-neutral-100">🚛 Export</h3>
			<p class="text-neutral-400">
				Use this tool to share your collection outside this app. If you need to backup your
				collection, use the DB management.
			</p>

			<div class="mt-4 mb-4">
				<label class="mb-2 block text-sm font-semibold text-neutral-300">Include Fields:</label>

				<div class="grid grid-cols-2 gap-2 text-sm text-neutral-300 sm:grid-cols-4">
					{#each fieldOptions as option (option.value)}
						<label class="flex cursor-pointer items-center gap-2">
							<input
								type="checkbox"
								bind:group={selectedFields}
								value={option.value}
								class="h-4 w-4 accent-orange-500"
							/>
							<span>{option.label}</span>
						</label>
					{/each}
				</div>
			</div>

			<textarea
				bind:value={text}
				id="export-preview"
				class="h-64 w-full rounded-lg border border-neutral-700 bg-neutral-800 p-3 font-mono text-sm text-neutral-300"
				placeholder="Select fields to generate preview..."
			></textarea>

			<div class="mt-4 flex gap-3">
				<button
					onclick={handleDownload}
					class="flex-1 rounded-lg bg-orange-500 px-4 py-2 font-medium text-white transition hover:bg-orange-600 sm:flex-none"
				>
					Download File
				</button>
				<button
					onclick={handleCopy}
					class="rounded-lg bg-neutral-800 px-4 py-2 text-neutral-200 transition hover:bg-neutral-700"
				>
					Copy to Clipboard
				</button>
				<button
					onclick={() => (show = false)}
					class="rounded-lg bg-neutral-800 px-4 py-2 text-neutral-200 transition hover:bg-neutral-700"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
