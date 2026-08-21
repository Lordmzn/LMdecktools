<script lang="ts">
	/**
	 * The install wall's instruction sheet (#87).
	 *
	 * Two things here are load-bearing rather than decorative. **Add the icon
	 * once** — a second Home Screen icon for the same site is a third container
	 * that cannot see the first, so a well-meaning re-install reads as data loss.
	 * And **open it from the icon, not the browser** — the tab the user is reading
	 * this in will still be there tomorrow, still empty, still a different app.
	 *
	 * The Safari-first note appears for third-party iOS browsers, which are not
	 * known to offer Add to Home Screen at all (Q6, measured in #94).
	 */
	import * as m from '$lib/paraglide/messages';
	import { needsSafariFirst } from '$lib/install-context';

	let { show = $bindable(false) } = $props<{ show?: boolean }>();

	const safariFirst = needsSafariFirst();

	const steps = [
		m.install_sheet_step_share(),
		m.install_sheet_step_add(),
		m.install_sheet_step_open()
	];

	function close() {
		show = false;
	}
</script>

{#if show}
	<div
		class="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-black/50 py-4 backdrop-blur-sm sm:items-center"
		role="button"
		tabindex="0"
		onclick={(e) => e.target === e.currentTarget && close()}
		onkeydown={(e) => {
			if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
				e.preventDefault();
				close();
			}
		}}
	>
		<div
			class="panel mx-4 flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl shadow-2xl"
		>
			<div
				class="flex shrink-0 items-start justify-between gap-3 border-b border-orange-500/[0.12] bg-gradient-to-br from-orange-500/[0.12] to-transparent px-5 py-4"
			>
				<h2 class="text-lg font-extrabold tracking-tight text-white sm:text-xl">
					{m.install_sheet_title()}
				</h2>
				<button
					onclick={close}
					class="-mt-1 -mr-1 flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:text-orange-300"
					aria-label={m.common_close()}
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						></path>
					</svg>
				</button>
			</div>

			<div class="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm text-slate-300">
				<p>{m.install_sheet_why()}</p>

				{#if safariFirst}
					<div class="bg-warning-surface border-warning-edge rounded-xl border p-3">
						<p class="text-warning font-semibold">{m.install_sheet_safari_first_title()}</p>
						<p class="mt-1 text-slate-300">{m.install_sheet_safari_first_body()}</p>
					</div>
				{/if}

				<div>
					<h3 class="mb-2 font-semibold text-white">{m.install_sheet_steps_title()}</h3>
					<ol class="space-y-2">
						{#each steps as step, i (step)}
							<li class="flex gap-3">
								<span
									class="bg-warning-solid flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold text-slate-950"
									>{i + 1}</span
								>
								<span class="pt-0.5">{step}</span>
							</li>
						{/each}
					</ol>
				</div>

				<div class="rounded-xl border border-orange-500/[0.15] bg-orange-500/[0.06] p-3">
					<p class="font-semibold text-orange-300">{m.install_sheet_once_title()}</p>
					<p class="mt-1">{m.install_sheet_once_body()}</p>
				</div>

				<p class="text-xs text-slate-500">{m.install_sheet_preview_note()}</p>
			</div>

			<div class="shrink-0 border-t border-orange-500/[0.08] px-5 py-3">
				<button onclick={close} class="btn btn-quiet btn-sm w-full">{m.common_close()}</button>
			</div>
		</div>
	</div>
{/if}
