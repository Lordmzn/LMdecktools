<script lang="ts">
	import { getImageUrl } from '$lib/image-cache';

	let { card, onAdd, onRemove, onUpdate } = $props();
	const isDFC = $derived(card.card_faces?.length > 1);
	let flipped = $state(false);
	const faceIndex = $derived(flipped ? 1 : 0);
	const imageUrl = $derived(
		card.image_uris?.normal
			?? card.card_faces?.[faceIndex]?.image_uris?.normal
			?? card.card_faces?.[0]?.image_uris?.normal
	);

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

<div
	class="group relative flex w-full max-w-xs flex-col items-center justify-center overflow-hidden text-center"
>
	<!-- Card Image -->
	<div class="relative w-full overflow-hidden rounded-lg shadow-lg">
		{#await getImageUrl(imageUrl) then cachedUrl}
			<img src={cachedUrl} alt={card.name} class="h-auto w-full" />
		{/await}

		<!-- Quantity Badge -->
		<div
			class="absolute top-10 right-4 rounded-full bg-orange-500 px-2 py-1 text-sm font-bold text-neutral-100 shadow-lg"
		>
			{card.quantity_owned}×
		</div>

		<!-- Flip Button for DFCs -->
		{#if isDFC}
			<button
				onclick={() => (flipped = !flipped)}
				class="absolute top-2 left-2 rounded-full bg-neutral-800/80 p-1.5 text-neutral-100 shadow-lg transition hover:bg-neutral-700"
				title="Flip card"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
					<path d="M3 3v5h5" />
					<path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
					<path d="M16 16h5v5" />
				</svg>
			</button>
		{/if}

		<!-- Controls Overlay -->
		<div
			class="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:opacity-100"
		>
			<div class="flex translate-y-4 transform gap-2 transition-all group-hover:translate-y-0">
				<button
					onclick={handleRemove}
					class="rounded-lg bg-red-500 p-2 font-semibold text-neutral-100 shadow-lg transition hover:bg-red-600"
					title="Remove one"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M5 12h14" />
					</svg>
				</button>

				<button
					onclick={startEdit}
					class="rounded-lg bg-neutral-700 p-2 font-semibold text-neutral-100 shadow-lg transition hover:bg-neutral-600"
					title="Edit quantity"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
					</svg>
				</button>

				<button
					onclick={handleAdd}
					class="rounded-lg bg-green-500 p-2 font-semibold text-neutral-100 shadow-lg transition hover:bg-green-600"
					title="Add one"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M5 12h14" />
						<path d="M12 5v14" />
					</svg>
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Edit Quantity Modal -->
{#if isEditing}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={cancelEdit}
	>
		<div
			class="panel w-full max-w-sm rounded-xl p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="mb-4 text-lg font-bold text-neutral-100">Edit Quantity</h3>
			<p class="mb-4 text-sm text-neutral-400">{card.name}</p>

			<div class="mb-6 flex items-center gap-3">
				<label class="text-sm font-medium text-neutral-300">Quantity:</label>
				<input
					type="number"
					bind:value={editQuantity}
					min="0"
					class="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
				/>
			</div>

			<div class="flex gap-3">
				<button
					onclick={saveEdit}
					class="flex-1 rounded-lg bg-orange-500 px-4 py-2 text-neutral-100 transition hover:bg-orange-600"
				>
					Save
				</button>
				<button
					onclick={cancelEdit}
					class="flex-1 rounded-lg bg-neutral-800 px-4 py-2 text-neutral-200 transition hover:bg-neutral-700"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
