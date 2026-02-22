<script lang="ts">
  import NotificationToast from '$lib/components/NotificationToast.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import SearchResults from '$lib/components/SearchResults.svelte';
  import CardListCard from './CardListCard.svelte';
  import {
    store,
    createNewCardList,
    deleteCardList,
    addCardToList,
    removeCardFromList,
    importListFromText,
    exportListToText,
    updateListParams,
  } from '$lib/store.svelte';

  const READ_ONLY_MSG = 'Select a database to enable editing — click "Preview" in the header';

  let searchResults = $state<any[]>([]);
  let isSearching = $state(false);
  let showNotification = $state(false);
  let notificationMessage = $state('');
  let showImportModal = $state(false);
  let showExportModal = $state(false);
  let showAddCardsModal = $state(false);
  let showDeleteConfirmModal = $state(false);
  let importText = $state('');
  let exportText = $state('');
  let filterText = $state('');
  let sortBy = $state('name');

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
      notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to add card', 'error');
    }
  }

  async function handleRemoveCard(card: any) {
    try {
      await removeCardFromList(card);
      notify(`Removed ${card.name} from list`);
    } catch (e) {
      notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to remove card', 'error');
    }
  }

  async function handleCreateList() {
    try {
      await createNewCardList();
      notify('New list created');
    } catch (e) {
      notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to create list', 'error');
    }
  }

  async function handleDeleteList() {
    try {
      await deleteCardList();
      showDeleteConfirmModal = false;
      notify('List deleted');
    } catch (e) {
      showDeleteConfirmModal = false;
      notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to delete list', 'error');
    }
  }

  function handleSwitchList(index: number) {
    store.currentCardListIndex = index;
  }

  async function handleImport() {
    try {
      await importListFromText(importText);
      showImportModal = false;
      importText = '';
      notify('List imported');
    } catch (e) {
      notify(store.isReadOnly ? READ_ONLY_MSG : 'Import failed', 'error');
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
      if (store.isReadOnly) {
        notify(READ_ONLY_MSG, 'error');
      } else {
        console.error('Failed to update card matching', e);
      }
    }
  }

  async function handleLanguageMatchingChange(value: 'any' | 'strict') {
    try {
      await updateListParams({ languageMatching: value });
    } catch (e) {
      if (store.isReadOnly) {
        notify(READ_ONLY_MSG, 'error');
      } else {
        console.error('Failed to update language matching', e);
      }
    }
  }

  function notify(message: string, type = 'success') {
    notificationMessage = message;
    showNotification = true;
    setTimeout(() => { showNotification = false; }, 3000);
  }

  let ownershipCheck = $derived(store.listOwnershipCheck);
  let missingCount = $derived(ownershipCheck.cards.filter(r => !r.owned).length);

  let filteredListCards = $derived(
    ownershipCheck.cards
      .filter(({ card }) =>
        filterText === '' ||
        card.name.toLowerCase().includes(filterText.toLowerCase()) ||
        (card.set_name ?? '').toLowerCase().includes(filterText.toLowerCase())
      )
      .sort((a: { card: any; owned: boolean }, b: { card: any; owned: boolean }) => {
        if (sortBy === 'name') return a.card.name.localeCompare(b.card.name);
        if (sortBy === 'quantity') return b.card.LM_quantity - a.card.LM_quantity;
        if (sortBy === 'set') return (a.card.set_name ?? '').localeCompare(b.card.set_name ?? '');
        return 0;
      })
  );
</script>

<NotificationToast bind:show={showNotification} message={notificationMessage} />

<!-- Add Cards Modal -->
{#if showAddCardsModal}
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onclick={() => showAddCardsModal = false}
    role="dialog"
    aria-modal="true"
    aria-label="Add Cards to List"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="p-6 border-b border-orange-100 flex items-center justify-between">
        <h2 class="text-2xl font-bold text-orange-900">Add Cards to List</h2>
        <button
          onclick={() => showAddCardsModal = false}
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
        <SearchBar {isSearching} resultCount={searchResults.length} onSearch={queryScryfall} />
        <SearchResults {isSearching} results={searchResults} onAddCard={handleAddCard} target="cardList" />
      </div>
    </div>
  </div>
{/if}

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

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmModal}
  <div
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    onclick={() => showDeleteConfirmModal = false}
    role="dialog"
    aria-modal="true"
    aria-label="Confirm delete list"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-sm w-full p-6" onclick={(e) => e.stopPropagation()}>
      <h2 class="text-xl font-bold text-red-700 mb-3">Delete List</h2>
      <p class="text-stone-700 mb-1">
        Are you sure you want to delete <strong>{store.currentCardList?.name}</strong>?
      </p>
      <p class="text-sm text-stone-500 mb-6">This action cannot be undone.</p>
      <div class="flex gap-2 justify-end">
        <button
          onclick={() => showDeleteConfirmModal = false}
          class="px-4 py-2 border border-orange-300 rounded-lg text-stone-700 hover:bg-orange-50 transition"
        >
          Cancel
        </button>
        <button
          onclick={handleDeleteList}
          class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Delete
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
      <!-- Row 1: Lists label + dropdown + New List button -->
      <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div class="flex items-center gap-3">
          <span class="text-lg font-semibold text-stone-600">Lists</span>
          <select
            onchange={(e) => handleSwitchList(parseInt((e.currentTarget as HTMLSelectElement).value))}
            disabled={!store.dbLoaded || store.savedCardLists.length === 0}
            class="px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]"
          >
            {#if store.savedCardLists.length === 0}
              <option value={-1}>No lists</option>
            {:else}
              {#each store.savedCardLists as cardList, i}
                <option value={i} selected={store.currentCardListIndex === i}>{cardList.name}</option>
              {/each}
            {/if}
          </select>
          <button
            onclick={() => showDeleteConfirmModal = true}
            disabled={store.dbMode === 'none' || !store.currentCardList || store.savedCardLists.length <= 1}
            class="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="Delete this list"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            Delete List
          </button>
        </div>
        <button
          onclick={handleCreateList}
          disabled={store.dbMode === 'none'}
          class="px-4 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
            <path d="M12 5v14"/>
          </svg>
          New List
        </button>
      </div>

      <!-- Row 2: Card count + Add Cards / Import / Export -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="text-stone-500 text-sm">
          {#if store.dbLoaded}
            {store.totalCards} cards ({store.uniqueCards} unique)
          {:else}
            No database selected
          {/if}
        </p>
        <div class="flex gap-2">
          <button
            onclick={() => showAddCardsModal = true}
            disabled={store.dbMode === 'none' || !store.currentCardList}
            class="px-4 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"/>
              <path d="M12 5v14"/>
            </svg>
            Add Cards
          </button>
          <button
            onclick={() => showImportModal = true}
            disabled={store.dbMode === 'none'}
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

    <!-- Card Panel -->
    <div class="bg-white rounded-lg shadow-lg p-6 border border-orange-100">
      <!-- Filter + Sort -->
      <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 class="text-xl font-bold text-orange-900">
          {store.currentCardList?.name || 'No list selected'}
        </h2>
        <div class="flex items-center gap-3">
          <input
            type="text"
            disabled={!store.dbLoaded}
            bind:value={filterText}
            placeholder="Filter cards..."
            class="px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
          />
          <select
            bind:value={sortBy}
            disabled={!store.dbLoaded}
            class="px-3 py-2 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50"
          >
            <option value="name">Sort by Name</option>
            <option value="quantity">Sort by Quantity</option>
            <option value="set">Sort by Set</option>
          </select>
        </div>
      </div>

      <!-- Card Grid -->
      <div class="list-cards" data-testid="list-cards">
        {#if store.listCards.length === 0}
          <div class="text-center py-12 text-stone-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mx-auto mb-4 opacity-50">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <path d="M3 9h18"/>
            </svg>
            <p>No cards in list yet</p>
            <p class="text-sm mt-2">Click "Add Cards" to get started</p>
          </div>
        {:else if filteredListCards.length === 0}
          <div class="text-center py-12 text-stone-500">
            <p>No cards match your filter</p>
          </div>
        {:else}
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {#each filteredListCards as { card, owned } (card.id)}
              <CardListCard
                {card}
                {owned}
                onRemove={handleRemoveCard}
                disabled={store.dbMode === 'none'}
              />
            {/each}
          </div>
        {/if}
      </div>

      <!-- Ownership banner -->
      {#if store.listCards.length > 0}
        <div class="mt-6">
          {#if ownershipCheck.owned}
            <div class="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              ✓ Owned — you have all cards in this list
            </div>
          {:else}
            <div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ✗ Missing {missingCount} {missingCount === 1 ? 'card' : 'cards'}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Card matching / language controls -->
      {#if store.currentCardList}
        <hr class="my-6 border-orange-100" />
        <div class="flex flex-wrap gap-4 text-sm">
          <div class="flex items-center gap-2">
            <span class="font-medium text-stone-600">Card Matching:</span>
            <button
              onclick={() => handleCardMatchingChange('generic')}
              disabled={store.dbMode === 'none'}
              class="px-3 py-1 rounded-l-lg border border-orange-300 transition disabled:opacity-50 disabled:cursor-not-allowed {store.currentCardList.cardMatching === 'generic' ? 'bg-orange-700 text-white' : 'bg-white text-stone-700 hover:bg-orange-50'}"
            >
              Generic
            </button>
            <button
              onclick={() => handleCardMatchingChange('specific')}
              disabled={store.dbMode === 'none'}
              class="px-3 py-1 rounded-r-lg border border-orange-300 -ml-px transition disabled:opacity-50 disabled:cursor-not-allowed {store.currentCardList.cardMatching === 'specific' ? 'bg-orange-700 text-white' : 'bg-white text-stone-700 hover:bg-orange-50'}"
            >
              Specific
            </button>
          </div>
          <div class="flex items-center gap-2">
            <span class="font-medium text-stone-600">Language:</span>
            <button
              onclick={() => handleLanguageMatchingChange('any')}
              disabled={store.dbMode === 'none'}
              class="px-3 py-1 rounded-l-lg border border-orange-300 transition disabled:opacity-50 disabled:cursor-not-allowed {store.currentCardList.languageMatching === 'any' ? 'bg-orange-700 text-white' : 'bg-white text-stone-700 hover:bg-orange-50'}"
            >
              Any
            </button>
            <button
              onclick={() => handleLanguageMatchingChange('strict')}
              disabled={store.dbMode === 'none'}
              class="px-3 py-1 rounded-r-lg border border-orange-300 -ml-px transition disabled:opacity-50 disabled:cursor-not-allowed {store.currentCardList.languageMatching === 'strict' ? 'bg-orange-700 text-white' : 'bg-white text-stone-700 hover:bg-orange-50'}"
            >
              Strict
            </button>
          </div>
        </div>
      {/if}
    </div>

  </div>
</div>
