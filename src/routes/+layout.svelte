<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import LinkedFileToast from '$lib/components/LinkedFileToast.svelte';
	import MergePreviewModal from '$lib/components/MergePreviewModal.svelte';
	import PreviewBanner from '$lib/components/PreviewBanner.svelte';
	import FirstRunCopyNudge from '$lib/components/FirstRunCopyNudge.svelte';
	import { i18n } from '$lib/i18n';
	import { ParaglideJS } from '@inlang/paraglide-sveltekit';
	import {
		store,
		mergeFromFile,
		previewMergeFromFile,
		downloadBackupCopy,
		startSession,
		logAppError
	} from '$lib/store.svelte';
	import type { MergePreview } from '$lib/store.svelte';
	import { startServiceWorker } from '$lib/service-worker-client';
	import * as m from '$lib/paraglide/messages';
	import { page } from '$app/stores';
	import { languageTag } from '$lib/paraglide/runtime';
	import { absoluteUrl } from '$lib/site';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	/**
	 * Site-wide `<head>` tags (#25). Per-page title and description come from
	 * `PageMeta.svelte` instead — only what is identical on every page lives here.
	 *
	 * `$page.url` is absolute and correct at prerender time because
	 * `kit.prerender.origin` is set; without it these would all name
	 * `http://sveltekit-prerender`.
	 */
	const OG_LOCALES: Record<string, string> = { en: 'en_US', 'it-it': 'it_IT' };

	// Built from the BASE_PATH constant rather than `base` from $app/paths:
	// scrapers need an absolute URL, and $app/paths' value is not one.
	const ogImage = absoluteUrl('/og-image.jpg');

	let canonical = $derived($page.url.href);
	let ogLocale = $derived(OG_LOCALES[languageTag()] ?? 'en_US');
	let ogLocaleAlternates = $derived(
		Object.entries(OG_LOCALES)
			.filter(([tag]) => tag !== languageTag())
			.map(([, locale]) => locale)
	);

	let showLinkedFileToast = $state(false);
	let showMergePreview = $state(false);
	let mergePreview = $state<MergePreview | null>(null);
	let mergePreviewLoading = $state(false);
	let mergePreviewError = $state<string | null>(null);

	/**
	 * The first-run gate (#90, D1): nudge once, after the first meaningful
	 * import, if only one copy exists. `firstRunNudgeShown` is plain in-memory
	 * state — never persisted — so a fresh page load naturally starts
	 * un-dismissed, which is what "dismissible per session, never permanently
	 * silenced" means without needing a storage-backed flag.
	 */
	let showFirstRunNudge = $state(false);
	let firstRunNudgeShown = $state(false);

	onMount(() => {
		// Decides preview vs. full app before anything can open IndexedDB (#87).
		startSession().catch((e) => logAppError('indexeddb', e, { operation: 'startSession' }));

		// Registers the app shell worker and asks it to re-cache (#89). Deliberately
		// not awaited and not gated on the install context: installability is what
		// takes the app out of WebKit's 7-day deletion window, so the tab that has
		// not installed yet is exactly the one that needs the manifest honoured.
		startServiceWorker().catch((e) =>
			logAppError('unhandled', e, { operation: 'startServiceWorker' })
		);

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

	// "A decklist, 50 cards" (D1) — a step, not a settings page, so it fires once
	// and only while there is genuinely one copy on record.
	$effect(() => {
		if (
			!firstRunNudgeShown &&
			!store.previewMode &&
			store.uniqueOwnedCards >= 50 &&
			store.copyCount <= 1
		) {
			firstRunNudgeShown = true;
			showFirstRunNudge = true;
		}
	});

	async function handleSaveCopy() {
		showFirstRunNudge = false;
		try {
			await downloadBackupCopy();
		} catch (e) {
			logAppError('indexeddb', e, { operation: 'downloadBackupCopy' });
		}
	}

	function handleDismissNudge() {
		showFirstRunNudge = false;
	}

	/**
	 * The toast's Merge does not merge — it opens the preview, and the merge is
	 * only committed from there (#77).
	 */
	async function handleMerge() {
		showLinkedFileToast = false;
		showMergePreview = true;
		mergePreviewLoading = true;
		mergePreview = null;
		mergePreviewError = null;
		try {
			mergePreview = await previewMergeFromFile();
		} catch (e) {
			logAppError('import', e, { operation: 'previewMergeFromFile' });
			mergePreviewError = m.merge_preview_error();
		} finally {
			mergePreviewLoading = false;
		}
	}

	async function handleMergeConfirm() {
		showMergePreview = false;
		try {
			await mergeFromFile();
		} catch (e) {
			logAppError('import', e, { operation: 'mergeFromFile' });
		}
	}

	/**
	 * Dismissing the preview leaves the file as it was and does not clear the
	 * external-change flag, so the toast can come back rather than the change
	 * being silently forgotten.
	 */
	function handleMergeCancel() {
		showMergePreview = false;
		mergePreview = null;
	}

	function handleIgnore() {
		store.linkedFileExternalChange = false;
		showLinkedFileToast = false;
	}
</script>

<svelte:head>
	<link rel="canonical" href={canonical} />
	<meta property="og:site_name" content="LM Deck Tools" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage} />
	<meta property="og:image:type" content="image/jpeg" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="LM Deck Tools — Chart Your Own Course" />
	<meta property="og:locale" content={ogLocale} />
	{#each ogLocaleAlternates as locale (locale)}
		<meta property="og:locale:alternate" content={locale} />
	{/each}
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={ogImage} />
</svelte:head>

<ParaglideJS {i18n}>
	<!-- z-2 lifts all content above the fixed film-grain layer painted on body::after -->
	<div class="relative z-[2] flex min-h-screen flex-col text-slate-100">
		{#if store.previewMode}
			<PreviewBanner />
		{/if}

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

	<FirstRunCopyNudge
		bind:show={showFirstRunNudge}
		onsave={handleSaveCopy}
		ondismiss={handleDismissNudge}
	/>

	<MergePreviewModal
		bind:show={showMergePreview}
		fileName={store.linkedFileName ?? ''}
		preview={mergePreview}
		loading={mergePreviewLoading}
		error={mergePreviewError}
		onconfirm={handleMergeConfirm}
		oncancel={handleMergeCancel}
	/>
</ParaglideJS>
