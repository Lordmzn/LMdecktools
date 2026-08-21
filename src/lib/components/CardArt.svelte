<script lang="ts">
	/**
	 * A card's art, or a stand-in for it.
	 *
	 * Since #84 the saved record holds no image URL — art is a Scryfall fact,
	 * cached locally and refetched when missing — so "no art yet" is a state the
	 * UI has to draw rather than an error. It happens with a database restored
	 * from another device, until the facts fetch catches up. Name, set and
	 * collector number are in the record for exactly this: enough to recognise
	 * the card and to find the printing again.
	 */
	import { getImageUrl } from '$lib/image-cache';

	let {
		url,
		name,
		set = '',
		collectorNumber = '',
		thumb = false
	}: {
		url?: string;
		name: string;
		set?: string;
		collectorNumber?: string;
		thumb?: boolean;
	} = $props();

	const printing = $derived([set?.toUpperCase(), collectorNumber].filter(Boolean).join(' · '));
</script>

{#if url}
	{#await getImageUrl(url) then cachedUrl}
		<img
			src={cachedUrl}
			alt={name}
			class={thumb ? 'h-12 w-9 rounded object-cover' : 'h-auto w-full'}
		/>
	{/await}
{:else if thumb}
	<div
		class="flex h-12 w-9 shrink-0 items-center justify-center rounded border border-slate-700 bg-slate-800 font-mono text-[0.55rem] tracking-tight text-slate-500 uppercase"
	>
		{set ? set.toUpperCase() : '—'}
	</div>
{:else}
	<div
		class="flex aspect-[5/7] w-full flex-col items-center justify-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 text-center"
	>
		<span class="text-sm font-medium text-balance text-slate-300">{name}</span>
		{#if printing}
			<span class="font-mono text-[0.65rem] tracking-wider text-slate-500">{printing}</span>
		{/if}
	</div>
{/if}
