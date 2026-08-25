<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let {
		show = $bindable(false),
		onsave,
		ondismiss
	} = $props<{
		show: boolean;
		onsave: () => void;
		ondismiss: () => void;
	}>();
</script>

{#if show}
	<div class="animate-slide-in fixed top-4 right-4 z-[9999]">
		<div
			class="border-warning-solid/40 w-80 rounded-xl border bg-slate-900 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
		>
			<p class="mb-3 text-sm text-slate-200">
				<span class="text-warning font-semibold">{m.db_copies_first_run_title()}</span>
				{m.db_copies_first_run_body()}
			</p>
			<div class="flex gap-2">
				<button
					onclick={onsave}
					class="btn btn-sm bg-warning-solid hover:bg-warning flex-1 text-slate-950"
				>
					{m.db_copies_first_run_save()}
				</button>
				<button onclick={ondismiss} class="btn btn-quiet btn-sm flex-1"
					>{m.db_copies_first_run_dismiss()}</button
				>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-in {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	.animate-slide-in {
		animation: slide-in 0.3s ease-out;
	}
</style>
