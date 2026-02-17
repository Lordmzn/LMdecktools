<script lang="ts">
  let { card, onAdd, onRemove, onUpdate } = $props();
  
  let isEditing = $state(false);
  let editQuantity = $derived(card.quantity_owned);
  
  function handleAdd() {
    onAdd(card);
  }
  
  function handleRemove() {
    onRemove(card);
  }
  
  function startEdit() {
    isEditing = true;
    editQuantity = card.quantity_owned;
  }
  
  function saveEdit() {
    if (editQuantity !== card.quantity_owned) {
      onUpdate(card, parseInt(editQuantity));
    }
    isEditing = false;
  }
  
  function cancelEdit() {
    isEditing = false;
    editQuantity = card.quantity_owned;
  }
</script>

<div class="group relative w-full overflow-hidden max-w-xs flex flex-col items-center justify-center text-center">
  <!-- Card Image -->
  <div class="relative w-full rounded-lg overflow-hidden shadow-lg">
    <img 
      src={card.image_uris ? card.image_uris.normal : card.card_faces[0].image_uris.normal} 
      alt={card.name} 
      class="w-full h-auto"
    />
    
    <!-- Quantity Badge -->
    <div class="absolute top-10 right-4 bg-orange-600 text-white px-2 py-1 rounded-full text-sm font-bold shadow-lg">
      {card.quantity_owned}×
    </div>
    
    <!-- Controls Overlay -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center p-4">
      <div class="flex gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all">
        <button 
          onclick={handleRemove}
          class="p-2 bg-red-500 text-white rounded-lg font-semibold shadow-lg hover:bg-red-600 transition"
          title="Remove one"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
          </svg>
        </button>
        
        <button 
          onclick={startEdit}
          class="p-2 bg-orange-100 text-orange-900 rounded-lg font-semibold shadow-lg hover:bg-orange-200 transition"
          title="Edit quantity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          </svg>
        </button>
        
        <button 
          onclick={handleAdd}
          class="p-2 bg-green-500 text-white rounded-lg font-semibold shadow-lg hover:bg-green-600 transition"
          title="Add one"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14"/>
            <path d="M12 5v14"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
  
  <!-- Card Name -->
  <div class="mt-2 text-sm font-medium text-orange-900 w-full px-2">
    {card.name}
  </div>
  
  <!-- Set Name -->
  <div class="text-xs text-stone-500 w-full px-2">
    {card.set_name || ''}
  </div>
</div>

<!-- Edit Quantity Modal -->
{#if isEditing}
  <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick={cancelEdit}>
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full" onclick={(e) => e.stopPropagation()}>
      <h3 class="text-lg font-bold mb-4">Edit Quantity</h3>
      <p class="text-sm text-stone-600 mb-4">{card.name}</p>
      
      <div class="flex items-center gap-3 mb-6">
        <label class="text-sm font-medium">Quantity:</label>
        <input 
          type="number" 
          bind:value={editQuantity}
          min="0"
          class="flex-1 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>
      
      <div class="flex gap-3">
        <button 
          onclick={saveEdit}
          class="flex-1 px-4 py-2 bg-orange-700 text-white rounded-lg hover:bg-orange-800 transition"
        >
          Save
        </button>
        <button 
          onclick={cancelEdit}
          class="flex-1 px-4 py-2 bg-stone-200 text-stone-800 rounded-lg hover:bg-stone-300 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}
