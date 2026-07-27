<script lang="ts">
	let {
		show = $bindable(false),
		fileName,
		onmerge,
		onignore
	} = $props<{
		show: boolean;
		fileName: string;
		onmerge: () => void;
		onignore: () => void;
	}>();
</script>

{#if show}
	<div class="animate-slide-in fixed top-4 right-4 z-[9999]">
		<div
			class="w-80 rounded-xl border border-amber-600/40 bg-slate-900 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
		>
			<p class="mb-3 text-sm text-slate-200">
				<span class="font-semibold text-amber-400">"{fileName}"</span> was modified outside the app.
			</p>
			<div class="flex gap-2">
				<button
					onclick={onmerge}
					class="btn btn-sm flex-1 bg-amber-600 text-white hover:bg-amber-500"
				>
					Merge
				</button>
				<button onclick={onignore} class="btn btn-quiet btn-sm flex-1"> Ignore </button>
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
