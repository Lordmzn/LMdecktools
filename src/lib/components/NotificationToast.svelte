<script lang="ts">
	let { show = $bindable(false), message } = $props();
</script>

{#if show}
	<div class="animate-slide-in fixed top-4 right-4 z-[9999]">
		<div class="flex items-center gap-2 rounded-lg bg-orange-700 px-6 py-3 text-white shadow-lg">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M20 6 9 17l-5-5" />
			</svg>
			{message}
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
