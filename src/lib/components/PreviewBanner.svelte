<script lang="ts">
	/**
	 * The preview-mode banner (#87) — persistent, non-dismissible, warning lane.
	 *
	 * It is not a nag that can be closed: in preview mode nothing the user does is
	 * being saved, and a dismissed banner would leave them typing a collection
	 * into memory believing otherwise. It stays until the app is installed, which
	 * is a different container and so a different app.
	 */
	import * as m from '$lib/paraglide/messages';
	import InstallSheet from '$lib/components/InstallSheet.svelte';

	let showSheet = $state(false);
</script>

<div
	class="bg-warning-surface border-warning-edge sticky top-0 z-40 flex items-center justify-between gap-3 border-b px-4 py-2 sm:px-6"
	role="status"
>
	<p class="text-warning flex min-w-0 items-center gap-2 text-xs font-semibold sm:text-sm">
		<svg
			class="h-4 w-4 shrink-0"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
			></path>
		</svg>
		<span class="truncate">{m.install_banner_text()}</span>
	</p>

	<button
		onclick={() => (showSheet = true)}
		class="btn btn-sm bg-warning-solid hover:bg-warning min-h-11 shrink-0 text-slate-950"
		data-testid="preview-install-cta"
	>
		{m.install_banner_cta()}
	</button>
</div>

<InstallSheet bind:show={showSheet} />
