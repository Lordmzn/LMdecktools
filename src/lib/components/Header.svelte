<script lang="ts">
	import HeaderNav from '$lib/components/HeaderNav.svelte';
	import DBSelectionModal from '$lib/components/DBSelectionModal.svelte';

	import { store } from '$lib/store.svelte';

	let showStartupModal = $state(false);
</script>

<DBSelectionModal bind:show={showStartupModal} />
<header
	class="sticky top-0 z-40 border-b border-orange-500/[0.08] bg-slate-950/80 backdrop-blur-xl backdrop-saturate-150"
>
	<div class="flex h-[60px] items-center justify-between px-4 sm:px-8">
		<!-- Logo + Tab Navigation -->
		<HeaderNav />

		<!-- DB Status Button -->
		<button
			onclick={() => (showStartupModal = !showStartupModal)}
			class="relative inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-[0.82rem] font-semibold tracking-tight transition-all duration-200 {store.dbMode ===
			'active'
				? 'bg-orange-500 text-slate-950 shadow-[0_2px_16px_rgba(249,115,22,0.3)] hover:bg-orange-600'
				: store.dbMode === 'peek'
					? 'bg-amber-600 text-white hover:bg-amber-700'
					: 'border border-orange-500/20 text-orange-300 hover:border-orange-500/40 hover:bg-orange-500/[0.06]'}"
			title="Gestione Database"
			data-testid="db-modal-toggle"
		>
			{#if store.linkedFileStatus === 'active'}
				<span class="absolute -top-1 -right-1 flex h-3 w-3">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
					></span>
					<span class="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
				</span>
			{:else if store.linkedFileStatus === 'write-error' || store.linkedFileStatus === 'not-found'}
				<span class="absolute -top-1 -right-1 flex h-3 w-3">
					<span class="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
				</span>
			{:else if store.linkedFileStatus === 'reconnect'}
				<span class="absolute -top-1 -right-1 flex h-3 w-3">
					<span class="relative inline-flex h-3 w-3 rounded-full bg-amber-500"></span>
				</span>
			{/if}
			{#if store.dbMode === 'none'}
				<!-- Plain DB icon — no database selected yet -->
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
					/>
				</svg>
			{:else if store.dbMode === 'peek'}
				<!-- DB + magnifying glass — read-only preview mode -->
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
					/>
					<!-- Filled circle = "lens window" -->
					<circle cx="17" cy="5" r="3.8" fill="white" />
					<!-- Lens ring -->
					<circle cx="17" cy="5" r="3" stroke="currentColor" stroke-width="2" fill="none" />
					<!-- Handle -->
					<path
						d="M19.2 7.2 L21.5 9.5"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			{:else}
				<!-- DB + green checkmark — fully active -->
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
					<path
						stroke="currentColor"
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
					/>
					<g transform="translate(4, 4)">
						<path
							d="M20 6 9 17l-5-5"
							stroke="white"
							stroke-width="5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<path
							d="M20 6 9 17l-5-5"
							class="text-green-400"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</g>
				</svg>
			{/if}
			<span>
				{#if store.dbMode === 'active'}Database
				{:else if store.dbMode === 'peek'}Preview
				{:else}Choose DB
				{/if}
			</span>
			{#if showStartupModal}
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"
					></path>
				</svg>
			{:else}
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"
					></path>
				</svg>
			{/if}
		</button>
	</div>
</header>
