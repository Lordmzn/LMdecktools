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

  let text = $state("");
  
  // Reactive logic to generate the preview text
  // This updates 'text' automatically whenever 'selectedFields' changes
  $effect(() => {
    // This is where you would normally map over your card data
    text = exportCollectionToText(selectedFields);
  });
  
  function handleCopy() {
    navigator.clipboard.writeText(text);
  }

  function handleDownload() {
    if (!text) return;
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "mtg_collection_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

</script>

{#if show}
<div 
    class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    role="button"
    tabindex="0" 
    onclick={(e) => {if (e.target === e.currentTarget) show = false}}
    onkeydown={(e) => {
      // 1. Check for specific keys (Enter or Space)
      if (e.key === 'Enter' || e.key === ' ') {
        // 2. IMPORTANT: Prevent closing if the user is typing in an input INSIDE the modal
        if (e.target === e.currentTarget) {
          e.preventDefault(); // Stop 'Space' from scrolling the page
          show = false;
        }
      }
    }
  }
  >
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
      <h3 class="text-2xl font-bold mb-4">🚛 Export</h3>
      <p>Use this tool to share your collection outside this app. If you need to backup your collection, use the DB management.</p>

      <div class="mb-4">
        <label class="block text-sm font-semibold text-stone-700 mb-2">Include Fields:</label>
    
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-stone-700">
          
          {#each fieldOptions as option}
            <label class="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                bind:group={selectedFields} 
                value={option.value} 
                class="accent-orange-600 w-4 h-4"
              >
              <span>{option.label}</span>
            </label>
          {/each}

        </div>    
      </div>

      <textarea
        bind:value={text}
        id="export-preview"
        class="w-full h-64 p-3 border border-stone-300 rounded-lg font-mono text-sm"
        placeholder="Select fields to generate preview..."
      ></textarea>

      <div class="flex gap-3 mt-4">
        <button 
          onclick={handleDownload}
          class="px-4 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition font-medium flex-1 sm:flex-none"
        >
          Download File
        </button>
        <button 
          onclick={handleCopy}
          class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          Copy to Clipboard
        </button>
        <button 
          onclick={() => show = false}
          class="px-4 py-2 bg-orange-200 text-orange-900 rounded-lg hover:bg-orange-300 transition"
        >
          Close
        </button>
      </div>

    </div>
  </div>
{/if}
