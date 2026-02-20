<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  
  let { isSearching, results, onAddCard, target="collection" } = $props();
</script>

<div>
  {#if isSearching}
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-700"></div>
    </div>
  {:else if results.length > 0}
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {#each results as card}
        <Card {card} add={onAddCard} target={target} showOwned={true} />
      {/each}
    </div>
  {:else}
    <div class="text-center py-12 text-stone-500">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-4 opacity-50">
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.3-4.3"/>
      </svg>
      <p class="text-lg">Search for cards to add to your list</p>
      <p class="text-sm mt-2">
        <a href="https://scryfall.com/docs/syntax" target="_blank" class="text-orange-600 hover:underline">
          Learn Scryfall syntax
        </a>
      </p>
      <p class="font-sans antialiased text-sm pt-20">
        <a href="http://wengu.tartarie.com/wg/wengu.php? l=Yijing&no=48" target="_blank">䷯</a> One draws from the well without hindrance.
      </p>
    </div>
  {/if}
</div>
