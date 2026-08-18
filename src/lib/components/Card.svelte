<script lang="ts">
	import { store } from '$lib/store.svelte';
	import { getImageUrl } from '$lib/image-cache';
	import * as m from '$lib/paraglide/messages';

	let { card, add = () => null, showOwned = true, target = 'collection' } = $props();
	const isDFC = $derived(card.card_faces?.length > 1);
	let flipped = $state(false);
	const faceIndex = $derived(flipped ? 1 : 0);
	const imageUrl = $derived(
		card.image_uris?.normal ??
			card.card_faces?.[faceIndex]?.image_uris?.normal ??
			card.card_faces?.[0]?.image_uris?.normal
	);
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
		{#await getImageUrl(imageUrl) then cachedUrl}
			<img src={cachedUrl} alt={card.name} class="h-auto w-full" />
		{/await}

		<!-- Owned Badge -->
		{#if showOwned && ownedQuantity > 0}
			<div
				class="absolute top-2 right-2 rounded-full bg-orange-500 px-2 py-1 text-xs font-bold text-slate-950 shadow-lg"
			>
				{m.card_own_badge({ count: ownedQuantity })}
			</div>
		{/if}

		<!-- Flip Button for DFCs -->
		{#if isDFC}
			<button
				onclick={() => (flipped = !flipped)}
				class="tap-target absolute top-2 left-2 rounded-full bg-slate-800/80 p-1.5 text-slate-100 shadow-lg transition hover:bg-slate-700"
				aria-label={m.common_flip_card()}
				title={m.common_flip_card()}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
					<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
					<path d="M16 16h5v5" />
				</svg>
			</button>
		{/if}

		<!-- Overlay on Hover — and a plain button under the art on touch, where
		     "hover" is not an input a user has (#76). -->
		<div
			class="touch:static touch:bg-slate-900 touch:bg-none touch:p-0 touch:opacity-100 absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:opacity-100"
		>
			<button
				data-testid="card-add-btn"
				onclick={handleAdd}
				class="touch:h-11 touch:w-full touch:translate-y-0 touch:rounded-none touch:px-2 touch:text-[0.7rem] touch:shadow-none flex translate-y-4 transform items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-900 shadow-lg transition-all group-hover:translate-y-0 hover:bg-white {isAdding
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
					class="touch:h-4 touch:w-4 shrink-0 transition-transform {isAdding ? 'rotate-90' : ''}"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="M8 12h8" />
					<path d="M12 8v8" />
				</svg>
				{target === 'collection' ? m.card_add_to_collection_button() : m.card_add_to_list_button()}
			</button>
		</div>
	</div>

	<!-- Card Name Below -->
	<div class="mt-2 w-full px-2 text-sm font-medium text-slate-300">
		{card.name}
	</div>
</div>
