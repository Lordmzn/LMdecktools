<script lang="ts">
	import { page } from '$app/stores';

	let currentPath = $derived($page.url.pathname);
	let isHomeActive = $derived(currentPath === '/');
	let isCardListsActive = $derived(currentPath === '/card-lists');
	let isCollectionActive = $derived(currentPath === '/collection');
</script>

<!-- Tab Navigation -->
<nav class="-mb-px flex gap-1">
	<h1 class="px-6 py-3 text-xl font-bold text-orange-900">⚔️ 🏴‍☠️</h1>

	<a
		href="/"
		class="rounded-t-lg px-6 py-3 font-medium transition-all {isHomeActive
			? 'border-x-2 border-t-2 border-orange-400 bg-orange-50 text-orange-900'
			: 'text-stone-600 hover:bg-orange-50/50 hover:text-orange-900'}"
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
		class="rounded-t-lg px-6 py-3 font-medium transition-all {isCollectionActive
			? 'border-x-2 border-t-2 border-orange-400 bg-orange-50 text-orange-900'
			: 'text-stone-600 hover:bg-orange-50/50 hover:text-orange-900'}"
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
		class="rounded-t-lg px-6 py-3 font-medium transition-all {isCardListsActive
			? 'border-x-2 border-t-2 border-orange-400 bg-orange-50 text-orange-900'
			: 'text-stone-600 hover:bg-orange-50/50 hover:text-orange-900'}"
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
