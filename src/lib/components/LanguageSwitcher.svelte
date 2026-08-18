<!--
	EN/IT switch. `hreflang` is what tells ParaglideJS which locale to rewrite each
	href into, and `data-sveltekit-reload` forces a full navigation — a client-side
	one would keep the language already loaded and the page would not change.
-->
<script lang="ts">
	import { page } from '$app/stores';
	import { i18n } from '$lib/i18n';
	import * as m from '$lib/paraglide/messages';
	import { availableLanguageTags, languageTag } from '$lib/paraglide/runtime';

	/** Short labels — a language names itself in its own tongue, not the reader's. */
	const LABELS: Record<string, string> = { en: 'English', 'it-it': 'Italiano' };
	const SHORT: Record<string, string> = { en: 'EN', 'it-it': 'IT' };

	// The locale-free path, so each link can be rewritten into its own locale.
	let canonicalPath = $derived(i18n.route($page.url.pathname));
</script>

<nav class="flex items-center gap-1.5 text-sm" aria-label={m.footer_language()}>
	{#each availableLanguageTags as tag, i (tag)}
		{#if i > 0}
			<span class="text-slate-600" aria-hidden="true">·</span>
		{/if}
		<a
			href={canonicalPath}
			hreflang={tag}
			data-sveltekit-reload
			aria-label={LABELS[tag]}
			aria-current={tag === languageTag() ? 'true' : undefined}
			class="tap-target font-mono text-xs tracking-wider uppercase transition-colors {tag ===
			languageTag()
				? 'text-orange-300'
				: 'text-slate-400 hover:text-orange-300'}"
		>
			{SHORT[tag] ?? tag}
		</a>
	{/each}
</nav>
