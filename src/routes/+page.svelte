<!--
	Home / landing page — built to docs/pirate-landing-v3.html.
	The nautical conceit is a sustained metaphor, not decoration: charting a
	course, the hold, the crew, and a ship's charter ("The Compact").
-->

<script lang="ts">
	import { base } from '$app/paths';
	import JollyRoger from '$lib/components/JollyRoger.svelte';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import * as m from '$lib/paraglide/messages';
</script>

<PageMeta title={m.home_meta_title()} description={m.home_meta_description()} />

<!-- HERO -->
<section
	class="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center"
>
	<!-- Ambient glow -->
	<div class="hero-glow" aria-hidden="true"></div>

	<!-- Compass rose — large, slow, and proud -->
	<div class="compass-container" aria-hidden="true">
		<svg class="compass-rose" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
			<!-- Rings -->
			<circle cx="200" cy="200" r="195" stroke="#f97316" stroke-width="0.8" opacity="0.15" />
			<circle cx="200" cy="200" r="185" stroke="#f97316" stroke-width="0.3" opacity="0.08" />
			<circle cx="200" cy="200" r="150" stroke="#ea580c" stroke-width="0.5" opacity="0.1" />
			<circle cx="200" cy="200" r="100" stroke="#ea580c" stroke-width="0.4" opacity="0.07" />
			<circle cx="200" cy="200" r="50" stroke="#c2410c" stroke-width="0.3" opacity="0.06" />

			<!-- Cardinal axes -->
			<line x1="200" y1="4" x2="200" y2="396" stroke="#f97316" stroke-width="0.6" opacity="0.12" />
			<line x1="4" y1="200" x2="396" y2="200" stroke="#f97316" stroke-width="0.6" opacity="0.12" />

			<!-- Diagonals -->
			<line x1="48" y1="48" x2="352" y2="352" stroke="#ea580c" stroke-width="0.4" opacity="0.07" />
			<line x1="352" y1="48" x2="48" y2="352" stroke="#ea580c" stroke-width="0.4" opacity="0.07" />

			<!-- Subdivisions -->
			<line x1="124" y1="18" x2="276" y2="382" stroke="#c2410c" stroke-width="0.2" opacity="0.04" />
			<line x1="276" y1="18" x2="124" y2="382" stroke="#c2410c" stroke-width="0.2" opacity="0.04" />
			<line x1="18" y1="124" x2="382" y2="276" stroke="#c2410c" stroke-width="0.2" opacity="0.04" />
			<line x1="18" y1="276" x2="382" y2="124" stroke="#c2410c" stroke-width="0.2" opacity="0.04" />

			<!-- North star pointer -->
			<polygon points="200,6 214,120 200,80 186,120" fill="#f97316" opacity="0.2" />
			<polygon points="200,6 206,100 200,75 194,100" fill="#fb923c" opacity="0.12" />
			<polygon points="200,394 214,280 200,320 186,280" fill="#ea580c" opacity="0.08" />
			<polygon points="394,200 280,186 320,200 280,214" fill="#ea580c" opacity="0.08" />
			<polygon points="6,200 120,186 80,200 120,214" fill="#ea580c" opacity="0.08" />

			<!-- Intercardinal pointers -->
			<polygon points="345,55 260,160 280,140 300,160" fill="#c2410c" opacity="0.04" />
			<polygon points="55,55 140,160 120,140 100,160" fill="#c2410c" opacity="0.04" />
			<polygon points="345,345 260,240 280,260 300,240" fill="#c2410c" opacity="0.04" />
			<polygon points="55,345 140,240 120,260 100,240" fill="#c2410c" opacity="0.04" />

			<!-- Tick marks -->
			<g stroke="#f97316" stroke-width="0.8" opacity="0.15">
				<line x1="200" y1="4" x2="200" y2="18" />
				<line x1="200" y1="382" x2="200" y2="396" />
				<line x1="4" y1="200" x2="18" y2="200" />
				<line x1="382" y1="200" x2="396" y2="200" />
			</g>
			<g stroke="#ea580c" stroke-width="0.5" opacity="0.1">
				<line x1="338" y1="56" x2="346" y2="48" />
				<line x1="56" y1="338" x2="48" y2="346" />
				<line x1="338" y1="344" x2="346" y2="352" />
				<line x1="56" y1="56" x2="48" y2="48" />
			</g>

			<!-- Cardinal letters -->
			<text
				x="200"
				y="38"
				text-anchor="middle"
				font-family="Space Mono, monospace"
				font-size="8"
				fill="#fb923c"
				opacity="0.2"
				font-weight="700">N</text
			>
			<text
				x="200"
				y="374"
				text-anchor="middle"
				font-family="Space Mono, monospace"
				font-size="7"
				fill="#f97316"
				opacity="0.1">S</text
			>
			<text
				x="370"
				y="203"
				text-anchor="middle"
				font-family="Space Mono, monospace"
				font-size="7"
				fill="#f97316"
				opacity="0.1">E</text
			>
			<text
				x="30"
				y="203"
				text-anchor="middle"
				font-family="Space Mono, monospace"
				font-size="7"
				fill="#f97316"
				opacity="0.1">W</text
			>

			<!-- Centre -->
			<circle cx="200" cy="200" r="4" fill="#f97316" opacity="0.1" />
			<circle cx="200" cy="200" r="1.5" fill="#fb923c" opacity="0.2" />

			<!-- Degree marks -->
			<g stroke="#f97316" stroke-width="0.3" opacity="0.06">
				<line x1="250" y1="7" x2="248" y2="15" />
				<line x1="300" y1="22" x2="296" y2="30" />
				<line x1="150" y1="7" x2="152" y2="15" />
				<line x1="100" y1="22" x2="104" y2="30" />
				<line x1="393" y1="150" x2="385" y2="152" />
				<line x1="378" y1="100" x2="370" y2="104" />
				<line x1="393" y1="250" x2="385" y2="248" />
				<line x1="378" y1="300" x2="370" y2="296" />
				<line x1="250" y1="393" x2="248" y2="385" />
				<line x1="300" y1="378" x2="296" y2="370" />
				<line x1="150" y1="393" x2="152" y2="385" />
				<line x1="100" y1="378" x2="104" y2="370" />
				<line x1="7" y1="150" x2="15" y2="152" />
				<line x1="22" y1="100" x2="30" y2="104" />
				<line x1="7" y1="250" x2="15" y2="248" />
				<line x1="22" y1="300" x2="30" y2="296" />
			</g>
		</svg>
	</div>

	<!-- Eyebrow pill -->
	<div
		class="fade-up relative mb-8 inline-flex items-center gap-2 rounded-full border border-orange-500/15 bg-orange-500/[0.08] px-4 py-1.5 font-mono text-[0.65rem] tracking-[0.12em] text-orange-400 uppercase"
		style="animation-delay: 0.1s"
	>
		<span class="pulse-dot h-[5px] w-[5px] rounded-full bg-orange-500"></span>
		{m.home_eyebrow()}
	</div>

	<!-- Jolly Roger — tricorn skull over a fanned pair of cards -->
	<div class="jolly-roger fade-up relative mb-6" style="animation-delay: 0.2s" aria-hidden="true">
		<JollyRoger class="w-[90px]" />
	</div>

	<h1
		class="fade-up relative mb-5 text-[clamp(3.2rem,7.5vw,5.5rem)] leading-[1.02] font-black tracking-[-0.035em] text-white"
		style="animation-delay: 0.3s"
	>
		{m.home_hero_title_line1()}<br />
		<span class="bg-gradient-to-br from-orange-400 to-orange-600 bg-clip-text text-transparent"
			>{m.home_hero_title_line2()}</span
		>
	</h1>

	<p
		class="fade-up relative mx-auto max-w-[460px] text-[1.15rem] leading-[1.65] text-slate-400"
		style="animation-delay: 0.4s"
	>
		{m.home_hero_subtitle()}
	</p>

	<div
		class="fade-up relative mt-10 flex flex-wrap justify-center gap-3"
		style="animation-delay: 0.5s"
	>
		<a href="{base}/card-lists" class="btn btn-primary btn-lg">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M3 3v18h18" />
				<path d="m19 9-5 5-4-4-3 3" />
			</svg>
			{m.home_cta_card_lists()}
		</a>
		<a href="{base}/collection" class="btn btn-ghost btn-lg">
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<rect x="3" y="3" width="18" height="18" rx="2" />
				<path d="M3 9h18" />
			</svg>
			{m.home_cta_collection()}
		</a>
	</div>
</section>

<!-- PRINCIPLES -->
<div
	class="fade-up relative flex flex-wrap justify-center gap-x-8 gap-y-3 px-4 pb-16 font-mono text-[0.68rem] tracking-[0.06em] text-slate-400 uppercase"
	style="animation-delay: 0.6s"
>
	<div class="flex items-center gap-2">
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="shrink-0 text-orange-600"
			aria-hidden="true"
		>
			<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
		</svg>
		{m.home_principle_local_first()}
	</div>
	<div class="flex items-center gap-2">
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="shrink-0 text-orange-600"
			aria-hidden="true"
		>
			<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
		{m.home_principle_zero_tracking()}
	</div>
	<div class="flex items-center gap-2">
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="shrink-0 text-orange-600"
			aria-hidden="true"
		>
			<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
			<polyline points="14 2 14 8 20 8" />
		</svg>
		{m.home_principle_open_format()}
	</div>
	<div class="flex items-center gap-2">
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			class="shrink-0 text-orange-600"
			aria-hidden="true"
		>
			<rect x="3" y="11" width="18" height="11" rx="2" />
			<path d="M7 11V7a5 5 0 0110 0v4" />
		</svg>
		{m.home_principle_no_account()}
	</div>
</div>

<!-- ROPE DIVIDER -->
<div class="rope-divider mx-auto mb-16 max-w-[600px] px-4">
	<div class="rope-line"></div>
	<div class="rope-knot"></div>
	<div class="rope-line"></div>
</div>

<!-- FEATURES -->
<section class="mx-auto max-w-[1100px] px-4 pb-20">
	<div class="grid gap-6 md:grid-cols-3">
		<div class="surface-card surface-card-hover corner-bracket overflow-hidden p-8">
			<div
				class="mb-6 flex h-13 w-13 items-center justify-center rounded-xl border border-orange-500/[0.12] bg-orange-500/10 text-orange-400"
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<rect x="2" y="4" width="8" height="10" rx="1.5" />
					<rect x="6" y="2" width="8" height="10" rx="1.5" opacity="0.5" />
					<rect x="10" y="6" width="8" height="10" rx="1.5" opacity="0.3" />
					<path d="M14 20h6M17 17v6" />
				</svg>
			</div>
			<h3 class="mb-2 text-[1.15rem] font-bold tracking-tight text-orange-100">
				{m.home_feature_lists_title()}
			</h3>
			<p class="text-[0.9rem] leading-[1.7] text-slate-400">
				{m.home_feature_lists_body()}
			</p>
		</div>

		<div class="surface-card surface-card-hover corner-bracket overflow-hidden p-8">
			<div
				class="mb-6 flex h-13 w-13 items-center justify-center rounded-xl border border-orange-500/[0.12] bg-orange-500/10 text-orange-400"
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<rect x="3" y="3" width="18" height="18" rx="3" />
					<path d="M3 9h18" />
					<path d="M9 9v12" />
					<circle cx="6" cy="14" r="1" fill="currentColor" />
					<circle cx="6" cy="18" r="1" fill="currentColor" />
				</svg>
			</div>
			<h3 class="mb-2 text-[1.15rem] font-bold tracking-tight text-orange-100">
				{m.home_feature_hoard_title()}
			</h3>
			<p class="text-[0.9rem] leading-[1.7] text-slate-400">
				{m.home_feature_hoard_body()}
			</p>
		</div>

		<div class="surface-card surface-card-hover corner-bracket overflow-hidden p-8">
			<div
				class="mb-6 flex h-13 w-13 items-center justify-center rounded-xl border border-orange-500/[0.12] bg-orange-500/10 text-orange-400"
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
					<polyline points="17 8 12 3 7 8" />
					<line x1="12" y1="3" x2="12" y2="15" />
				</svg>
			</div>
			<h3 class="mb-2 text-[1.15rem] font-bold tracking-tight text-orange-100">
				{m.home_feature_portability_title()}
			</h3>
			<p class="text-[0.9rem] leading-[1.7] text-slate-400">
				{m.home_feature_portability_body()}
			</p>
		</div>
	</div>
</section>

<!-- ROPE DIVIDER -->
<div class="rope-divider mx-auto mb-16 max-w-[600px] px-4">
	<div class="rope-line"></div>
	<div class="rope-knot"></div>
	<div class="rope-line"></div>
</div>

<!-- GETTING STARTED — charted as a route -->
<section class="mx-auto max-w-[1100px] px-4 pb-24">
	<div class="mb-12 text-center">
		<div class="eyebrow mb-2 flex items-center justify-center gap-3">
			<svg
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="opacity-60"
				aria-hidden="true"
			>
				<polygon points="3 11 22 2 13 21 11 13 3 11" />
			</svg>
			{m.home_start_eyebrow()}
		</div>
		<h2 class="text-[2.2rem] font-extrabold tracking-tight text-white">{m.home_start_title()}</h2>
	</div>

	<div class="route grid grid-cols-2 gap-6 lg:grid-cols-4">
		<div class="waypoint text-center">
			<div class="waypoint-marker">
				<span class="waypoint-num">1</span>
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<path d="M12 8v8" />
					<path d="M8 12h8" />
				</svg>
			</div>
			<h4 class="mb-1.5 text-[0.95rem] font-bold tracking-tight text-orange-100">
				{m.home_step1_title()}
			</h4>
			<p class="mx-auto max-w-[200px] text-[0.82rem] leading-[1.6] text-slate-400">
				{m.home_step1_body()}
			</p>
		</div>

		<div class="waypoint text-center">
			<div class="waypoint-marker">
				<span class="waypoint-num">2</span>
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
			</div>
			<h4 class="mb-1.5 text-[0.95rem] font-bold tracking-tight text-orange-100">
				{m.home_step2_title()}
			</h4>
			<p class="mx-auto max-w-[200px] text-[0.82rem] leading-[1.6] text-slate-400">
				{m.home_step2_body()}
			</p>
		</div>

		<div class="waypoint text-center">
			<div class="waypoint-marker">
				<span class="waypoint-num">3</span>
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
					<polyline points="22 4 12 14.01 9 11.01" />
				</svg>
			</div>
			<h4 class="mb-1.5 text-[0.95rem] font-bold tracking-tight text-orange-100">
				{m.home_step3_title()}
			</h4>
			<p class="mx-auto max-w-[200px] text-[0.82rem] leading-[1.6] text-slate-400">
				{m.home_step3_body()}
			</p>
		</div>

		<div class="waypoint text-center">
			<div class="waypoint-marker">
				<span class="waypoint-num">4</span>
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"
				>
					<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
					<polyline points="16 6 12 2 8 6" />
					<line x1="12" y1="2" x2="12" y2="15" />
				</svg>
			</div>
			<h4 class="mb-1.5 text-[0.95rem] font-bold tracking-tight text-orange-100">
				{m.home_step4_title()}
			</h4>
			<p class="mx-auto max-w-[200px] text-[0.82rem] leading-[1.6] text-slate-400">
				{m.home_step4_body()}
			</p>
		</div>
	</div>
</section>

<!-- THE COMPACT — the manifesto, framed as a ship's charter -->
<section class="mx-auto max-w-[700px] px-4 pb-20">
	<div class="compact-card">
		<!-- Jolly Roger -->
		<svg
			class="mx-auto mb-6 block h-16 w-16 opacity-15"
			viewBox="0 0 100 100"
			fill="none"
			stroke="#f97316"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<g opacity="0.5">
				<path d="M50 2C32 2 20 15 20 30c0 10 5 18 12 23v7h36v-7c7-5 12-13 12-23C80 15 68 2 50 2z" />
				<circle cx="39" cy="28" r="5.5" fill="#f97316" />
				<circle cx="61" cy="28" r="5.5" fill="#f97316" />
				<path d="M50 40v3" />
				<path d="M36 49h28" />
				<line x1="42" y1="49" x2="42" y2="60" />
				<line x1="50" y1="49" x2="50" y2="60" />
				<line x1="58" y1="49" x2="58" y2="60" />
			</g>
			<g transform="rotate(-20, 50, 88)">
				<rect x="32" y="48" width="28" height="40" rx="3" fill="#0f1218" stroke-width="2" />
				<rect x="35" y="51" width="22" height="34" rx="1.5" stroke-width="0.7" opacity="0.4" />
				<circle cx="39" cy="55.5" r="2" stroke-width="0.8" opacity="0.5" />
			</g>
			<g transform="rotate(20, 50, 88)">
				<rect x="40" y="48" width="28" height="40" rx="3" fill="#0f1218" stroke-width="2" />
				<rect x="43" y="51" width="22" height="34" rx="1.5" stroke-width="0.7" opacity="0.4" />
				<circle cx="47" cy="55.5" r="2" stroke-width="0.8" opacity="0.5" />
			</g>
		</svg>

		<div class="compact-label">{m.home_compact_label()}</div>

		<blockquote class="mb-8 text-[1.1rem] leading-[1.75] text-slate-300">
			{m.home_compact_lead()}
			<strong class="font-semibold text-orange-300">{m.home_compact_lead_strong()}</strong>
		</blockquote>

		<div
			class="mx-auto flex max-w-[420px] flex-col gap-3 border-t border-orange-500/[0.08] pt-6 text-left"
		>
			<div class="flex items-start gap-3 text-[0.85rem] leading-[1.5] text-slate-400">
				<span class="mt-0.5 shrink-0 font-mono text-[0.6rem] font-bold text-orange-500 opacity-70"
					>I.</span
				>
				<span
					><strong class="font-semibold text-orange-200">{m.home_article_1_title()}</strong>
					{m.home_article_1_body()}</span
				>
			</div>
			<div class="flex items-start gap-3 text-[0.85rem] leading-[1.5] text-slate-400">
				<span class="mt-0.5 shrink-0 font-mono text-[0.6rem] font-bold text-orange-500 opacity-70"
					>II.</span
				>
				<span
					><strong class="font-semibold text-orange-200">{m.home_article_2_title()}</strong>
					{m.home_article_2_body()}</span
				>
			</div>
			<div class="flex items-start gap-3 text-[0.85rem] leading-[1.5] text-slate-400">
				<span class="mt-0.5 shrink-0 font-mono text-[0.6rem] font-bold text-orange-500 opacity-70"
					>III.</span
				>
				<span
					><strong class="font-semibold text-orange-200">{m.home_article_3_title()}</strong>
					{m.home_article_3_body()}</span
				>
			</div>
			<div class="flex items-start gap-3 text-[0.85rem] leading-[1.5] text-slate-400">
				<span class="mt-0.5 shrink-0 font-mono text-[0.6rem] font-bold text-orange-500 opacity-70"
					>IV.</span
				>
				<span
					><strong class="font-semibold text-orange-200">{m.home_article_4_title()}</strong>
					{m.home_article_4_body()}</span
				>
			</div>
		</div>
	</div>
</section>

<style>
	/* Ambient hero glow */
	.hero-glow {
		position: absolute;
		top: -120px;
		left: 50%;
		width: min(1000px, 140vw);
		height: 700px;
		transform: translateX(-50%);
		pointer-events: none;
		background: radial-gradient(ellipse at 50% 30%, rgba(249, 115, 22, 0.12) 0%, transparent 55%),
			radial-gradient(ellipse at 30% 70%, rgba(234, 88, 12, 0.05) 0%, transparent 40%),
			radial-gradient(ellipse at 70% 70%, rgba(194, 65, 12, 0.05) 0%, transparent 40%);
	}

	/* Compass rose — one full rotation every 200 seconds */
	.compass-container {
		position: absolute;
		top: 50%;
		left: 50%;
		width: min(650px, 130vw);
		height: min(650px, 130vw);
		transform: translate(-50%, -50%);
		pointer-events: none;
	}

	.compass-rose {
		width: 100%;
		height: 100%;
		animation: compassSpin 200s linear infinite;
	}

	.jolly-roger {
		opacity: 0.85;
		filter: drop-shadow(0 0 30px rgba(249, 115, 22, 0.2));
	}

	.pulse-dot {
		animation: pulseDot 2s ease-in-out infinite;
	}

	/* Waypoints, strung along a dashed route line */
	.route {
		position: relative;
	}

	.route::before {
		content: '';
		position: absolute;
		top: 26px;
		left: 60px;
		right: 60px;
		height: 2px;
		background: repeating-linear-gradient(
			90deg,
			rgba(249, 115, 22, 0.2) 0px,
			rgba(249, 115, 22, 0.2) 6px,
			transparent 6px,
			transparent 12px
		);
	}

	@media (max-width: 1023px) {
		.route::before {
			display: none;
		}
	}

	.waypoint {
		position: relative;
		z-index: 1;
	}

	.waypoint-marker {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: 52px;
		margin: 0 auto 1.25rem;
		border: 2px solid var(--color-orange-500);
		border-radius: 50%;
		background: var(--color-slate-900);
		color: var(--color-orange-400);
		transition: all 0.3s ease;
	}

	.waypoint:hover .waypoint-marker {
		background: rgba(249, 115, 22, 0.1);
		box-shadow:
			0 0 20px rgba(249, 115, 22, 0.2),
			0 0 40px rgba(249, 115, 22, 0.05);
		transform: scale(1.08);
	}

	.waypoint-num {
		position: absolute;
		top: -6px;
		right: -6px;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-orange-500);
		color: var(--color-slate-950);
		font-family: var(--font-mono);
		font-size: 0.55rem;
		font-weight: 700;
	}

	/* The Compact — a charter document, corners and all */
	.compact-card {
		position: relative;
		padding: 3.5rem 3rem;
		border: 1px solid rgba(249, 115, 22, 0.12);
		border-radius: 20px;
		background: linear-gradient(160deg, rgba(249, 115, 22, 0.06) 0%, rgba(15, 18, 24, 0.9) 50%);
		text-align: center;
		overflow: hidden;
	}

	@media (max-width: 640px) {
		.compact-card {
			padding: 2.5rem 1.5rem;
		}
	}

	.compact-card::before,
	.compact-card::after {
		content: '';
		position: absolute;
		width: 40px;
		height: 40px;
	}

	.compact-card::before {
		top: 12px;
		left: 12px;
		border-top: 2px solid rgba(249, 115, 22, 0.2);
		border-left: 2px solid rgba(249, 115, 22, 0.2);
		border-radius: 4px 0 0 0;
	}

	.compact-card::after {
		right: 12px;
		bottom: 12px;
		border-right: 2px solid rgba(249, 115, 22, 0.2);
		border-bottom: 2px solid rgba(249, 115, 22, 0.2);
		border-radius: 0 0 4px 0;
	}

	.compact-label {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		font-family: var(--font-mono);
		font-size: 0.6rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--color-orange-500);
	}

	.compact-label::before,
	.compact-label::after {
		content: '';
		width: 24px;
		height: 1px;
		background: var(--color-orange-600);
		opacity: 0.4;
	}

	@media (prefers-reduced-motion: reduce) {
		.compass-rose,
		.pulse-dot {
			animation: none;
		}
	}
</style>
