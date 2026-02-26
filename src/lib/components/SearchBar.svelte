<script lang="ts">
	let { isSearching, resultCount, onSearch } = $props();

	let searchInput = $state('');
	let showAllPrints = $state(false);

	function handleSearch() {
		let querystring = searchInput;
		if (showAllPrints) querystring = `${querystring} unique:prints`;
		onSearch(querystring);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.keyCode === 13) {
			handleSearch();
		}
	}
</script>

<div>
	<div class="flex items-center gap-3">
		<div class="text-2xl">🔎</div>
		<input
			bind:value={searchInput}
			type="text"
			placeholder="Search for cards..."
			onkeydown={handleKeydown}
			class="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 placeholder-neutral-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
		/>
		<button
			onclick={handleSearch}
			class="rounded-lg bg-orange-500 px-6 py-2 text-white transition hover:bg-orange-600 disabled:opacity-50"
			disabled={isSearching}
		>
			{isSearching ? 'Searching...' : 'Search'}
		</button>
		<label
			class="group flex cursor-pointer flex-col rounded-lg p-2 transition select-none hover:bg-neutral-800"
		>
			<div class="flex w-full items-center justify-between">
				<div class="relative">
					<input type="checkbox" bind:checked={showAllPrints} class="sr-only" />

					<div
						class="h-6 w-10 rounded-full transition-colors duration-200 ease-in-out"
						class:bg-orange-500={showAllPrints}
						class:bg-neutral-700={!showAllPrints}
					></div>

					<div
						class="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
						class:translate-x-4={showAllPrints}
					></div>
				</div>
				<span class="font-medium text-neutral-300">{showAllPrints ? 'all prints' : 'unique'}</span>
			</div>

			<span class="mt-1 text-xs text-neutral-500"> Show all print versions </span>
		</label>
	</div>
	{#if resultCount > 0}
		<div class="mt-2 text-sm text-neutral-400">
			{resultCount} results found
		</div>
	{/if}
</div>
