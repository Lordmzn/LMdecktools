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
		<svg
			class="h-5 w-5 shrink-0 text-orange-400"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="8" />
			<path d="m21 21-4.3-4.3" />
		</svg>
		<input
			bind:value={searchInput}
			type="text"
			placeholder="Search for cards..."
			onkeydown={handleKeydown}
			class="field flex-1"
		/>
		<button onclick={handleSearch} class="btn btn-primary" disabled={isSearching}>
			{isSearching ? 'Searching...' : 'Search'}
		</button>
		<label
			class="group flex cursor-pointer flex-col rounded-lg p-2 transition select-none hover:bg-slate-800"
		>
			<div class="flex w-full items-center justify-between">
				<div class="relative">
					<input type="checkbox" bind:checked={showAllPrints} class="sr-only" />

					<div
						class="h-6 w-10 rounded-full transition-colors duration-200 ease-in-out"
						class:bg-orange-500={showAllPrints}
						class:bg-slate-700={!showAllPrints}
					></div>

					<div
						class="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
						class:translate-x-4={showAllPrints}
					></div>
				</div>
				<span class="font-medium text-slate-300">{showAllPrints ? 'all prints' : 'unique'}</span>
			</div>

			<span class="mt-1 text-xs text-slate-500"> Show all print versions </span>
		</label>
	</div>
	{#if resultCount > 0}
		<div class="mt-2 text-sm text-slate-400">
			{resultCount} results found
		</div>
	{/if}
</div>
