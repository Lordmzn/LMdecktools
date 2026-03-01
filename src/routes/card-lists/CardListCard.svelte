<script lang="ts">
	let { card, owned, onRemove, onAddToCollection, onIncrement, onDecrement, disabled } = $props<{
		card: any;
		owned: boolean;
		onRemove: (card: any) => void;
		onAddToCollection: (card: any) => void;
		onIncrement: (card: any) => void;
		onDecrement: (card: any) => void;
		disabled: boolean;
	}>();
</script>

<div
	class="group relative flex w-full max-w-xs flex-col items-center justify-center overflow-hidden text-center"
>
	<!-- Card Image -->
	<div
		class="relative w-full overflow-hidden rounded-lg shadow-lg {owned
			? 'ring-2 ring-green-500'
			: 'ring-2 ring-amber-500'}"
	>
		<img
			src={card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal}
			alt={card.name}
			class="h-auto w-full"
		/>

		<!-- Quantity Stepper -->
		<div
			class="absolute top-8 right-2 flex items-center gap-0.5 rounded-full bg-orange-500 shadow-lg"
		>
			<button
				onclick={() => onDecrement(card)}
				{disabled}
				class="rounded-l-full py-0.5 pr-0.5 pl-2 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
				title={card.LM_quantity <= 1 ? 'Remove from list' : 'Decrease quantity'}
			>
				−
			</button>
			<span class="min-w-[1.5rem] py-0.5 text-center text-sm font-bold text-white">
				{card.LM_quantity}×
			</span>
			<button
				onclick={() => onIncrement(card)}
				{disabled}
				class="rounded-r-full py-0.5 pr-2 pl-0.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
				title="Increase quantity"
			>
				+
			</button>
		</div>

		<!-- Action Overlay -->
		<div
			class="absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:opacity-100"
		>
			<button
				onclick={() => onAddToCollection(card)}
				{disabled}
				class="rounded-lg bg-green-600 p-2 font-semibold text-white shadow-lg transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
				title="Add to collection"
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
			<button
				onclick={() => onRemove(card)}
				{disabled}
				class="rounded-lg bg-red-500 p-2 font-semibold text-white shadow-lg transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
				title="Remove from list"
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
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Owned / Missing indicator -->
	<div class="mt-1 text-xs font-medium {owned ? 'text-green-400' : 'text-amber-400'}">
		{owned ? '✓ Owned' : '✗ Missing'}
	</div>
</div>
