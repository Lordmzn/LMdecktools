<script lang="ts">
  import { onMount } from 'svelte';
  let { show = $bindable(false) } = $props();
  import { checkLocalDatabase } from '$lib/db';
  import { store, initDB, peekDB, clearDB, exportDB } from '$lib/store.svelte';

  let fileInput: HTMLInputElement;
  let localDBexists = $state<boolean | null>(null);
  let selectedFile: File | null = $state(null);

  onMount(() => {
    if (store.dbMode === 'none') {
      checkLocalDatabase().then(
        (res) => {
          if (res) {
            peekDB();
            localDBexists = true;
          } else {
            localDBexists = false;
          }
        },
        () => { localDBexists = false; }
      );
    }
  });

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      selectedFile = target.files[0];
    }
  }

  function handleLoadFile() {
    throw new Error("Not implemented");
    closeModal();
  }

  function handleLoadLocal() {
    initDB();
    closeModal();
  }

  function handleExportLocal() {
    const content = exportDB();

    if (!content) return;
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "document.yjs";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleCreateNew() {
    if (store.dbMode !== 'none') {
      await clearDB();
      store.dbMode = 'none';
    }
    await initDB();
    closeModal();
  }

  function closeModal() {
    show = false;
    setTimeout(() => null, 300); // Wait for animation
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

{#if show}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300"
    role="button"
    tabindex="0" 
    onclick={(e) => e.target === e.currentTarget && closeModal()}
    onkeydown={(e) => {
      // 1. Check for specific keys (Enter or Space)
      if (e.key === 'Enter' || e.key === ' ') {
        // 2. IMPORTANT: Prevent closing if the user is typing in an input INSIDE the modal
        if (e.target === e.currentTarget) {
          e.preventDefault(); // Stop 'Space' from scrolling the page
          closeModal();
        }
      }
    }
  }
  >
    <div 
      class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden transform transition-all duration-300"
      class:scale-100={show}
      class:scale-95={!show}
    >
      <!-- Header -->
      <div class="bg-gradient-to-r from-orange-900 to-orange-400 px-6 py-4">
        <h2 class="text-2xl font-bold text-white flex items-center gap-2">
          ⚔️ Welcome to LM Deck Tools 🏴‍☠️
        </h2>
        <p class="text-stone-200 text-sm mt-1">
          Choose how to start your MTG collection
        </p>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        
        <!-- Local Database Option -->
        <div class="border-2 border-stone-200 rounded-xl p-5 hover:border-stone-400 transition-colors">
          <div class="flex items-start gap-4">
            {#if localDBexists === true}
              <div class="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            {:else}
              <div class="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
            {/if}
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-stone-900 mb-2">
                {#if localDBexists === null}
                  Searching for local database
                {:else if localDBexists === true}
                  Local database found
                {:else}
                  Local database not found
                {/if}
              </h3>
              {#if localDBexists === true}
                <div class="space-y-2 text-sm text-stone-600 mb-4">
                  <div class="flex justify-between">
                    <span class="font-medium">Total lists:</span>
                    <span class="font-mono">{store.savedCardLists.length}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="font-medium">Total cards:</span>
                    <span class="font-mono">{store.totalCards}</span>
                  </div>
                </div>
                {#if store.dbMode === 'peek'}
                  <div class="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    Previewing in read-only mode. Click "Use Local DB" to enable editing.
                  </div>
                {/if}
                {#if store.dbMode !== 'active'}
                  <button
                    onclick={handleLoadLocal}
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm"
                  >
                    Use Local DB
                  </button>
                {:else}
                  <button
                    onclick={handleExportLocal}
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm"
                  >
                    Download local DB
                  </button>
                {/if}

              {/if}
            </div>
          </div>
        </div>

        <!-- Import from File Option -->
        <div class="border-2 border-stone-200 rounded-xl p-5 hover:border-stone-400 transition-colors">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-stone-900 mb-2">
                Import from File
              </h3>
              <p class="text-sm text-stone-600 mb-4">
                Import a backup file. Merging with local data is supported.
              </p>
              <input
                type="file"
                accept=".yjs,.json"
                bind:this={fileInput}
                onchange={handleFileSelect}
                class="mb-3 block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
              />
              {#if selectedFile}
                <p class="text-xs text-stone-500 mb-3">
                  Selected file: {selectedFile.name}
                </p>
              {/if}
              <button
                onclick={handleLoadFile}
                disabled={!selectedFile}
                class="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm"
              >
                Import File
              </button>
            </div>
          </div>
        </div>

        <!-- Create New Option -->
        <div class="border-2 border-stone-200 rounded-xl p-5 hover:border-stone-400 transition-colors">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-stone-900 mb-2">
                Start from scratch
              </h3>
              <p class="text-sm text-stone-600 mb-4">
                Create a new empty database. {#if localDBexists}The local database will be kept but not used.{/if}
              </p>
              <button
                onclick={handleCreateNew}
                class="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm"
              >
                Create New Database
              </button>
            </div>
          </div>
        </div>

        <!-- Info Note -->
        <div class="bg-stone-50 border border-stone-200 rounded-lg p-4">
          <p class="text-xs text-stone-600">
            <strong>Note:</strong> You can always export or import your data later using the application controls.
          </p>
        </div>
      </div>
    </div>
  </div>
{/if}