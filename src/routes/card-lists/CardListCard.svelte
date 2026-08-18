<script lang="ts">
	import { getImageUrl } from '$lib/image-cache';
	import * as m from '$lib/paraglide/messages';

	let { card, owned, onRemove, onAddToCollection, onIncrement, onDecrement, disabled } = $props<{
		card: any;
		owned: boolean;
		onRemove: (card: any) => void;
		onAddToCollection: (card: any) => void;
		onIncrement: (card: any) => void;
		onDecrement: (card: any) => void;
		disabled: boolean;
	}>();
	const isDFC = $derived(card.card_faces?.length > 1);
	let flipped = $state(false);
	const faceIndex = $derived(flipped ? 1 : 0);
	const imageUrl = $derived(
		card.image_uris?.normal ??
			card.card_faces?.[faceIndex]?.image_uris?.normal ??
			card.card_faces?.[0]?.image_uris?.normal
	);
</script>

<div
	class="group relative flex w-full max-w-xs flex-col items-center justify-center overflow-hidden text-center"
>
	<!-- Card Image -->
	<div
		class="relative w-full overflow-hidden rounded-lg shadow-lg {owned
			? 'ring-success ring-2'
			: 'ring-warning ring-2'}"
	>
		{#await getImageUrl(imageUrl) then cachedUrl}
			<img src={cachedUrl} alt={card.name} class="h-auto w-full" />
		{/await}

		<!-- Quantity Stepper — an 18×24 pill floating on the art is the control a
		     user hits most while building a list, and the smallest thing in the
		     app. On touch it leaves the art and becomes a full-width 44px row
		     under it (#76). -->
		<div
			class="touch:static touch:w-full touch:gap-0 touch:rounded-none touch:shadow-none absolute top-8 right-2 flex items-center gap-0.5 rounded-full bg-orange-500 shadow-lg"
		>
			<button
				onclick={() => onDecrement(card)}
				{disabled}
				class="touch:h-11 touch:flex-1 touch:rounded-none touch:px-0 touch:text-lg rounded-l-full py-0.5 pr-0.5 pl-2 text-sm font-bold text-slate-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
				aria-label={card.LM_quantity <= 1 ? m.card_remove_from_list() : m.card_decrease_quantity()}
				title={card.LM_quantity <= 1 ? m.card_remove_from_list() : m.card_decrease_quantity()}
			>
				−
			</button>
			<span
				class="touch:flex touch:h-11 touch:flex-1 touch:items-center touch:justify-center touch:font-mono min-w-[1.5rem] py-0.5 text-center text-sm font-bold text-slate-100"
			>
				{card.LM_quantity}×
			</span>
			<button
				onclick={() => onIncrement(card)}
				{disabled}
				class="touch:h-11 touch:flex-1 touch:rounded-none touch:px-0 touch:text-lg rounded-r-full py-0.5 pr-2 pl-0.5 text-sm font-bold text-slate-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
				aria-label={m.card_increase_quantity()}
				title={m.card_increase_quantity()}
			>
				+
			</button>
		</div>

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

		<!-- Action Overlay — visible without a hover on touch, and carrying text
		     rather than a bare glyph. `title` is the only label these ever had,
		     and a tooltip needs a hover to exist, so on a phone the `+` here and
		     the `+` in the stepper 40px away were the same wordless button
		     meaning two different things (#76). -->
		<div
			class="touch:static touch:gap-px touch:bg-slate-900 touch:bg-none touch:p-0 touch:opacity-100 absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:opacity-100"
		>
			<button
				onclick={() => onAddToCollection(card)}
				{disabled}
				class="bg-success-solid hover:bg-success touch:h-11 touch:flex-1 touch:rounded-none touch:text-[0.7rem] touch:shadow-none flex items-center justify-center gap-1 rounded-lg p-2 font-semibold text-slate-950 shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50"
				aria-label={m.card_add_to_collection()}
				title={m.card_add_to_collection()}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="touch:h-4 touch:w-4 shrink-0"
				>
					<path d="M5 12h14" />
					<path d="M12 5v14" />
				</svg>
				<span class="touch:inline hidden">{m.card_action_to_collection()}</span>
			</button>
			<button
				onclick={() => onRemove(card)}
				{disabled}
				class="bg-danger-solid hover:bg-danger touch:h-11 touch:flex-1 touch:rounded-none touch:text-[0.7rem] touch:shadow-none flex items-center justify-center gap-1 rounded-lg p-2 font-semibold text-slate-950 shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50"
				aria-label={m.card_remove_card()}
				title={m.card_remove_card()}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					class="touch:h-4 touch:w-4 shrink-0"
				>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
				<span class="touch:inline hidden">{m.card_action_remove()}</span>
			</button>
		</div>
	</div>

	<!-- Owned / Missing indicator -->
	<div class="mt-1 text-xs font-medium {owned ? 'text-success' : 'text-warning'}">
		{owned ? m.card_owned() : m.card_missing()}
	</div>
</div>
