<!--
	The full hero illustration: the brand mark plus a fanned pair of cards played
	from below. Taller than the mark — viewBox `0 0 100 118`, not `0 0 100 100` —
	so size it by width and let the height follow.

	Traced from `static/jolly-roger.svg`, byte-identical to the design system's
	`assets/illustrations/jolly-roger.svg`. See [BrandMark](./BrandMark.svelte)
	for why the art lives in a component instead of at the call site (#66).
-->
<script lang="ts">
	let { class: className = 'w-[90px]' }: { class?: string } = $props();
</script>

<svg
	class={className}
	viewBox="0 0 100 118"
	fill="none"
	stroke="#c2410c"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<!-- Cranium -->
	<path
		d="M27 45c-2 8-1 16 3 22.5 2 3.2 2.5 5.2 2.5 7.5V72c0 2.2 1.8 4 4 4h27c2.2 0 4-1.8 4-4v3c0-2.3 0.5-4.3 2.5-7.5 4-6.5 5-14.5 3-22.5 C 73 30 27 30 27 45 Z"
		fill="#fdba74"
		stroke-width="2.6"
	/>
	<path d="M27 45c1-3 3-4.5 6-4.8M73 45c-1-3-3-4.5-6-4.8" stroke-width="1.6" opacity="0.7" />

	<!-- Sockets, nose, cheekbones -->
	<ellipse cx="38" cy="58" rx="7.5" ry="8.5" fill="#0a0c10" stroke-width="2.6" />
	<ellipse cx="62" cy="58" rx="7.5" ry="8.5" fill="#0a0c10" stroke-width="2.6" />
	<path d="M50 63 L45.5 73h9z" fill="#0a0c10" stroke-width="2" />
	<path
		d="M33 76c1.5 1.6 4 2.4 6.5 1.7M67 76c-1.5 1.6-4 2.4-6.5 1.7"
		stroke-width="1.4"
		opacity="0.6"
	/>

	<!-- Teeth -->
	<g fill="#fed7aa">
		<path d="M41 74.5v8a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V74.5z" />
		<path d="M48 74.5v8a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V74.5z" />
		<path d="M55 74.5v8a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V74.5z" />
	</g>
	<path
		d="M41 76v6.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V76 M48 76v6.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V76 M55 76v6.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V76"
		stroke="#c2410c"
		stroke-width="1.6"
	/>

	<!-- Tricorn -->
	<path
		d="M14 40c-2-13 6-24 20-28 5-1.5 11-1.5 16 0 5-1.5 11-1.5 16 0 14 4 22 15 20 28-9-5-19-7-32-6-13-1-23 1-32 6z"
		fill="#1a1d26"
		stroke="#fb923c"
		stroke-width="2.4"
	/>
	<path d="M18 38c9-4 18-5.5 32-5s23 1 32 5" stroke="#fb923c" stroke-width="1.6" opacity="0.6" />

	<!-- Crossed bones on the hat -->
	<g stroke="#fed7aa" stroke-width="2.4" fill="#fed7aa">
		<path d="M 40 18 L 60 26" />
		<path d="M 60 18 L 40 26" />
		<circle cx="38.5" cy="17.5" r="1.3" />
		<circle cx="40.5" cy="15.5" r="1.3" />
		<circle cx="59.5" cy="28.5" r="1.3" />
		<circle cx="61.5" cy="26.5" r="1.3" />
		<circle cx="38.5" cy="26.5" r="1.3" />
		<circle cx="40.5" cy="28.5" r="1.3" />
		<circle cx="59.5" cy="15.5" r="1.3" />
		<circle cx="61.5" cy="17.5" r="1.3" />
	</g>

	<!-- Cards fanned in front, played from below -->
	<g transform="rotate(-24, 50, 108)">
		<rect
			x="29"
			y="76"
			width="24"
			height="34"
			rx="3"
			fill="#0a0c10"
			stroke="#fb923c"
			stroke-width="2"
		/>
		<rect
			x="32"
			y="79"
			width="18"
			height="28"
			rx="1.5"
			stroke="#fb923c"
			stroke-width="0.6"
			opacity="0.35"
		/>
	</g>
	<g transform="rotate(24, 50, 108)">
		<rect
			x="47"
			y="76"
			width="24"
			height="34"
			rx="3"
			fill="#0a0c10"
			stroke="#fb923c"
			stroke-width="2"
		/>
		<rect
			x="50"
			y="79"
			width="18"
			height="28"
			rx="1.5"
			stroke="#fb923c"
			stroke-width="0.6"
			opacity="0.35"
		/>
	</g>
</svg>
