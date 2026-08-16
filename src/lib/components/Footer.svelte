<script lang="ts">
	import { base } from '$app/paths';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import * as m from '$lib/paraglide/messages';
</script>

<footer class="mt-12 border-t border-orange-500/[0.06] px-4 py-8">
	<div class="mx-auto w-full max-w-screen-xl">
		<div
			class="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-center md:justify-between"
		>
			<div class="flex items-center gap-3">
				<!-- Jolly Roger — skull playing cards -->
				<svg
					class="h-8 w-8 shrink-0 text-orange-500 opacity-25"
					viewBox="0 0 100 100"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<g opacity="0.6">
						<path
							d="M50 2C32 2 20 15 20 30c0 10 5 18 12 23v7h36v-7c7-5 12-13 12-23C80 15 68 2 50 2z"
						/>
						<circle cx="39" cy="28" r="5" fill="currentColor" />
						<circle cx="61" cy="28" r="5" fill="currentColor" />
						<path d="M50 40v3" />
						<path d="M36 49h28" />
					</g>
					<g transform="rotate(-18, 50, 85)">
						<rect x="34" y="48" width="26" height="38" rx="3" fill="#0a0c10" stroke-width="1.5" />
					</g>
					<g transform="rotate(18, 50, 85)">
						<rect x="40" y="48" width="26" height="38" rx="3" fill="#0a0c10" stroke-width="1.5" />
					</g>
				</svg>
				<p class="font-mono text-[0.62rem] tracking-wider text-slate-400 uppercase">
					{m.footer_credit({ year: new Date().getFullYear() })}
				</p>
			</div>

			<div class="flex flex-col items-center gap-y-2 md:items-end">
				<ul class="flex flex-wrap items-center gap-x-6 gap-y-2">
					<li>
						<a
							href="{base}/diagnostics/"
							class="text-sm text-slate-400 transition-colors hover:text-orange-300"
							>{m.footer_diagnostics()}</a
						>
					</li>
					<li>
						<a
							href="https://github.com/Lordmzn/LMdecktools"
							class="text-sm text-slate-400 transition-colors hover:text-orange-300"
							target="_blank"
							rel="noopener noreferrer">GitHub</a
						>
					</li>
					<li>
						<a
							href="https://github.com/Lordmzn/LMdecktools/issues"
							class="text-sm text-slate-400 transition-colors hover:text-orange-300"
							target="_blank"
							rel="noopener noreferrer">{m.footer_contribute()}</a
						>
					</li>
					<li>
						<LanguageSwitcher />
					</li>
				</ul>
				<div class="flex flex-wrap items-center gap-x-1.5 text-sm text-slate-400">
					<svg
						class="h-4 w-4 text-orange-500"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
						/>
					</svg>
					<span>{m.footer_support()}</span>
					<a
						href="https://github.com/sponsors/Lordmzn"
						class="transition-colors hover:text-orange-300"
						target="_blank"
						rel="noopener noreferrer">GitHub Sponsors</a
					>
					<span class="text-slate-600">&middot;</span>
					<a
						href="https://ko-fi.com/lordmzn"
						class="transition-colors hover:text-orange-300"
						target="_blank"
						rel="noopener noreferrer">Ko-fi</a
					>
				</div>
			</div>
		</div>

		<div class="rope-divider my-6">
			<div class="rope-line"></div>
			<div class="rope-knot"></div>
			<div class="rope-line"></div>
		</div>

		<div class="space-y-2 text-xs leading-relaxed text-slate-400">
			<p>
				{m.footer_wotc_disclaimer()}
			</p>
			<p>
				{m.footer_scryfall_prefix()}
				<a
					href="https://scryfall.com"
					class="text-orange-400/80 underline decoration-orange-500/30 underline-offset-2 hover:text-orange-300"
					target="_blank"
					rel="noopener noreferrer">Scryfall</a
				>{m.footer_scryfall_middle()}
				<a
					href="https://scryfall.com/docs/api"
					class="text-orange-400/80 underline decoration-orange-500/30 underline-offset-2 hover:text-orange-300"
					target="_blank"
					rel="noopener noreferrer">{m.footer_scryfall_api_terms()}</a
				>.
			</p>
			<p>
				{m.footer_privacy()}
			</p>
			<p>
				{m.footer_license_prefix()}
				<a
					href="https://github.com/Lordmzn/LMdecktools/blob/master/LICENSE"
					class="text-orange-400/80 underline decoration-orange-500/30 underline-offset-2 hover:text-orange-300"
					target="_blank"
					rel="noopener noreferrer">{m.footer_license_link()}</a
				>.
			</p>
		</div>
	</div>
</footer>
