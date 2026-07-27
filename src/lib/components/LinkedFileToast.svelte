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
		<div class="w-80 rounded-lg border border-amber-700 bg-slate-800 p-4 shadow-lg">
			<p class="mb-3 text-sm text-slate-200">
				<span class="font-semibold text-amber-400">"{fileName}"</span> was modified outside the app.
			</p>
			<div class="flex gap-2">
				<button
					onclick={onmerge}
					class="flex-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-slate-100 transition-colors hover:bg-amber-700"
				>
					Merge
				</button>
				<button
					onclick={onignore}
					class="flex-1 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-600"
				>
					Ignore
				</button>
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
