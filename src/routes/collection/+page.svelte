<script>
  import NotificationToast from '$lib/components/NotificationToast.svelte';
  import ExportModal from '$lib/components/ExportModal.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import SearchResults from '$lib/components/SearchResults.svelte';
  import CollectionCard from './CollectionCard.svelte';
  import {
    store,
    addToCollection,
    removeFromCollection,
    updateCollectionQuantity,
  } from '$lib/store.svelte';

  let search_results = $state([]);
  let isSearching = $state(false);
  let showNotification = $state(false);
  let notificationMessage = $state("");
  let showSearchModal = $state(false);
  let showImportExport = $state(false);
  let filterText = $state("");
  let sortBy = $state("name"); // name, quantity, set
  let showStartupModal = $state(false);
  
  // Filtered and sorted collection
  let filteredCollection = $derived(
    store.dbLoaded ? 
      store.collection
        .filter(card => 
          filterText === "" || 
          card.name.toLowerCase().includes(filterText.toLowerCase()) ||
          card.set_name?.toLowerCase().includes(filterText.toLowerCase())
        )
        .sort((a, b) => {
          if (sortBy === "name") return a.name.localeCompare(b.name);
          if (sortBy === "quantity") return b.quantity_owned - a.quantity_owned;
          if (sortBy === "set") return (a.set_name || "").localeCompare(b.set_name || "");
          return 0;
        }) : []
  );

  // Query Scryfall API
  async function queryScryfall(querystring) {
    if (!querystring.trim()) return;
    
    isSearching = true;
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(querystring)}`;
    const headers = { "User-Agent": "LMdecktools/0.1", "Accept": "*/*" };
    
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        search_results = [];
        notify(`No results found`, "error");
      } else {
        const json = await response.json();
        search_results = json.data;
        notify(`Found ${json.data.length} cards`);
      }      
    } catch (error) {
      console.error(error.message);
      notify("Search failed", "error");
    } finally {
      isSearching = false;
    }
  }

  // Add card to collection
  async function addCard(card) {
    try {
      await addToCollection(card, 1);
      notify(`Added ${card.name} to collection`);
    } catch (error) {
      notify("Failed to add card", "error");
      console.log(error);
    }
  }

  // Add one to existing card
  async function handleAddOne(card) {
    try {
      await addToCollection(card, 1);
      notify(`Added one ${card.name}`);
    } catch (error) {
      notify("Failed to add card", "error");
    }
  }

  // Remove one from collection
  async function handleRemoveOne(card) {
    try {
      await removeFromCollection(card, 1);
      notify(`Removed one ${card.name}`);
    } catch (error) {
      notify("Failed to remove card", "error");
    }
  }

  // Update quantity
  async function handleUpdateQuantity(card, quantity) {
    try {
      await updateCollectionQuantity(card, quantity);
      notify(`Updated ${card.name} quantity`);
    } catch (error) {
      notify("Failed to update quantity", "error");
    }
  }

  // Export collection
  function handleExportCollection() {
    showImportExport = true;
  }

  // Show notification
  function notify(message, type = "success") {
    notificationMessage = message;
    showNotification = true;
    setTimeout(() => {
      showNotification = false;
    }, 3000);
  }
</script>

<NotificationToast bind:show={showNotification} message={notificationMessage} />
<ExportModal bind:show={showImportExport} />

<!-- Search Modal -->
{#if showSearchModal}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick={() => showSearchModal = false}>
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="p-6 border-b border-orange-100 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-orange-900">Add Cards to Collection</h2>
        <button 
          onclick={() => showSearchModal = false}
          class="p-2 hover:bg-orange-100 rounded-lg transition"
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
      
      <div class="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-4">
        <SearchBar 
          {isSearching}
          resultCount={search_results.length}
          onSearch={queryScryfall}
        />
        
        <SearchResults 
          {isSearching}
          results={search_results}
          onAddCard={addCard}
        />
      </div>
    </div>
  </div>
{/if}

<div class="bg-orange-50 min-h-screen">
  <div class="max-w-7xl mx-auto p-4">
    
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6 border border-orange-100">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-orange-900">My Collection</h1>
          {#if store.dbLoaded}
          <p class="text-stone-600 mt-1">
            {store.totalOwnedCards} cards ({store.uniqueOwnedCards} unique)
          </p>
          {/if}
        </div>
        
        <div class="flex items-center gap-2">
          <button 
            onclick={() => showSearchModal = true}
            disabled={!store.dbLoaded}
            class="px-4 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition flex items-center gap-2"
            class:disabled={!store.dbLoaded}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
              <path d="M12 5v14"/>
            </svg>
            Add Cards
          </button>
          
          <button 
            onclick={handleExportCollection}
            disabled={!store.dbLoaded}
            class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
            class:disabled={!store.dbLoaded}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"
            >
              <g transform="scale(0.6)" transform-origin="center">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </g>

              <g stroke-width="2.2">
                <path d="M15 3h6v6" />
                <path d="M21 3l-6.5 6.5" />
                
                <path d="M9 21H3v-6" />
                <path d="M3 21l6.5-6.5" />
              </g>
            </svg>
            Export
          </button>
        </div>
      </div>
    </div>

    <!-- Collection Grid -->
    <div class="bg-white rounded-lg shadow-lg p-6 border border-orange-100">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 class="text-xl font-bold text-orange-900">Your Cards</h2>
        <div class="flex items-center gap-3">
          <!-- Filter -->
          <input 
            type="text"
            disabled={!store.dbLoaded}
            bind:value={filterText}
            placeholder="Filter cards..."
            class="px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
          
          <!-- Sort -->
          <select 
            bind:value={sortBy}
            disabled={!store.dbLoaded}
            class="px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="name">Sort by Name</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="set">Sort by Set</option>
          </select>
        </div>
      </div>

      {#if filteredCollection.length > 0}
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {#each filteredCollection as card (card.id)}
            <CollectionCard 
              {card} 
              onAdd={handleAddOne}
              onRemove={handleRemoveOne}
              onUpdate={handleUpdateQuantity}
            />
          {/each}
        </div>
      {:else if filterText !== ""}
        <div class="text-center py-12 text-stone-500">
          <p>No cards match your filter</p>
        </div>
      {:else}
        <div class="text-center py-12 text-stone-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-4 opacity-50">
            <rect width="18" height="18" x="3" y="3" rx="2"/>
            <path d="M3 9h18"/>
          </svg>
          {#if store.dbLoaded}
            <p>No cards in collection yet</p>
            <p class="text-sm mt-2">Click "Add Cards" to get started</p>
          {:else}
            <p>No database selected</p>
            <p class="text-sm mt-2">Click "Choose DB" to get started</p>
          {/if}
        </div>
      {/if}
    </div> 
  </div>
</div>

<style>
  .disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: grey;
  }
</style>