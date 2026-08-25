<script lang="ts">
	import { store } from '$lib/store.svelte';
	import * as m from '$lib/paraglide/messages';

	let { onclick }: { onclick: () => void } = $props();
</script>

{#if store.copyCount > 0}
	<button
		{onclick}
		class="inline-flex min-h-11 shrink-0 items-center rounded-lg px-2.5 py-1.5 text-[0.78rem] font-medium tracking-tight transition-colors sm:min-h-0
			{store.copyCount <= 1
			? 'border-warning-edge bg-warning-surface text-warning border'
			: 'border border-orange-500/[0.08] text-slate-400 hover:border-orange-500/20 hover:text-orange-300'}"
		title={m.header_db_button_title()}
		data-testid="copy-counter"
	>
		{store.copyCount === 1
			? m.db_copies_count_one({ count: store.copyCount })
			: m.db_copies_count_other({ count: store.copyCount })}
	</button>
{/if}
