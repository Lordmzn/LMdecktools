<script lang="ts">
	let { card, owned, onRemove, disabled } = $props<{
		card: any;
		owned: boolean;
		onRemove: (card: any) => void;
		disabled: boolean;
	}>();
</script>

<div
	class="group relative flex w-full max-w-xs flex-col items-center justify-center overflow-hidden text-center"
>
	<!-- Card Image -->
	<div
		class="relative w-full overflow-hidden rounded-lg shadow-lg {owned
			? 'ring-2 ring-green-400'
			: 'ring-2 ring-amber-400'}"
	>
		<img
			src={card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal}
			alt={card.name}
			class="h-auto w-full"
		/>

		<!-- Quantity Badge -->
		<div
			class="absolute top-10 right-4 rounded-full bg-orange-600 px-2 py-1 text-sm font-bold text-white shadow-lg"
		>
			{card.LM_quantity}×
		</div>

		<!-- Remove Overlay -->
		<div
			class="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:opacity-100"
		>
			<button
				onclick={() => onRemove(card)}
				{disabled}
				class="rounded-lg bg-red-500 p-2 font-semibold text-white shadow-lg transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
				title="Remove"
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
	<div class="mt-1 text-xs font-medium {owned ? 'text-green-600' : 'text-amber-600'}">
		{owned ? '✓ Owned' : '✗ Missing'}
	</div>

</div>
