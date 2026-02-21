<script lang="ts">
  let { card, owned, onRemove, disabled } = $props<{
    card: any;
    owned: boolean;
    onRemove: (card: any) => void;
    disabled: boolean;
  }>();
</script>

<div class="group relative w-full overflow-hidden max-w-xs flex flex-col items-center justify-center text-center">
  <!-- Card Image -->
  <div class="relative w-full rounded-lg overflow-hidden shadow-lg {owned ? 'ring-2 ring-green-400' : 'ring-2 ring-amber-400'}">
    <img
      src={card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal}
      alt={card.name}
      class="w-full h-auto"
    />

    <!-- Quantity Badge -->
    <div class="absolute top-10 right-4 bg-orange-600 text-white px-2 py-1 rounded-full text-sm font-bold shadow-lg">
      {card.LM_quantity}×
    </div>

    <!-- Remove Overlay -->
    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center p-4">
      <button
        onclick={() => onRemove(card)}
        {disabled}
        class="p-2 bg-red-500 text-white rounded-lg font-semibold shadow-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
        title="Remove"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6 6 18"/>
          <path d="m6 6 12 12"/>
        </svg>
      </button>
    </div>
  </div>

  <!-- Owned / Missing indicator -->
  <div class="mt-1 text-xs font-medium {owned ? 'text-green-600' : 'text-amber-600'}">
    {owned ? '✓ Owned' : '✗ Missing'}
  </div>

  <!-- Card Name -->
  <div class="mt-1 text-sm font-medium text-orange-900 w-full px-2">
    {card.name}
  </div>

  <!-- Set Name -->
  <div class="text-xs text-stone-500 w-full px-2">
    {card.set_name || ''}
  </div>
</div>
