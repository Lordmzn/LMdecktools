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
		<div class="w-80 rounded-lg border border-amber-700 bg-neutral-800 p-4 shadow-lg">
			<p class="mb-3 text-sm text-neutral-200">
				<span class="font-semibold text-amber-400">"{fileName}"</span> was modified outside the app.
			</p>
			<div class="flex gap-2">
				<button
					onclick={onmerge}
					class="flex-1 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
				>
					Merge
				</button>
				<button
					onclick={onignore}
					class="flex-1 rounded-lg bg-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-600"
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
