<script lang="ts">
	import type { ComparedCard } from '$lib/compare';
	import * as m from '$lib/paraglide/messages';

	// Named for the column's job, not its hue — these are categorical labels, so
	// the palette behind them is free to move without the call sites lying (#40).
	type ColorVariant = 'onlyA' | 'both' | 'onlyB';

	interface Props {
		title: string;
		color: ColorVariant;
		cards: ComparedCard[];
		showBothQuantities?: boolean;
		nameA?: string;
		nameB?: string;
	}

	let {
		title,
		color,
		cards,
		showBothQuantities = false,
		nameA = 'A',
		nameB = 'B'
	}: Props = $props();

	const colorMap: Record<
		ColorVariant,
		{ border: string; bg: string; text: string; badge: string }
	> = {
		onlyA: {
			border: 'border-cat-parchment-edge',
			bg: 'bg-cat-parchment-surface',
			text: 'text-cat-parchment',
			badge: 'bg-cat-parchment-solid'
		},
		both: {
			border: 'border-cat-sea-edge',
			bg: 'bg-cat-sea-surface',
			text: 'text-cat-sea',
			badge: 'bg-cat-sea-solid'
		},
		onlyB: {
			border: 'border-cat-steel-edge',
			bg: 'bg-cat-steel-surface',
			text: 'text-cat-steel',
			badge: 'bg-cat-steel-solid'
		}
	};

	const colorClasses = $derived(colorMap[color]);
</script>

<div class="flex flex-col rounded-xl border {colorClasses.border} {colorClasses.bg} p-4">
	<h3 class="mb-1 text-sm font-semibold tracking-wide uppercase {colorClasses.text}">
		{title}
		<span class="ml-1 rounded-full {colorClasses.badge} px-2 py-0.5 text-xs text-slate-950">
			{cards.length}
		</span>
	</h3>

	<!-- Which number is which list, said once at the top of the column rather
	     than in a `title` on every row — a tooltip needs a hover, and a phone has
	     no hover to give it (#76). -->
	{#if showBothQuantities && cards.length > 0}
		<p class="mb-2 font-mono text-[0.65rem] tracking-wider text-slate-400 uppercase">
			<span class="text-cat-parchment">{nameA}</span>
			/
			<span class="text-cat-steel">{nameB}</span>
		</p>
	{:else}
		<div class="mb-2"></div>
	{/if}

	{#if cards.length === 0}
		<p class="py-6 text-center text-sm text-slate-500">{m.compare_no_cards()}</p>
	{:else}
		<div class="space-y-2">
			{#each cards as { card, quantityA, quantityB } (card.id + card.name)}
				{@const isDFC = card.card_faces?.length > 1}
				<div class="flex items-center gap-3 rounded-lg bg-black/30 p-2">
					<!-- Thumbnail -->
					{#if isDFC}
						<button
							onclick={(e: MouseEvent) => {
								const img = (e.currentTarget as HTMLElement).querySelector('img');
								if (!img) return;
								const isFlipped = img.dataset.flipped === 'true';
								const newFace = isFlipped ? 0 : 1;
								img.src = card.card_faces[newFace].image_uris.small;
								img.dataset.flipped = String(!isFlipped);
							}}
							class="shrink-0 cursor-pointer"
							aria-label={m.common_flip_card()}
							title={m.common_flip_card()}
						>
							<img
								src={card.card_faces[0].image_uris.small}
								alt={card.name}
								data-flipped="false"
								class="h-12 w-9 rounded object-cover"
							/>
						</button>
					{:else}
						<img
							src={card.image_uris?.small ?? card.card_faces?.[0]?.image_uris?.small}
							alt={card.name}
							class="h-12 w-9 rounded object-cover"
						/>
					{/if}

					<!-- Name -->
					<span class="min-w-0 flex-1 truncate text-sm text-slate-200">{card.name}</span>

					<!-- Quantity badge(s) -->
					{#if showBothQuantities}
						<span class="font-mono text-xs text-slate-400">
							<span class="text-cat-parchment">{quantityA}</span>
							/
							<span class="text-cat-steel">{quantityB}</span>
						</span>
					{:else}
						<span
							class="rounded-full {colorClasses.badge} min-w-[1.5rem] px-1.5 py-0.5 text-center text-xs font-bold text-slate-950"
						>
							{quantityA || quantityB}
						</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
