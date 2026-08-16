<!--
	Branded error page (#25). On the deployed static host this is what the
	`fallback: '404.html'` shell renders once the client router fails to match
	an unknown URL, so it is the public face of every mistyped address.

	It also catches runtime errors, hence the two-branch copy: a 404 is the
	visitor's address being wrong, anything else is ours.
-->
<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import PageMeta from '$lib/components/PageMeta.svelte';
	import * as m from '$lib/paraglide/messages';

	let notFound = $derived($page.status === 404);
</script>

<PageMeta title={m.error_meta_title()} description={m.error_meta_description()} />

<section
	class="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 py-20"
>
	<div class="surface-card w-full p-8 text-center">
		<div class="eyebrow mb-2">{m.error_eyebrow()}</div>
		<p class="font-mono text-sm tracking-wider text-slate-500">
			{m.error_status({ status: $page.status })}
		</p>

		<h1 class="mt-3 text-3xl font-extrabold tracking-tight text-white">
			{notFound ? m.error_not_found_title() : m.error_generic_title()}
		</h1>
		<p class="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-400">
			{notFound ? m.error_not_found_body() : m.error_generic_body()}
		</p>

		<div class="mt-8 flex flex-wrap items-center justify-center gap-3">
			<a href="{base}/" class="btn btn-primary">{m.error_cta_home()}</a>
			{#if !notFound}
				<a href="{base}/diagnostics" class="btn btn-ghost">{m.error_cta_diagnostics()}</a>
			{/if}
		</div>
	</div>
</section>
