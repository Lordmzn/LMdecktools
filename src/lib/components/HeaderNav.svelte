<script lang="ts">
	import { page } from '$app/stores';

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
		<svg
			class="h-7 w-7"
			viewBox="0 0 100 100"
			fill="none"
			stroke="#c2410c"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path
				d="M27 45c-2 8-1 15 3 21 1.6 2.6 2.5 4.6 2.5 6.5V74c0 2 1.6 3.5 3.5 3.5h28c1.9 0 3.5-1.5 3.5-3.5v-1.5c0-1.9 0.9-3.9 2.5-6.5 4-6 5-13 3-21C73 31 27 31 27 45z"
				fill="#fdba74"
				stroke-width="2.6"
			/>
			<ellipse cx="38" cy="57" rx="7" ry="8" fill="#0a0c10" stroke-width="2.4" />
			<ellipse cx="62" cy="57" rx="7" ry="8" fill="#0a0c10" stroke-width="2.4" />
			<path d="M50 62 45.5 71h9z" fill="#0a0c10" stroke-width="1.8" />
			<path
				d="M40 75v6.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V75M47.5 75v6.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V75M55 75v6.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V75"
				fill="#fed7aa"
				stroke="#c2410c"
				stroke-width="1.4"
			/>
			<path
				d="M14 40c-2-13 6-23 20-27 5-1.4 11-1.4 16 0 5-1.4 11-1.4 16 0 14 4 22 14 20 27-9-5-19-7-32-6-13-1-23 1-32 6z"
				fill="#1a1d26"
				stroke="#fb923c"
				stroke-width="2.2"
			/>
			<g stroke="#fed7aa" stroke-width="2.2" fill="#fed7aa">
				<path d="M40 14 56 22" />
				<path d="M56 14 40 22" />
				<circle cx="38.5" cy="13.5" r="1.2" />
				<circle cx="40.5" cy="11.5" r="1.2" />
				<circle cx="57.5" cy="22.5" r="1.2" />
				<circle cx="55.5" cy="24.5" r="1.2" />
				<circle cx="38.5" cy="22.5" r="1.2" />
				<circle cx="40.5" cy="24.5" r="1.2" />
				<circle cx="57.5" cy="13.5" r="1.2" />
				<circle cx="55.5" cy="11.5" r="1.2" />
			</g>
		</svg>
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
		<span class="sr-only sm:not-sr-only">Home</span>
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
		<span class="sr-only sm:not-sr-only">Collection</span>
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
		<span class="sr-only sm:not-sr-only">Card Lists</span>
	</a>
</nav>
