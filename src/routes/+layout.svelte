<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import LinkedFileToast from '$lib/components/LinkedFileToast.svelte';
	import { i18n } from '$lib/i18n';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import { store, mergeFromFile, tryAutoLoadDB, logAppError } from '$lib/store.svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let showLinkedFileToast = $state(false);

	onMount(() => {
		tryAutoLoadDB();

		// SvelteKit's handleError hook never sees rejected promises that nothing
		// awaits, and those are exactly the ones that vanish silently (#30).
		const onRejection = (event: PromiseRejectionEvent) => {
			logAppError('unhandled', event.reason, {
				source: 'unhandledrejection',
				pathname: location.pathname
			});
		};
		window.addEventListener('unhandledrejection', onRejection);
		return () => window.removeEventListener('unhandledrejection', onRejection);
	});

	$effect(() => {
		if (store.linkedFileExternalChange) {
			showLinkedFileToast = true;
		}
	});

	function handleMerge() {
		mergeFromFile();
		showLinkedFileToast = false;
	}

	function handleIgnore() {
		store.linkedFileExternalChange = false;
		showLinkedFileToast = false;
	}
</script>

<ParaglideJS {i18n}>
	<!-- z-2 lifts all content above the fixed film-grain layer painted on body::after -->
	<div class="relative z-[2] flex min-h-screen flex-col text-slate-100">
		<Header />

		<main class="flex-1">
			{@render children()}
		</main>

		<Footer />
	</div>

	<LinkedFileToast
		bind:show={showLinkedFileToast}
		fileName={store.linkedFileName ?? ''}
		onmerge={handleMerge}
		onignore={handleIgnore}
	/>
</ParaglideJS>
