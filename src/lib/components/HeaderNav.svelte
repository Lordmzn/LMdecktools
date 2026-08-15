<script lang="ts">
	import { page } from '$app/stores';
	import BrandMark from '$lib/components/BrandMark.svelte';
	import * as m from '$lib/paraglide/messages';

	let currentPath = $derived($page.url.pathname);
	let isHomeActive = $derived(currentPath === '/');
	let isCardListsActive = $derived(currentPath.startsWith('/card-lists'));
	let isCollectionActive = $derived(currentPath === '/collection');

	const linkBase =
		'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.82rem] font-medium transition-all sm:px-3.5';
	const linkIdle = 'text-slate-400 hover:bg-orange-500/[0.06] hover:text-orange-300';
	const linkActive = 'bg-orange-500/10 text-orange-400';
</script>

<!-- Brand mark + tab navigation -->
<nav class="flex min-w-0 items-center gap-0.5">
	<!-- Skull-and-tricorn brand mark -->
	<a href="/" class="mr-2 flex shrink-0 items-center gap-2 sm:mr-4">
		<BrandMark class="h-7 w-7" />
		<span class="hidden text-[0.95rem] font-bold tracking-tight text-orange-50 sm:inline"
			>LM Deck Tools</span
		>
	</a>

	<a href="/" class="{linkBase} {isHomeActive ? linkActive : linkIdle}">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
			<polyline points="9 22 9 12 15 12 15 22" />
		</svg>
		<span class="sr-only sm:not-sr-only">{m.nav_home()}</span>
	</a>

	<a href="/collection" class="{linkBase} {isCollectionActive ? linkActive : linkIdle}">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<path d="M3 9h18" />
		</svg>
		<span class="sr-only sm:not-sr-only">{m.nav_collection()}</span>
	</a>

	<a href="/card-lists" class="{linkBase} {isCardListsActive ? linkActive : linkIdle}">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M3 3v18h18" />
			<path d="m19 9-5 5-4-4-3 3" />
		</svg>
		<span class="sr-only sm:not-sr-only">{m.nav_card_lists()}</span>
	</a>
</nav>
