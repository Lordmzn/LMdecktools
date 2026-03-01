<script lang="ts">
	import type { ComparedCard } from '$lib/compare';

	type ColorVariant = 'amber' | 'green' | 'blue';

	interface Props {
		title: string;
		color: ColorVariant;
		cards: ComparedCard[];
		showBothQuantities?: boolean;
		nameA?: string;
		nameB?: string;
	}

	let { title, color, cards, showBothQuantities = false, nameA = 'A', nameB = 'B' }: Props =
		$props();

	const colorMap: Record<ColorVariant, { border: string; bg: string; text: string; badge: string }> =
		{
			amber: {
				border: 'border-amber-800',
				bg: 'bg-amber-950',
				text: 'text-amber-400',
				badge: 'bg-amber-500'
			},
			green: {
				border: 'border-green-800',
				bg: 'bg-green-950',
				text: 'text-green-400',
				badge: 'bg-green-500'
			},
			blue: {
				border: 'border-blue-800',
				bg: 'bg-blue-950',
				text: 'text-blue-400',
				badge: 'bg-blue-500'
			}
		};

	const colorClasses = $derived(colorMap[color]);
</script>

<div class="flex flex-col rounded-xl border {colorClasses.border} {colorClasses.bg} p-4">
	<h3 class="mb-3 text-sm font-semibold uppercase tracking-wide {colorClasses.text}">
		{title}
		<span class="ml-1 rounded-full {colorClasses.badge} px-2 py-0.5 text-xs text-white">
			{cards.length}
		</span>
	</h3>

	{#if cards.length === 0}
		<p class="py-6 text-center text-sm text-neutral-500">No cards</p>
	{:else}
		<div class="space-y-2">
			{#each cards as { card, quantityA, quantityB } (card.id + card.name)}
				<div class="flex items-center gap-3 rounded-lg bg-black/30 p-2">
					<!-- Thumbnail -->
					<img
						src={card.image_uris?.small ?? card.card_faces?.[0]?.image_uris?.small}
						alt={card.name}
						class="h-12 w-9 rounded object-cover"
					/>

					<!-- Name -->
					<span class="min-w-0 flex-1 truncate text-sm text-neutral-200">{card.name}</span>

					<!-- Quantity badge(s) -->
					{#if showBothQuantities}
						<span class="text-xs text-neutral-400">
							<span class="text-amber-400">{quantityA}</span>
							/
							<span class="text-blue-400">{quantityB}</span>
						</span>
					{:else}
						<span
							class="rounded-full {colorClasses.badge} min-w-[1.5rem] px-1.5 py-0.5 text-center text-xs font-bold text-white"
						>
							{quantityA || quantityB}
						</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
