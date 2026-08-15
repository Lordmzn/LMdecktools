<!--
	The small brand mark: tricorn-hatted skull over crossed bones.

	Traced from `static/brand-mark.svg`, which is byte-identical to the design
	system's `assets/logo/mark.svg`. Inlined rather than `<img src>`-ed so the
	art participates in the page (no extra request, no flash before paint).

	This component is the single source of the mark — #66 happened because the
	same SVG was hand-copied into three files and only one of them was updated.
	Change the art here (and in `static/`), never at a call site.
-->
<script lang="ts">
	let { class: className = 'h-7 w-7' }: { class?: string } = $props();
</script>

<svg
	class={className}
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
