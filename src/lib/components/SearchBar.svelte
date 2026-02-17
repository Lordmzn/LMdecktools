<script lang="ts">
  let { isSearching, resultCount, onSearch } = $props();
  
  let searchInput = $state("");
  let showAllPrints = $state(false);
  
  function handleSearch() {
    let querystring = searchInput;
    if (showAllPrints)
      querystring = `${querystring} unique:prints`
    onSearch(querystring);
  }
  
  function handleKeydown(e) {
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
      class="flex-1 rounded-lg bg-orange-50 border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
    />
    <button
      onclick={handleSearch}
      class="px-6 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition disabled:opacity-50"
      disabled={isSearching}
    >
      {isSearching ? 'Searching...' : 'Search'}
    </button>
    <label 
      class="flex flex-col cursor-pointer p-2 hover:bg-orange-100 rounded-lg transition select-none group"
    >
      <div class="flex items-center justify-between w-full">
        <div class="relative">
          <input type="checkbox" bind:checked={showAllPrints} class="sr-only" />
          
          <div 
            class="w-10 h-6 rounded-full transition-colors duration-200 ease-in-out"
            class:bg-orange-500={showAllPrints}
            class:bg-gray-300={!showAllPrints}
          ></div>
          
          <div 
            class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-200 ease-in-out"
            class:translate-x-4={showAllPrints}
          ></div>
        </div>
        <span class="font-medium text-gray-900">{showAllPrints ? 'all prints' : 'unique'}</span>
      </div>

      <span class="text-xs text-gray-500 mt-1">
        Show all print versions
      </span>
    </label>
  </div>
  {#if resultCount > 0}
    <div class="mt-2 text-sm text-stone-600">
      {resultCount} results found
    </div>
  {/if}
</div>
