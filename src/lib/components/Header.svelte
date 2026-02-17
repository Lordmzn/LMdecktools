<script lang="ts">
  import HeaderNav from '$lib/components/HeaderNav.svelte';
  import DBSelectionModal from '$lib/components/DBSelectionModal.svelte';

  import { store, initDB } from '$lib/store.svelte';

  let showStartupModal = $state(false);
</script>


<DBSelectionModal 
  bind:show={showStartupModal}
/>
<header class="bg-white border-b border-orange-200">
  <div class="flex justify-between mx-auto max-w-screen-xl px-4 pt-3">
    
    <!-- Tab Navigation -->
    <HeaderNav/>

    <!-- Toggle Button -->
    <button
      onclick={() => showStartupModal = !showStartupModal}
      class="inline-flex items-center gap-2 px-4 py-2 hover:bg-stone-700 text-white rounded-lg shadow-md transition-all duration-200 font-medium"
      class:bg-orange-800={store.dbLoaded}
      class:bg-stone-800={!store.dbLoaded}
      title="Gestione Database"
    >
      {#if !store.dbLoaded}
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 26 26">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
        </svg>
      {:else}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          class="w-6 h-6" 
          viewBox="0 0 24 24" 
          fill="none"
        >
          <path 
            stroke="currentColor" 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />

          <g transform="translate(4, 4)">
            
            <path 
              d="M20 6 9 17l-5-5"
              stroke="white" 
              stroke-width="5" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            />

            <path 
              d="M20 6 9 17l-5-5"
              class="text-green-700" 
              stroke="currentColor" 
              stroke-width="3" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            />
          </g>
          </svg>
      {/if}
      <span>{store.dbLoaded ? 'Database' : 'Choose DB'}</span>
      {#if showStartupModal}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path>
        </svg>
      {:else}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      {/if}
    </button>
  </div>
</header>

<style>
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>
