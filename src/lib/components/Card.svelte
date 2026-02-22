<script lang="ts">
	import { store } from '$lib/store.svelte';

	let { card, add = () => null, showOwned = true, target = 'collection' } = $props();
	let isAdding = $state(false);
	let ownedQuantity = $derived(store.isCardOwned(card.id));

	function handleAdd() {
		isAdding = true;
		add(card);
		setTimeout(() => {
			isAdding = false;
		}, 300);
	}
</script>

<div
	class="group relative flex w-full max-w-xs flex-col items-center justify-center overflow-hidden text-center transition-transform hover:scale-105"
>
	<!-- Card Image -->
	<div class="relative w-full overflow-hidden rounded-lg shadow-lg">
		<img
			src={card.image_uris ? card.image_uris.normal : card.card_faces[0].image_uris.normal}
			alt={card.name}
			class="h-auto w-full"
		/>

		<!-- Owned Badge -->
		{#if showOwned && ownedQuantity > 0}
			<div
				class="absolute top-2 right-2 rounded-full bg-orange-600 px-2 py-1 text-xs font-bold text-white shadow-lg"
			>
				Own: {ownedQuantity}
			</div>
		{/if}

		<!-- Overlay on Hover -->
		<div
			class="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:opacity-100"
		>
			<button
				data-testid="card-add-btn"
				onclick={handleAdd}
				class="flex translate-y-4 transform items-center gap-2 rounded-lg bg-white px-4 py-2 font-semibold text-stone-900 shadow-lg transition-all group-hover:translate-y-0 hover:bg-stone-100 {isAdding
					? 'scale-110'
					: ''}"
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
					class="transition-transform {isAdding ? 'rotate-90' : ''}"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M8 12h8" />
					<path d="M12 8v8" />
				</svg>
				Add to {target === 'collection' ? 'Collection' : 'List'}
			</button>
		</div>
	</div>

	<!-- Card Name Below -->
	<div class="mt-2 w-full px-2 text-sm font-medium text-stone-700">
		{card.name}
	</div>
</div>
