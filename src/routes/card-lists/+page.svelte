<script lang="ts">
  import NotificationToast from '$lib/components/NotificationToast.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import SearchResults from '$lib/components/SearchResults.svelte';
  import {
    store,
    createNewCardList,
    addCardToList,
    removeCardFromList,
    importListFromText,
    exportListToText,
    updateListName,
    updateListParams,
  } from '$lib/store.svelte';

  let searchResults = $state<any[]>([]);
  let isSearching = $state(false);
  let showNotification = $state(false);
  let notificationMessage = $state('');
  let showImportModal = $state(false);
  let showExportModal = $state(false);
  let importText = $state('');
  let exportText = $state('');

  async function queryScryfall(querystring: string) {
    if (!querystring.trim()) return;
    isSearching = true;
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(querystring)}`;
    const headers = { 'User-Agent': 'LMdecktools/0.1', 'Accept': '*/*' };
    try {
      const response = await fetch(url, { headers });
      if (response.ok) {
        const json = await response.json();
        searchResults = json.data;
      } else {
        searchResults = [];
        notify('No results found', 'error');
      }
    } catch (error) {
      console.error(error);
      notify('Search failed', 'error');
    } finally {
      isSearching = false;
    }
  }

  async function handleAddCard(card: any) {
    try {
      await addCardToList(card);
      notify(`Added ${card.name} to list`);
    } catch (e) {
      notify('Failed to add card', 'error');
    }
  }

  async function handleRemoveCard(card: any) {
    try {
      await removeCardFromList(card);
      notify(`Removed ${card.name} from list`);
    } catch (e) {
      notify('Failed to remove card', 'error');
    }
  }

  async function handleCreateList() {
    try {
      await createNewCardList();
      notify('New list created');
    } catch (e) {
      notify('Failed to create list', 'error');
    }
  }

  function handleSwitchList(index: number) {
    store.currentCardListIndex = index;
  }

  async function handleNameBlur() {
    if (!isNaN(store.currentCardListIndex) && store.currentCardList) {
      try {
        await updateListName(store.savedCardLists[store.currentCardListIndex].name);
      } catch (e) {
        console.error('Failed to save list name', e);
      }
    }
  }

  async function handleImport() {
    try {
      await importListFromText(importText);
      showImportModal = false;
      importText = '';
      notify('List imported');
    } catch (e) {
      notify('Import failed', 'error');
    }
  }

  function handleExport() {
    exportText = exportListToText();
    showExportModal = true;
  }

  async function handleCardMatchingChange(value: 'generic' | 'specific') {
    try {
      await updateListParams({ cardMatching: value });
    } catch (e) {
      console.error('Failed to update card matching', e);
    }
  }

  async function handleLanguageMatchingChange(value: 'any' | 'strict') {
    try {
      await updateListParams({ languageMatching: value });
    } catch (e) {
      console.error('Failed to update language matching', e);
    }
  }

  function notify(message: string, type = 'success') {
    notificationMessage = message;
    showNotification = true;
    setTimeout(() => { showNotification = false; }, 3000);
  }

  let ownershipCheck = $derived(store.listOwnershipCheck);
  let missingCount = $derived(ownershipCheck.cards.filter(r => !r.owned).length);
</script>

<NotificationToast bind:show={showNotification} message={notificationMessage} />

<!-- Import Modal -->
{#if showImportModal}
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onclick={() => showImportModal = false}
    role="dialog"
    aria-modal="true"
    aria-label="Import List"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6" onclick={(e) => e.stopPropagation()}>
      <h2 class="text-xl font-bold text-orange-900 mb-4">Import List</h2>
      <p class="text-sm text-stone-500 mb-3">Paste a card list in standard format:</p>
      <textarea
        bind:value={importText}
        placeholder="# List Name&#10;4 Lightning Bolt&#10;2 Mountain"
        class="w-full h-48 border border-orange-300 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
      ></textarea>
      <div class="flex gap-2 mt-4 justify-end">
        <button
          onclick={() => showImportModal = false}
          class="px-4 py-2 border border-orange-300 rounded-lg text-stone-700 hover:bg-orange-50 transition"
        >
          Cancel
        </button>
        <button
          onclick={handleImport}
          class="px-4 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition"
        >
          Load List
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Export Modal -->
{#if showExportModal}
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onclick={() => showExportModal = false}
    role="dialog"
    aria-modal="true"
    aria-label="Export List"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full p-6" onclick={(e) => e.stopPropagation()}>
      <h2 class="text-xl font-bold text-orange-900 mb-4">Export List</h2>
      <pre
        data-testid="export-text"
        class="w-full h-48 border border-orange-300 rounded-lg p-3 font-mono text-sm bg-orange-50 overflow-auto whitespace-pre-wrap"
      >{exportText}</pre>
      <div class="flex gap-2 mt-4 justify-end">
        <button
          onclick={() => navigator.clipboard.writeText(exportText).then(() => notify('Copied!'))}
          class="px-4 py-2 border border-orange-300 rounded-lg text-stone-700 hover:bg-orange-50 transition"
        >
          Copy
        </button>
        <button
          onclick={() => showExportModal = false}
          class="px-4 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<div class="bg-orange-50 min-h-screen">
  <div class="max-w-7xl mx-auto p-4">

    <!-- Header -->
    <div class="bg-white rounded-lg shadow-lg p-6 mb-6 border border-orange-100">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-3xl font-bold text-orange-900">Card Lists</h1>
        <div class="flex gap-2">
          <button
            onclick={handleCreateList}
            disabled={!store.dbLoaded}
            class="px-4 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
              <path d="M12 5v14"/>
            </svg>
            New List
          </button>
          <button
            onclick={() => showImportModal = true}
            disabled={!store.dbLoaded}
            class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </button>
          <button
            onclick={handleExport}
            disabled={!store.dbLoaded || store.listCards.length === 0}
            class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export
          </button>
        </div>
      </div>
    </div>

    <!-- List Selector Tabs -->
    {#if store.dbLoaded && store.savedCardLists.length > 0}
      <div class="bg-white rounded-lg shadow-lg p-4 mb-6 border border-orange-100">
        <div role="tablist" data-testid="list-selector" class="flex gap-2 flex-wrap mb-4">
          {#each store.savedCardLists as cardList, i}
            <button
              role="tab"
              data-testid="list-tab"
              aria-selected={store.currentCardListIndex === i}
              onclick={() => handleSwitchList(i)}
              class="px-4 py-2 rounded-lg transition font-medium {store.currentCardListIndex === i ? 'bg-orange-700 text-white' : 'bg-orange-100 text-orange-800 hover:bg-orange-200'}"
            >
              {cardList.name}
            </button>
          {/each}
        </div>

        <!-- List Name Input -->
        {#if store.currentCardList}
          <div class="flex items-center gap-2">
            <label for="list-name-input" class="text-sm font-medium text-stone-600">List name:</label>
            <input
              id="list-name-input"
              type="text"
              placeholder="List name..."
              bind:value={store.savedCardLists[store.currentCardListIndex].name}
              onblur={handleNameBlur}
              class="px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            />
          </div>
        {/if}
      </div>
    {/if}

    <!-- Main Content: two columns -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

      <!-- Search Panel -->
      <div class="bg-white rounded-lg shadow-lg p-6 border border-orange-100">
        <h2 class="text-xl font-bold text-orange-900 mb-4">Search Cards</h2>
        <SearchBar
          {isSearching}
          resultCount={searchResults.length}
          onSearch={queryScryfall}
        />
        <div class="mt-4">
          <SearchResults
            {isSearching}
            results={searchResults}
            onAddCard={handleAddCard}
            target="cardList"
          />
        </div>
      </div>

      <!-- List Panel -->
      <div class="bg-white rounded-lg shadow-lg p-6 border border-orange-100">
        <h2 class="text-xl font-bold text-orange-900 mb-1">
          {store.currentCardList?.name || 'No list selected'}
        </h2>
        {#if store.dbLoaded}
          <p class="text-stone-500 text-sm mb-4">
            {store.totalCards} cards ({store.uniqueCards} unique)
          </p>
        {/if}

        <!-- Ownership check params -->
        {#if store.currentCardList}
          <div class="mb-4 flex flex-wrap gap-4 text-sm">
            <div class="flex items-center gap-2">
              <span class="font-medium text-stone-600">Card Matching:</span>
              <button
                onclick={() => handleCardMatchingChange('generic')}
                class="px-3 py-1 rounded-l-lg border border-orange-300 transition {store.currentCardList.cardMatching === 'generic' ? 'bg-orange-700 text-white' : 'bg-white text-stone-700 hover:bg-orange-50'}"
              >
                Generic
              </button>
              <button
                onclick={() => handleCardMatchingChange('specific')}
                class="px-3 py-1 rounded-r-lg border border-orange-300 -ml-px transition {store.currentCardList.cardMatching === 'specific' ? 'bg-orange-700 text-white' : 'bg-white text-stone-700 hover:bg-orange-50'}"
              >
                Specific
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-medium text-stone-600">Language:</span>
              <button
                onclick={() => handleLanguageMatchingChange('any')}
                class="px-3 py-1 rounded-l-lg border border-orange-300 transition {store.currentCardList.languageMatching === 'any' ? 'bg-orange-700 text-white' : 'bg-white text-stone-700 hover:bg-orange-50'}"
              >
                Any
              </button>
              <button
                onclick={() => handleLanguageMatchingChange('strict')}
                class="px-3 py-1 rounded-r-lg border border-orange-300 -ml-px transition {store.currentCardList.languageMatching === 'strict' ? 'bg-orange-700 text-white' : 'bg-white text-stone-700 hover:bg-orange-50'}"
              >
                Strict
              </button>
            </div>
          </div>
        {/if}

        <!-- Ownership banner -->
        {#if store.listCards.length > 0}
          {#if ownershipCheck.owned}
            <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              ✓ Owned — you have all cards in this list
            </div>
          {:else}
            <div class="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ✗ Missing {missingCount} {missingCount === 1 ? 'card' : 'cards'}
            </div>
          {/if}
        {/if}

        <!-- Card list -->
        <div class="list-cards space-y-2" data-testid="list-cards">
          {#if store.listCards.length === 0}
            <div class="text-center py-12 text-stone-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-4 opacity-50">
                <rect width="18" height="18" x="3" y="3" rx="2"/>
                <path d="M3 9h18"/>
              </svg>
              <p>No cards in list yet</p>
              <p class="text-sm mt-2">Search and add cards from the left panel</p>
            </div>
          {:else}
            {#each ownershipCheck.cards as { card, owned } (card.id)}
              <div class="flex items-center justify-between p-3 border border-orange-100 rounded-lg hover:bg-orange-50 transition">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="font-bold text-orange-700 w-8 text-right flex-shrink-0">{card.LM_quantity}x</span>
                  <div class="min-w-0">
                    <div class="font-medium text-stone-800 truncate">{card.name}</div>
                    <div class="text-xs {owned ? 'text-green-600' : 'text-amber-600'}">
                      {owned ? '✓ Owned' : '✗ Missing'}
                    </div>
                  </div>
                </div>
                <button
                  title="Remove"
                  onclick={() => handleRemoveCard(card)}
                  class="p-1.5 hover:bg-red-100 rounded text-red-500 transition flex-shrink-0 ml-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6 6 18"/>
                    <path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>
            {/each}
          {/if}
        </div>
      </div>

    </div>
  </div>
</div>
