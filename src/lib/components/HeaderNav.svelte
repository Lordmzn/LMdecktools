<script lang="ts">
	import { page } from '$app/stores';

	let currentPath = $derived($page.url.pathname);
	let isHomeActive = $derived(currentPath === '/');
	let isCardListsActive = $derived(currentPath.startsWith('/card-lists'));
	let isCollectionActive = $derived(currentPath === '/collection');
</script>

<!-- Logo + Tab Navigation -->
<nav class="flex items-center gap-1">
	<!-- Card-deck logo + brand name -->
	<a href="/" class="mr-3 flex items-center gap-2">
		<svg
			class="h-7 w-7 text-orange-400"
			viewBox="0 0 24 24"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect x="1" y="5" width="12" height="16" rx="2" stroke="currentColor" stroke-width="2" />
			<rect
				x="5"
				y="3"
				width="12"
				height="16"
				rx="2"
				stroke="currentColor"
				stroke-width="2"
				fill="rgba(0,0,0,0.4)"
			/>
			<rect
				x="9"
				y="1"
				width="12"
				height="16"
				rx="2"
				stroke="currentColor"
				stroke-width="2"
				fill="rgba(0,0,0,0.4)"
			/>
		</svg>
		<span class="font-bold text-white">LM Deck Tools</span>
	</a>

	<a
		href="/"
		class="rounded-xl px-4 py-2 font-medium transition-all {isHomeActive
			? 'bg-neutral-800 text-orange-400'
			: 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100'}"
	>
		<span class="flex items-center gap-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
				<polyline points="9 22 9 12 15 12 15 22" />
			</svg>
			Home
		</span>
	</a>

	<a
		href="/collection"
		class="rounded-xl px-4 py-2 font-medium transition-all {isCollectionActive
			? 'bg-neutral-800 text-orange-400'
			: 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100'}"
	>
		<span class="flex items-center gap-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<rect width="18" height="18" x="3" y="3" rx="2" />
				<path d="M3 9h18" />
			</svg>
			Collection
		</span>
	</a>

	<a
		href="/card-lists"
		class="rounded-xl px-4 py-2 font-medium transition-all {isCardListsActive
			? 'bg-neutral-800 text-orange-400'
			: 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-100'}"
	>
		<span class="flex items-center gap-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path d="M3 3v18h18" />
				<path d="m19 9-5 5-4-4-3 3" />
			</svg>
			Card Lists
		</span>
	</a>
</nav>
