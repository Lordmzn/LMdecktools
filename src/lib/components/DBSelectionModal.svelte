<script lang="ts">
	import { onMount } from 'svelte';
	type Section = 'localdb' | 'link' | 'cache' | 'import' | 'export' | 'copies';
	let { show = $bindable(false), initialSection }: { show: boolean; initialSection?: Section } =
		$props();
	import BrandMark from '$lib/components/BrandMark.svelte';
	import { localDatabaseExists } from '$lib/store.svelte';
	import { getImageCacheStats, clearImageCache, formatBytes } from '$lib/image-cache';
	import { readStorageReport, type StorageReport } from '$lib/storage-persistence';
	import { triggerDownload } from '$lib/download';
	import {
		store,
		initDB,
		peekDB,
		clearDB,
		downloadBackupCopy,
		loadFromFile,
		inspectImportFile,
		exportCollectionToText,
		exportCollectionToCSV,
		exportCollectionPreview,
		isFileSystemAccessSupported,
		linkFile,
		linkExistingFile,
		unlinkFile,
		changeFile,
		reconnectFile,
		retryWrite,
		saveNow,
		importCardsToCollection,
		importCardsToNewList,
		logAppError,
		previewPayload,
		importSiblingFile,
		canShareFiles,
		shareBackupCopy,
		type MergePreview
	} from '$lib/store.svelte';
	import type { ExportFormat } from '$lib/export-format';
	import { describeImport, ImportValidationError } from '$lib/import-guard';
	import { parseImportInput } from '$lib/import-parser';
	import type { ParseResult } from '$lib/import-parser';
	import { fetchDeckFromUrl, URL_IMPORT_HOST } from '$lib/import-url';
	import MergePreviewModal from '$lib/components/MergePreviewModal.svelte';
	import * as m from '$lib/paraglide/messages';

	const fsAccessSupported = isFileSystemAccessSupported();
	// canShare({files}) runs synchronously with no prompt (#91, T2) — it's what
	// decides whether the Share button renders at all rather than rendering and
	// failing on click everywhere the API is absent (Firefox, most desktops).
	const shareSupported = canShareFiles();

	let activeSection = $state<Section | null>(null);

	// Import tab state
	type ImportMode = 'file' | 'text' | 'url';
	type ImportTarget = 'collection' | 'list';
	let extImportMode = $state<ImportMode>('file');
	let extImportTarget = $state<ImportTarget>('list');
	let extImportFileInput: HTMLInputElement;
	let extImportSelectedFile: File | null = $state(null);
	let extImportText = $state('');
	let extImportUrl = $state('');
	let extImportRunning = $state(false);
	let extImportProgress = $state({ current: 0, total: 0 });
	let extImportPreview = $state<ParseResult | null>(null);
	let extImportSummary = $state<{ success: number; failed: number; notFound: string[] } | null>(
		null
	);
	let extImportErr = $state<string | null>(null);
	let extImportFetching = $state(false);

	// Clock tick for relative time display (updates every 60s)
	let now = $state(Date.now());
	let clockInterval: ReturnType<typeof setInterval> | undefined;

	function formatRelativeTime(timestamp: number): string {
		const delta = Math.floor((now - timestamp) / 1000);
		if (delta < 60) return m.time_just_now();
		const mins = Math.floor(delta / 60);
		if (mins < 60) return m.time_minutes_ago({ count: mins });
		const hours = Math.floor(mins / 60);
		if (hours < 24) return m.time_hours_ago({ count: hours });
		const days = Math.floor(hours / 24);
		return m.time_days_ago({ count: days });
	}

	let lastSavedText = $derived(
		store.linkedFileWriting
			? m.db_saving()
			: store.linkedFileLastSaved
				? m.db_last_saved({ time: formatRelativeTime(store.linkedFileLastSaved) })
				: null
	);

	let fileInput: HTMLInputElement;
	let localDBexists = $state<boolean | null>(null);
	let selectedFile: File | null = $state(null);
	let isLoadingFile = $state(false);
	let importCurrent = $state(0);
	let importTotal = $state(0);
	let importResult = $state<{ imported: number; merged: number; errors: number } | null>(null);
	let importError = $state<string | null>(null);
	/** What the selected restore file says it holds, or null when it failed validation. */
	let importPreview = $state<string | null>(null);

	// Sibling import (#91, T3): read other devices' files from the same shared
	// folder, one `MergePreviewModal` at a time — never destructive, so there is
	// no restore-style confirmation gate, just a queue.
	let siblingFileInput: HTMLInputElement;
	let siblingQueue: File[] = $state([]);
	let siblingIndex = $state(0);
	let siblingPreview = $state<MergePreview | null>(null);
	let siblingPreviewLoading = $state(false);
	let siblingPreviewError = $state<string | null>(null);
	let showSiblingPreview = $state(false);
	let siblingResult = $state<{ imported: number; merged: number; errors: number; skipped: number }>(
		{ imported: 0, merged: 0, errors: 0, skipped: 0 }
	);
	let siblingDone = $state(false);

	async function advanceSiblingQueue() {
		if (siblingIndex >= siblingQueue.length) {
			siblingDone = true;
			return;
		}

		const file = siblingQueue[siblingIndex];
		showSiblingPreview = true;
		siblingPreviewLoading = true;
		siblingPreview = null;
		siblingPreviewError = null;

		try {
			const data = new Uint8Array(await file.arrayBuffer());
			siblingPreview = previewPayload(data);
		} catch (e) {
			if (e instanceof ImportValidationError) {
				// Not one of ours (or unreadable) — skip it and keep going rather
				// than blocking the rest of the batch on one stray file.
				siblingResult.skipped++;
				siblingIndex++;
				showSiblingPreview = false;
				await advanceSiblingQueue();
				return;
			}
			logAppError('import', e, { operation: 'previewSiblingFile', fileName: file.name });
			siblingPreviewError = m.merge_preview_error();
		} finally {
			siblingPreviewLoading = false;
		}
	}

	function handleSiblingFilesSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!target.files || target.files.length === 0) return;

		siblingQueue = Array.from(target.files);
		siblingIndex = 0;
		siblingResult = { imported: 0, merged: 0, errors: 0, skipped: 0 };
		siblingDone = false;
		void advanceSiblingQueue();
	}

	async function handleSiblingConfirm() {
		showSiblingPreview = false;
		const file = siblingQueue[siblingIndex];
		try {
			const data = new Uint8Array(await file.arrayBuffer());
			const result = await importSiblingFile(data, file.name);
			siblingResult.imported += result.imported;
			siblingResult.merged += result.merged;
			siblingResult.errors += result.errors;
		} catch (e) {
			logAppError('import', e, { operation: 'importSiblingFile', fileName: file.name });
			siblingResult.errors++;
		}
		siblingIndex++;
		await advanceSiblingQueue();
	}

	async function handleSiblingCancel() {
		showSiblingPreview = false;
		siblingResult.skipped++;
		siblingIndex++;
		await advanceSiblingQueue();
	}

	let imageCacheCount = $state(0);
	let imageCacheBytes = $state(0);
	// e.g. "412 images · 86.4 MB" — the size is what the Clear button is judged against (#51)
	let imageCacheSummary = $derived(
		imageCacheCount === 1
			? m.db_cache_summary_one({ count: imageCacheCount, size: formatBytes(imageCacheBytes) })
			: m.db_cache_summary_other({ count: imageCacheCount, size: formatBytes(imageCacheBytes) })
	);
	let isClearingCache = $state(false);

	/**
	 * What the browser says about the storage this database sits in (#88): whether
	 * it is exempt from eviction under disk pressure, and how much of the quota is
	 * spent. Null until the first read resolves, which is the modal opening.
	 *
	 * Deliberately never phrased as safety. The grant defends against one thing —
	 * the browser reclaiming space — and against clearing browsing data, a deleted
	 * icon or a lost phone it does nothing at all.
	 */
	let storageReport = $state<StorageReport | null>(null);

	/** e.g. "12.4 MB of 2.1 GB". Either half may be missing; `estimate()` is allowed to omit both. */
	let storageUsageText = $derived(
		storageReport?.usage === null || storageReport === null
			? m.db_storage_usage_unknown()
			: storageReport.quota === null
				? m.db_storage_usage_partial({ used: formatBytes(storageReport.usage) })
				: m.db_storage_usage({
						used: formatBytes(storageReport.usage),
						quota: formatBytes(storageReport.quota)
					})
	);
	let showCreateNewConfirm = $state(false);
	let showRestoreConfirm = $state(false);
	/** True once a successful restore left the modal open to offer linking a file. */
	let restoreSuggestsLink = $state(false);

	/** Whether a restore would destroy anything. Restoring into an empty DB asks nothing. */
	let restoreWouldOverwrite = $derived(
		store.savedCardLists.length > 0 || store.uniqueOwnedCards > 0
	);

	function computeDefaultSection(): Section {
		if (store.dbMode === 'none' || store.dbMode === 'peek') {
			return 'localdb';
		}
		// The File DB section is not rendered without the File System Access API
		if (!fsAccessSupported) return 'localdb';
		// dbMode === 'active'
		if (store.linkedFileStatus === 'none') return 'link';
		if (
			store.linkedFileStatus === 'reconnect' ||
			store.linkedFileStatus === 'not-found' ||
			store.linkedFileStatus === 'write-error'
		)
			return 'link';
		// linkedFileStatus === 'active'
		return 'cache';
	}

	/** Read the cache size into the indicator. Cheap while the entry count is unchanged. */
	async function refreshImageCacheStats() {
		const stats = await getImageCacheStats();
		imageCacheCount = stats.count;
		imageCacheBytes = stats.bytes;
	}

	/**
	 * Re-measure whenever the modal opens, not once per page load (#64).
	 *
	 * This component is mounted unconditionally by Header.svelte — only its markup
	 * is behind `{#if show}` — and the header survives client-side navigation, so
	 * an `onMount` measurement happened once per hard reload and never again. The
	 * indicator sat at whatever the cache held at page load, which after a clear
	 * meant a permanent zero however many images were re-cached since.
	 *
	 * Sizing the cache hydrates every entry, but `getImageCacheStats` memoises on
	 * the entry count and the cache is append-only, so re-opening with an
	 * unchanged cache costs a `cache.keys()` and nothing more.
	 */
	$effect(() => {
		if (show) {
			refreshImageCacheStats();
			// Re-read on every open for the same reason: the grant can arrive after
			// startup (Firefox's prompt) or lapse between sessions (WebKit drops it
			// on browser restart), and the usage figure moves with every import.
			readStorageReport().then((report) => (storageReport = report));
			// The header's copy counter opens straight to the Copies tab rather than
			// wherever `computeDefaultSection()` would otherwise land.
			if (initialSection) activeSection = initialSection;
		}
	});

	onMount(() => {
		clockInterval = setInterval(() => {
			now = Date.now();
		}, 60_000);
		if (store.dbMode === 'none') {
			localDatabaseExists().then(
				(res) => {
					if (res) {
						peekDB();
						localDBexists = true;
					} else {
						localDBexists = false;
					}
					activeSection = computeDefaultSection();
				},
				() => {
					localDBexists = false;
					activeSection = computeDefaultSection();
				}
			);
		} else {
			// DB already active or peeking — we know localDB exists
			localDBexists = true;
			activeSection = computeDefaultSection();
		}
		return () => {
			if (clockInterval) clearInterval(clockInterval);
		};
	});

	function toggleSection(section: Section) {
		activeSection = activeSection === section ? null : section;
	}

	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (!target.files || target.files.length === 0) return;

		selectedFile = target.files[0];
		importResult = null;
		importError = null;
		importPreview = null;

		// Validate up front — the user should see what they are about to restore,
		// and a file we would refuse should never reach the Restore button (#52)
		try {
			importPreview = describeImport(await inspectImportFile(selectedFile));
		} catch (e) {
			importError = e instanceof Error ? e.message : m.db_could_not_read_file();
		}
	}

	/**
	 * Restoring clears the database first, and it is now reachable with a database
	 * already loaded, so anything that would be lost gets confirmed before the
	 * write. An empty (or absent) database has nothing to lose — go straight in.
	 */
	function requestRestore() {
		if (restoreWouldOverwrite) {
			showRestoreConfirm = true;
		} else {
			handleLoadFile();
		}
	}

	async function handleLoadFile() {
		if (!selectedFile) return;
		showRestoreConfirm = false;
		isLoadingFile = true;
		importCurrent = 0;
		importTotal = 0;
		importResult = null;
		importError = null;
		restoreSuggestsLink = false;
		try {
			const result = await loadFromFile(selectedFile, (current, total) => {
				importCurrent = current;
				importTotal = total;
			});
			importResult = result;
			if (result.errors === 0) {
				// A restored database is a good moment to link a file for auto-save —
				// stay open and say so, rather than closing on a browser that can (#42)
				if (fsAccessSupported && store.linkedFileStatus === 'none') {
					restoreSuggestsLink = true;
				} else {
					setTimeout(() => closeModal(), 1500);
				}
			}
		} catch (e) {
			logAppError('import', e, { operation: 'loadFromFile', fileName: selectedFile?.name });
			importError = e instanceof Error ? e.message : m.db_failed_to_import_file();
		} finally {
			isLoadingFile = false;
		}
	}

	async function handleLoadLocal() {
		await initDB();
		closeModal();
	}

	async function handleCreateNew() {
		if (store.linkedFileStatus !== 'none') {
			await unlinkFile();
		}
		if (store.dbMode !== 'none') {
			await clearDB();
			store.dbMode = 'none';
		}
		await initDB();
		showCreateNewConfirm = false;
		closeModal();
	}

	async function handleExtImportFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			extImportSelectedFile = target.files[0];
			extImportSummary = null;
			extImportErr = null;
			try {
				const text = await extImportSelectedFile.text();
				extImportPreview = parseImportInput(text);
			} catch {
				extImportErr = m.db_import_could_not_read_file();
				extImportPreview = null;
			}
		}
	}

	function handleExtImportTextChange() {
		extImportSummary = null;
		extImportErr = null;
		if (extImportText.trim()) {
			extImportPreview = parseImportInput(extImportText);
		} else {
			extImportPreview = null;
		}
	}

	async function handleExtImportUrlFetch() {
		extImportFetching = true;
		extImportSummary = null;
		extImportErr = null;
		extImportPreview = null;
		try {
			const deck = await fetchDeckFromUrl(extImportUrl);
			extImportPreview = { listName: deck.name, cards: deck.cards, warnings: [] };
		} catch (e) {
			extImportErr = e instanceof Error ? e.message : m.db_import_failed_fetch();
		} finally {
			extImportFetching = false;
		}
	}

	async function handleExtImportRun() {
		if (extImportRunning || !extImportPreview || extImportPreview.cards.length === 0) return;
		extImportRunning = true;
		extImportSummary = null;
		extImportErr = null;
		extImportProgress = { current: 0, total: 0 };
		try {
			const progressCb = (current: number, total: number) => {
				extImportProgress = { current, total };
			};
			// Strip Svelte $state proxy — plain objects are needed for Map lookups in the store
			const cards = $state.snapshot(extImportPreview.cards);
			const listName = extImportPreview.listName || m.db_import_default_list_name();
			if (extImportTarget === 'collection') {
				extImportSummary = await importCardsToCollection(cards, progressCb);
			} else {
				extImportSummary = await importCardsToNewList(cards, listName, progressCb);
			}
		} catch (e) {
			extImportErr = e instanceof Error ? e.message : m.error_import_failed();
		} finally {
			extImportRunning = false;
		}
	}

	function resetExtImport() {
		extImportSelectedFile = null;
		extImportText = '';
		extImportUrl = '';
		extImportPreview = null;
		extImportSummary = null;
		extImportErr = null;
		extImportFetching = false;
		extImportRunning = false;
	}

	// Backup export state
	let isExportingBackup = $state(false);
	let exportBackupSuccess = $state(false);

	async function handleExportBackup() {
		isExportingBackup = true;
		exportBackupSuccess = false;
		try {
			await downloadBackupCopy();
			exportBackupSuccess = true;
		} catch (e) {
			logAppError('indexeddb', e, { operation: 'exportBackup' });
		} finally {
			isExportingBackup = false;
		}
	}

	// Share sheet (#91, T2)
	let isSharing = $state(false);
	let shareError = $state<string | null>(null);

	async function handleShare() {
		isSharing = true;
		shareError = null;
		try {
			await shareBackupCopy();
		} catch (e) {
			logAppError('indexeddb', e, { operation: 'shareBackupCopy' });
			shareError = m.db_share_error();
		} finally {
			isSharing = false;
		}
	}

	// CSV collection export state
	// `value` is the CSV column header the importer resolves, so it stays English
	// however the label is translated — a translated export must still re-import (#50).
	const csvFieldOptions = [
		{ label: m.db_export_field_count(), value: 'Count' },
		{ label: m.db_export_field_name(), value: 'Name' },
		{ label: m.db_export_field_edition(), value: 'Edition' },
		{ label: m.db_export_field_collector_number(), value: 'Collector Number' },
		{ label: m.db_export_field_foil(), value: 'Foil' },
		{ label: m.db_export_field_language(), value: 'Language' },
		{ label: m.db_export_field_scryfall_id(), value: 'Scryfall ID' }
	];
	let csvSelectedFields = $state(['Count', 'Name', 'Edition']);
	// CSV re-imports into this app and opens in a spreadsheet; text is what other MTG tools paste (#50)
	let exportFormat = $state<ExportFormat>('csv');

	/**
	 * Only the first `PREVIEW_ROWS` rows are formatted for the box (#63). Rendering
	 * the whole collection here — ~80 KB of text for 5000 cards — and rebuilding it
	 * on every format or field change is what made switching CSV ↔ Text stall.
	 * The file itself is built in full, on demand, by the two handlers below.
	 */
	let exportPreview = $derived(exportCollectionPreview(csvSelectedFields, exportFormat));

	/** Whether there is anything to export at all — drives the two buttons. */
	let hasExport = $derived(csvSelectedFields.length > 0 && store.uniqueOwnedCards > 0);

	/** The real export: every card, never the truncated preview. */
	function buildFullExport(): string {
		return exportFormat === 'csv'
			? exportCollectionToCSV(csvSelectedFields)
			: exportCollectionToText(csvSelectedFields);
	}

	function handleCsvCopy() {
		navigator.clipboard.writeText(buildFullExport());
	}

	function handleCsvDownload() {
		const csvText = buildFullExport();
		if (!csvText) return;
		const isCsv = exportFormat === 'csv';
		triggerDownload(
			csvText,
			isCsv ? 'mtg_collection_export.csv' : 'mtg_collection_export.txt',
			isCsv ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;'
		);
	}

	function closeModal() {
		show = false;
		setTimeout(() => null, 300); // Wait for animation
	}
</script>

<!-- What the database actually holds: lists plus the collection -->
{#snippet dbContentStats()}
	<div class="flex justify-between">
		<span class="font-medium">{m.db_stat_lists()}</span>
		<span class="font-mono" data-testid="db-stat-lists">{store.savedCardLists.length}</span>
	</div>
	<div class="flex justify-between">
		<span class="font-medium">{m.db_stat_list_cards()}</span>
		<span class="font-mono" data-testid="db-stat-list-cards">{store.totalListCards}</span>
	</div>
	<div class="flex justify-between">
		<span class="font-medium">{m.db_stat_collection()}</span>
		<span class="font-mono" data-testid="db-stat-collection"
			>{store.totalOwnedCards} ({store.uniqueOwnedCards} unique)</span
		>
	</div>
{/snippet}

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/50 py-4 backdrop-blur-sm transition-opacity duration-300 sm:items-center"
		role="button"
		tabindex="0"
		onclick={(e) => e.target === e.currentTarget && closeModal()}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				if (e.target === e.currentTarget) {
					e.preventDefault();
					closeModal();
				}
			}
		}}
	>
		<!--
			The panel is a bounded flex column, not a bounded body under an unbounded
			header. It used to cap only the content at 60vh while the header and the
			5-tab strip grew freely above it, so on an iPhone 13 the modal was a
			398px window onto 954px of content nested inside the page scroll, and on
			a 568px-tall iPhone SE the panel outgrew an `items-center` overlay and
			lost 12px off each end with no way to reach them (#76). `dvh`, not `vh`:
			mobile Safari's `vh` is the *expanded* viewport, which is taller than
			what is actually on screen while the URL bar is showing.
		-->
		<div
			class="panel mx-4 flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl transform flex-col overflow-hidden rounded-2xl shadow-2xl transition-all duration-300"
			class:scale-100={show}
			class:scale-95={!show}
		>
			<!-- Header -->
			<div
				class="flex shrink-0 items-center gap-3 border-b border-orange-500/[0.12] bg-gradient-to-br from-orange-500/[0.12] to-transparent px-4 py-4 sm:gap-4 sm:px-6 sm:py-5"
			>
				<!-- The brand mark, same art as the site header (#66) -->
				<BrandMark class="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
				<div class="min-w-0">
					<h2 class="text-xl font-extrabold tracking-tight text-white sm:text-2xl">
						{m.db_modal_title()}
					</h2>
					<p class="mt-0.5 text-sm text-slate-400">{m.db_modal_subtitle()}</p>
				</div>
			</div>

			<!-- Toolbar — five tabs that wrapped "In-browser DB" onto three lines at
			     390px. `whitespace-nowrap` keeps each tab one line tall and the strip
			     scrolls sideways if the five of them still do not fit. -->
			<div
				class="flex shrink-0 gap-1 overflow-x-auto border-b border-orange-500/[0.08] bg-slate-900 px-2 py-2 sm:px-4"
			>
				<button
					onclick={() => {
						toggleSection('localdb');
						exportBackupSuccess = false;
					}}
					aria-expanded={activeSection === 'localdb'}
					class="flex min-h-11 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[0.7rem] whitespace-nowrap transition-colors sm:px-3 sm:text-xs
						{activeSection === 'localdb'
						? 'bg-orange-500/10 text-orange-400'
						: 'text-slate-400 hover:text-orange-300'}"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
						></path>
					</svg>
					{m.db_tab_local()}
				</button>
				<button
					onclick={() => {
						toggleSection('copies');
						exportBackupSuccess = false;
					}}
					disabled={store.dbMode !== 'active'}
					aria-expanded={activeSection === 'copies'}
					class="relative flex min-h-11 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[0.7rem] whitespace-nowrap transition-colors sm:px-3 sm:text-xs
						{activeSection === 'copies'
						? 'bg-orange-500/10 text-orange-400'
						: 'text-slate-400 hover:text-orange-300'}
						disabled:cursor-not-allowed disabled:opacity-40"
				>
					{#if store.copyCount <= 1}
						<span class="bg-warning-solid absolute top-1 right-1 h-2 w-2 rounded-full"></span>
					{/if}
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-3m-8-4h9a2 2 0 002-2V5a2 2 0 00-2-2h-9a2 2 0 00-2 2v9a2 2 0 002 2z"
						></path>
					</svg>
					{m.db_tab_copies()}
				</button>
				<!-- Without the File System Access API there is no file DB to speak of;
				     the In-browser DB section says so next to Download copy instead -->
				{#if fsAccessSupported}
					<button
						onclick={() => toggleSection('link')}
						disabled={store.dbMode !== 'active'}
						aria-expanded={activeSection === 'link'}
						class="flex min-h-11 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[0.7rem] whitespace-nowrap transition-colors sm:px-3 sm:text-xs
							{activeSection === 'link'
							? 'bg-orange-500/10 text-orange-400'
							: 'text-slate-400 hover:text-orange-300'}
							disabled:cursor-not-allowed disabled:opacity-40"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
							></path>
						</svg>
						{m.db_tab_file()}
					</button>
				{/if}
				<button
					onclick={() => toggleSection('cache')}
					aria-expanded={activeSection === 'cache'}
					class="flex min-h-11 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[0.7rem] whitespace-nowrap transition-colors sm:px-3 sm:text-xs
						{activeSection === 'cache'
						? 'bg-orange-500/10 text-orange-400'
						: 'text-slate-400 hover:text-orange-300'}"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
						></path>
					</svg>
					{m.db_tab_cache()}
				</button>
				<button
					onclick={() => {
						toggleSection('import');
						resetExtImport();
					}}
					disabled={store.dbMode !== 'active'}
					aria-expanded={activeSection === 'import'}
					class="flex min-h-11 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[0.7rem] whitespace-nowrap transition-colors sm:px-3 sm:text-xs
						{activeSection === 'import'
						? 'bg-orange-500/10 text-orange-400'
						: 'text-slate-400 hover:text-orange-300'}
						disabled:cursor-not-allowed disabled:opacity-40"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
						></path>
					</svg>
					{m.db_tab_import()}
				</button>
				<button
					onclick={() => toggleSection('export')}
					disabled={store.dbMode !== 'active'}
					aria-expanded={activeSection === 'export'}
					class="flex min-h-11 shrink-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[0.7rem] whitespace-nowrap transition-colors sm:px-3 sm:text-xs
						{activeSection === 'export'
						? 'bg-orange-500/10 text-orange-400'
						: 'text-slate-400 hover:text-orange-300'}
						disabled:cursor-not-allowed disabled:opacity-40"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						></path>
					</svg>
					{m.db_tab_export()}
				</button>
			</div>

			<!-- Content -->
			<div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
				<!-- Local DB Section (merged: connect + import + create) -->
				{#if activeSection === 'localdb'}
					<!-- Connect to existing local DB (only if DB exists but not active) -->
					{#if localDBexists === true && store.dbMode !== 'active'}
						<div
							class="rounded-xl border border-orange-500/[0.08] p-5 transition-colors hover:border-orange-500/20"
						>
							<div class="flex items-start gap-4">
								<div
									class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-orange-500/[0.12] bg-orange-500/10"
								>
									<svg
										class="h-6 w-6 text-orange-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										></path>
									</svg>
								</div>
								<div class="flex-1">
									<h3 class="mb-2 text-lg font-semibold text-slate-100">
										{#if localDBexists === null}
											{m.db_local_searching()}
										{:else}
											{m.db_local_found()}
										{/if}
									</h3>
									<div class="mb-4 space-y-2 text-sm text-slate-400">
										{@render dbContentStats()}
									</div>
									{#if store.dbMode === 'peek'}
										<div
											class="border-warning-edge bg-warning-surface text-warning mb-3 rounded-lg border p-3 text-sm"
										>
											{m.db_peek_notice()}
										</div>
									{/if}
									<button onclick={handleLoadLocal} class="btn btn-subtle w-full">
										{m.db_connect_local()}
									</button>
								</div>
							</div>
						</div>
					{/if}

					<!-- DB info when active -->
					{#if store.dbMode === 'active'}
						<div class="border-success-edge rounded-xl border-2 p-5">
							<div class="flex items-start gap-4">
								<div
									class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-orange-500/[0.12] bg-orange-500/10"
								>
									<svg
										class="h-6 w-6 text-orange-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										></path>
									</svg>
								</div>
								<div class="flex-1">
									<h3 class="mb-2 text-lg font-semibold text-slate-100">{m.db_local_active()}</h3>
									<div class="space-y-2 text-sm text-slate-400">
										{@render dbContentStats()}
									</div>
								</div>
							</div>
						</div>
					{/if}

					<!--
						What the browser promises about the storage underneath (#88).
						Only where there is a database to talk about: with no DB there is
						nothing stored, and preview mode writes to no container at all, so a
						quota reading there would describe somewhere the app never touches.
					-->
					{#if store.dbLoaded && !store.previewMode}
						<div class="mt-4 rounded-xl border border-orange-500/[0.08] p-5">
							<h3 class="mb-2 text-lg font-semibold text-slate-100">{m.db_storage_title()}</h3>
							<div class="mb-3 space-y-2 text-sm text-slate-400">
								<div class="flex justify-between gap-4">
									<span class="font-medium">{m.db_storage_protection_label()}</span>
									<span
										class="font-mono {storageReport?.supported
											? storageReport.persisted
												? 'text-success'
												: 'text-warning'
											: ''}"
										data-testid="storage-persistence"
									>
										{#if !storageReport || !storageReport.supported}
											{m.db_storage_protection_unknown()}
										{:else if storageReport.persisted}
											{m.db_storage_protection_granted()}
										{:else}
											{m.db_storage_protection_denied()}
										{/if}
									</span>
								</div>
								<div class="flex justify-between gap-4">
									<span class="font-medium">{m.db_storage_usage_label()}</span>
									<span class="font-mono" data-testid="storage-usage">{storageUsageText}</span>
								</div>
							</div>
							<!-- Never "your data is safe": the grant covers eviction under disk
							     pressure and nothing else on the list (#88, D2). -->
							<p class="text-xs text-slate-500">
								{#if !storageReport || !storageReport.supported}
									{m.db_storage_body_unknown()}
								{:else if storageReport.persisted}
									{m.db_storage_body_granted()}
								{:else}
									{m.db_storage_body_denied()}
								{/if}
							</p>
						</div>
					{/if}

					<!-- Separator -->
					<div class="my-4 border-t border-orange-500/[0.08]"></div>

					<!-- Download copy (all browsers) -->
					<div
						class="rounded-xl border border-orange-500/[0.08] p-5 transition-colors hover:border-orange-500/20"
					>
						<div class="flex items-start gap-4">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-orange-500/[0.12] bg-orange-500/10"
							>
								<svg
									class="h-6 w-6 text-orange-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									></path>
								</svg>
							</div>
							<div class="flex-1">
								<h3 class="mb-2 text-lg font-semibold text-slate-100">{m.db_download_title()}</h3>
								<p class="mb-4 text-sm text-slate-400">
									{m.db_download_body()}
								</p>
								{#if exportBackupSuccess}
									<div
										class="border-success-edge bg-success-surface text-success mb-3 rounded-lg border p-3 text-sm"
									>
										{m.db_download_started()}
									</div>
								{/if}
								<button
									onclick={handleExportBackup}
									disabled={isExportingBackup || store.dbMode !== 'active'}
									class="btn btn-subtle flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isExportingBackup ? m.db_download_preparing() : m.db_download_button()}
								</button>
							</div>
						</div>
					</div>

					<!-- Separator -->
					<div class="my-4 border-t border-orange-500/[0.08]"></div>

					<!-- Restore from file (Firefox fallback) -->
					<div
						class="rounded-xl border border-orange-500/[0.08] p-5 transition-colors hover:border-orange-500/20"
					>
						<div class="flex items-start gap-4">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-800"
							>
								<svg
									class="h-6 w-6 text-orange-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
									></path>
								</svg>
							</div>
							<div class="flex-1">
								<h3 class="mb-2 text-lg font-semibold text-slate-100">{m.db_restore_title()}</h3>
								<p class="mb-4 text-sm text-slate-400">
									{m.db_restore_body_prefix()} <em>{m.db_restore_replaces()}</em>
									{m.db_restore_body_suffix()}
								</p>
								<input
									type="file"
									data-testid="restore-file-input"
									bind:this={fileInput}
									onchange={handleFileSelect}
									disabled={isLoadingFile}
									class="mb-3 block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orange-400 hover:file:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
								/>
								{#if selectedFile && !importResult && !importError}
									<p class="mb-1 text-xs text-slate-400">
										{m.db_restore_selected_file({ name: selectedFile.name })}
									</p>
								{/if}
								{#if importPreview && !importResult}
									<p class="mb-3 text-xs text-slate-500" data-testid="restore-preview">
										{importPreview}
									</p>
								{/if}
								{#if importResult}
									{#if importResult.errors === 0}
										<div
											class="border-success-edge bg-success-surface text-success mb-3 rounded-lg border p-3 text-sm"
										>
											{importResult.imported === 1
												? m.db_restore_success_one({ count: importResult.imported })
												: m.db_restore_success_other({ count: importResult.imported })}
											{#if restoreSuggestsLink}
												<p class="mt-2">
													{m.db_restore_link_hint_prefix()}
													<button
														onclick={() => toggleSection('link')}
														class="hover:text-success underline underline-offset-2"
														>{m.db_tab_file()}</button
													>
													{m.db_restore_link_hint_suffix()}
												</p>
											{/if}
										</div>
									{:else}
										<div
											class="border-warning-edge bg-warning-surface text-warning mb-3 rounded-lg border p-3 text-sm"
										>
											{m.db_restore_partial({
												imported: importResult.imported,
												errors: importResult.errors
											})}
										</div>
									{/if}
								{/if}
								{#if importError}
									<div
										class="border-danger-edge bg-danger-surface text-danger mb-3 rounded-lg border p-3 text-sm"
									>
										{importError}
									</div>
								{/if}
								<button
									onclick={requestRestore}
									disabled={!selectedFile ||
										!importPreview ||
										isLoadingFile ||
										importResult !== null}
									class="btn btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed"
								>
									{#if isLoadingFile}
										<svg
											class="h-4 w-4 animate-spin"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
										>
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											/>
											<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
										</svg>
										{#if importTotal > 0}
											{m.db_restore_progress({ current: importCurrent, total: importTotal })}
										{:else}
											{m.db_restoring()}
										{/if}
									{:else}
										{m.db_restore_button()}
									{/if}
								</button>
							</div>
						</div>
					</div>

					{#if !fsAccessSupported}
						<p class="mt-4 text-xs text-slate-500">
							{m.db_no_fs_access()}
						</p>
					{/if}

					<!-- Separator -->
					<div class="my-4 border-t border-orange-500/[0.08]"></div>

					<!-- Read other devices' files (#91, T3) — needs no File System Access API,
					     so it lives here rather than under the File DB tab, which is hidden
					     entirely where that API is absent. -->
					<div
						class="rounded-xl border border-orange-500/[0.08] p-5 transition-colors hover:border-orange-500/20"
					>
						<div class="flex items-start gap-4">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-800"
							>
								<svg
									class="h-6 w-6 text-orange-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 17v-2a4 4 0 014-4h4m0 0l-3-3m3 3l-3 3M4 7h16M4 7a2 2 0 00-2 2v6a2 2 0 002 2h4M4 7a2 2 0 012-2h5"
									></path>
								</svg>
							</div>
							<div class="flex-1">
								<h3 class="mb-2 text-lg font-semibold text-slate-100">{m.db_siblings_title()}</h3>
								<p class="mb-4 text-sm text-slate-400">
									{m.db_siblings_body()}
								</p>
								<input
									type="file"
									multiple
									data-testid="sibling-file-input"
									bind:this={siblingFileInput}
									onchange={handleSiblingFilesSelect}
									class="hidden"
								/>
								{#if siblingDone && siblingQueue.length > 0}
									<div
										class="border-success-edge bg-success-surface text-success mb-3 rounded-lg border p-3 text-sm"
										data-testid="sibling-summary"
									>
										{siblingResult.errors > 0 || siblingResult.skipped > 0
											? m.db_siblings_summary_partial({
													imported: siblingResult.imported,
													skipped: siblingResult.errors + siblingResult.skipped
												})
											: siblingResult.imported === 1
												? m.db_siblings_summary_one({ imported: siblingResult.imported })
												: m.db_siblings_summary_other({ imported: siblingResult.imported })}
									</div>
								{/if}
								<button
									onclick={() => siblingFileInput.click()}
									disabled={store.dbMode !== 'active'}
									class="btn btn-subtle w-full disabled:cursor-not-allowed"
								>
									{m.db_siblings_button()}
								</button>
							</div>
						</div>
					</div>

					<!-- Separator -->
					<div class="my-4 border-t border-orange-500/[0.08]"></div>

					<!-- Create New sub-section -->
					<div
						class="mt-4 rounded-xl border border-orange-500/[0.08] p-5 transition-colors hover:border-orange-500/20"
					>
						<div class="flex items-start gap-4">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-orange-500/[0.12] bg-orange-500/10"
							>
								<svg
									class="h-6 w-6 text-orange-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4v16m8-8H4"
									></path>
								</svg>
							</div>
							<div class="flex-1">
								<h3 class="mb-2 text-lg font-semibold text-slate-100">{m.db_create_title()}</h3>
								<p class="mb-4 text-sm text-slate-400">
									{m.db_create_body()}
								</p>
								<button
									onclick={() => (showCreateNewConfirm = true)}
									class="btn btn-primary w-full"
								>
									{m.db_create_button()}
								</button>
							</div>
						</div>
					</div>
				{/if}

				<!-- Copies Section (#90): durability as a copy count, not a storage setting -->
				{#if activeSection === 'copies'}
					<div class="space-y-4">
						{#if store.copyCount <= 1}
							<div
								class="border-warning-edge bg-warning-surface text-warning rounded-lg border p-4 text-sm"
								data-testid="copies-warning"
							>
								{m.db_copies_warning_body()}
							</div>
						{/if}

						<div class="rounded-xl border border-orange-500/[0.08] p-5">
							<h3 class="mb-3 text-lg font-semibold text-slate-100" data-testid="copies-count">
								{store.copyCount === 1
									? m.db_copies_count_one({ count: store.copyCount })
									: m.db_copies_count_other({ count: store.copyCount })}
							</h3>
							<ul class="space-y-2 text-sm">
								<li class="flex justify-between gap-4">
									<span class="text-slate-200">{m.db_copies_this_device()}</span>
									<span class="text-slate-400">{m.db_copies_live()}</span>
								</li>
								{#each store.copyRegistryEntries as entry (entry.id)}
									<li class="flex justify-between gap-4">
										<span class="text-slate-200">{entry.label}</span>
										<span class="text-slate-400">{formatRelativeTime(entry.lastSeen)}</span>
									</li>
								{/each}
							</ul>
						</div>

						{#if exportBackupSuccess}
							<div
								class="border-success-edge bg-success-surface text-success rounded-lg border p-3 text-sm"
							>
								{m.db_download_started()}
							</div>
						{/if}

						{#if shareError}
							<div
								class="border-danger-edge bg-danger-surface text-danger rounded-lg border p-3 text-sm"
							>
								{shareError}
							</div>
						{/if}

						<div class="flex gap-2">
							<button
								onclick={handleExportBackup}
								disabled={isExportingBackup || store.dbMode !== 'active'}
								class="btn btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
							>
								{isExportingBackup ? m.db_download_preparing() : m.db_copies_save_button()}
							</button>
							{#if shareSupported}
								<button
									onclick={handleShare}
									disabled={isSharing || store.dbMode !== 'active'}
									data-testid="share-button"
									class="btn btn-subtle flex-1 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{m.db_copies_share_button()}
								</button>
							{/if}
							<button
								disabled
								title={m.db_copies_pair_caption()}
								class="btn btn-quiet flex-1 cursor-not-allowed opacity-40"
							>
								{m.db_copies_pair_button()}
							</button>
						</div>
					</div>
				{/if}

				<!-- Export Section (CSV collection export) -->
				{#if activeSection === 'export'}
					<div class="space-y-4">
						<p class="text-sm text-slate-400">{m.db_export_intro()}</p>

						<div>
							<label class="mb-2 block text-sm font-semibold text-slate-300"
								>{m.db_export_format_label()}</label
							>
							<div class="flex gap-2">
								<button
									onclick={() => (exportFormat = 'csv')}
									class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {exportFormat ===
									'csv'
										? 'bg-orange-500 text-white'
										: 'bg-slate-800 text-slate-400 hover:text-slate-200'}"
								>
									CSV
								</button>
								<button
									onclick={() => (exportFormat = 'text')}
									class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {exportFormat ===
									'text'
										? 'bg-orange-500 text-white'
										: 'bg-slate-800 text-slate-400 hover:text-slate-200'}"
								>
									{m.db_export_format_text()}
								</button>
							</div>
							<p class="mt-2 text-xs text-slate-500">
								{exportFormat === 'csv' ? m.db_export_csv_hint() : m.db_export_text_hint()}
							</p>
						</div>

						<div>
							<label class="mb-2 block text-sm font-semibold text-slate-300"
								>{m.db_export_fields_label()}</label
							>
							<div class="grid grid-cols-2 gap-2 text-sm text-slate-300 sm:grid-cols-4">
								{#each csvFieldOptions as option (option.value)}
									<label class="flex cursor-pointer items-center gap-2">
										<input
											type="checkbox"
											bind:group={csvSelectedFields}
											value={option.value}
											class="h-4 w-4 accent-orange-500"
										/>
										<span>{option.label}</span>
									</label>
								{/each}
							</div>
						</div>

						<div>
							<textarea
								value={exportPreview.text}
								readonly
								class="h-64 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 font-mono text-sm text-slate-300"
								placeholder={m.db_export_preview_placeholder()}
							></textarea>
							<!-- Say plainly that the box is a sample, so nobody reads the row
							     count off it and thinks the file is short (#63) -->
							<p class="mt-2 text-xs text-slate-500" data-testid="export-preview-note">
								{#if exportPreview.truncated}
									{m.db_export_preview_truncated({
										shown: exportPreview.shown,
										total: exportPreview.total
									})}
								{:else if exportPreview.total > 0}
									{exportPreview.total === 1
										? m.db_export_preview_all_one({ total: exportPreview.total })
										: m.db_export_preview_all_other({ total: exportPreview.total })}
								{:else}
									{m.db_export_preview_empty()}
								{/if}
							</p>
						</div>

						<div class="flex gap-3">
							<button
								onclick={handleCsvDownload}
								disabled={!hasExport}
								class="btn btn-primary flex-1 disabled:cursor-not-allowed sm:flex-none"
							>
								{m.db_export_download()}
							</button>
							<button
								onclick={handleCsvCopy}
								disabled={!hasExport}
								class="btn btn-quiet disabled:cursor-not-allowed disabled:opacity-50"
							>
								{m.db_export_copy()}
							</button>
						</div>
					</div>
				{/if}

				<!-- Linked File Section -->
				{#if activeSection === 'link'}
					<!-- Auto-save link controls -->
					<div
						class="rounded-xl border border-orange-500/[0.08] p-5 transition-colors hover:border-orange-500/20"
					>
						<div class="flex items-start gap-4">
							{#if store.linkedFileStatus === 'active'}
								<div
									class="bg-success-edge flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
								>
									<svg
										class="text-success h-6 w-6"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12l2 2 4-4"
										/>
									</svg>
								</div>
							{:else if store.linkedFileStatus === 'reconnect'}
								<div
									class="bg-warning-edge flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
								>
									<svg
										class="text-warning h-6 w-6"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
										/>
									</svg>
								</div>
							{:else if store.linkedFileStatus === 'not-found' || store.linkedFileStatus === 'write-error'}
								<div
									class="bg-danger-edge flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
								>
									<svg
										class="text-danger h-6 w-6"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
							{:else}
								<div
									class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-orange-500/[0.12] bg-orange-500/10"
								>
									<svg
										class="h-6 w-6 text-orange-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
										/>
									</svg>
								</div>
							{/if}
							<div class="flex-1">
								{#if store.linkedFileStatus === 'none'}
									<h3 class="mb-2 text-lg font-semibold text-slate-100">{m.db_link_title()}</h3>
									<p class="mb-3 text-sm text-slate-400">
										{m.db_link_body()}
									</p>
									<div class="flex gap-2">
										<button
											onclick={() => linkFile()}
											disabled={store.dbMode !== 'active'}
											class="btn btn-subtle flex-1 disabled:cursor-not-allowed"
										>
											{m.db_link_new_file()}
										</button>
										<button
											onclick={() => linkExistingFile()}
											disabled={store.dbMode !== 'active'}
											class="btn btn-subtle flex-1 disabled:cursor-not-allowed"
										>
											{m.db_link_existing_file()}
										</button>
									</div>
								{:else if store.linkedFileStatus === 'active'}
									<h3 class="mb-2 text-lg font-semibold text-slate-100">
										{m.db_linked_title({ name: store.linkedFileName ?? '' })}
									</h3>
									{#if lastSavedText}
										<p class="mb-3 text-sm text-slate-400">
											{lastSavedText}
										</p>
									{/if}
									<p class="mb-4 text-sm text-slate-400">{m.db_linked_body()}</p>
									<div class="flex gap-2">
										<button
											onclick={() => saveNow()}
											disabled={store.linkedFileWriting}
											class="btn btn-subtle flex-1 disabled:cursor-not-allowed"
										>
											{store.linkedFileWriting ? m.db_saving() : m.db_save_now()}
										</button>
										<button onclick={() => changeFile()} class="btn btn-subtle flex-1">
											{m.db_change_file()}
										</button>
										<button onclick={() => unlinkFile()} class="btn btn-quiet flex-1">
											{m.db_unlink()}
										</button>
									</div>
								{:else if store.linkedFileStatus === 'reconnect'}
									<h3 class="mb-2 text-lg font-semibold text-slate-100">
										{m.db_reconnect_title()}
									</h3>
									<p class="mb-4 text-sm text-slate-400">
										{m.db_reconnect_body({ name: store.linkedFileName ?? '' })}
									</p>
									{#if store.linkedFilePermissionDenied}
										<p
											class="border-warning-edge bg-warning-surface text-warning mb-3 rounded-lg border p-3 text-sm"
										>
											{m.db_permission_denied()}
										</p>
									{/if}
									<div class="flex gap-2">
										<button
											onclick={() => reconnectFile()}
											disabled={store.linkedFilePermissionDenied}
											class="btn btn-subtle flex-1 disabled:cursor-not-allowed"
										>
											{m.db_reconnect_button()}
										</button>
										<button onclick={() => unlinkFile()} class="btn btn-quiet flex-1">
											{m.db_unlink()}
										</button>
									</div>
								{:else if store.linkedFileStatus === 'not-found'}
									<h3 class="mb-2 text-lg font-semibold text-slate-100">
										{m.db_not_found_title()}
									</h3>
									<p class="mb-3 text-sm text-slate-400">
										{m.db_not_found_body({ name: store.linkedFileName ?? '' })}
									</p>
									<p class="text-success mb-4 text-sm">{m.db_data_safe()}</p>
									<button onclick={() => unlinkFile()} class="btn btn-quiet">{m.db_unlink()}</button
									>
								{:else if store.linkedFileStatus === 'write-error'}
									<h3 class="mb-2 text-lg font-semibold text-slate-100">
										{m.db_write_error_title()}
									</h3>
									{#if store.linkedFileError}
										<p
											class="border-danger-edge bg-danger-surface text-danger mb-3 rounded-lg border p-3 text-sm"
										>
											{store.linkedFileError}
										</p>
									{/if}
									<p class="mb-3 text-sm text-slate-400">
										{m.db_write_error_body({ name: store.linkedFileName ?? '' })}
									</p>
									<p class="text-success mb-4 text-sm">{m.db_data_safe()}</p>
									<div class="flex gap-2">
										<button onclick={() => retryWrite()} class="btn btn-subtle flex-1">
											{m.db_retry()}
										</button>
										<button onclick={() => unlinkFile()} class="btn btn-quiet flex-1">
											{m.db_unlink()}
										</button>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<!-- Image Cache Section -->
				{#if activeSection === 'cache'}
					<div
						class="rounded-xl border border-orange-500/[0.08] p-5 transition-colors hover:border-orange-500/20"
					>
						<div class="flex items-start gap-4">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-800"
							>
								<svg
									class="h-6 w-6 text-orange-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									></path>
								</svg>
							</div>
							<div class="flex-1">
								<h3 class="mb-2 text-lg font-semibold text-slate-100">{m.db_cache_title()}</h3>
								<p class="mb-3 text-sm text-slate-400">{m.db_cache_body()}</p>
								<div class="mb-4 space-y-2 text-sm text-slate-400">
									<div class="flex justify-between">
										<span class="font-medium">{m.db_cache_stat_label()}</span>
										<span class="font-mono" data-testid="image-cache-stats"
											>{imageCacheSummary}</span
										>
									</div>
								</div>
								<button
									onclick={async () => {
										isClearingCache = true;
										await clearImageCache();
										// Ask the cache rather than assuming zero — clearing drops the
										// memo, so this is an honest reading and cheap on an empty cache
										await refreshImageCacheStats();
										isClearingCache = false;
									}}
									disabled={isClearingCache || imageCacheCount === 0}
									class="btn btn-quiet w-full disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isClearingCache ? m.db_cache_clearing() : m.db_cache_clear()}
								</button>
							</div>
						</div>
					</div>
				{/if}

				<!-- Import Section -->
				{#if activeSection === 'import'}
					<div class="space-y-4">
						<!-- Source mode selector -->
						<div>
							<label class="mb-2 block text-sm font-medium text-slate-400"
								>{m.db_import_source()}</label
							>
							<div class="flex gap-1">
								{#each [{ value: 'file', label: m.db_import_source_file() }, { value: 'text', label: m.db_import_source_paste() }, { value: 'url', label: m.db_import_source_url() }] as opt (opt.value)}
									<button
										onclick={() => {
											extImportMode = opt.value as ImportMode;
											resetExtImport();
										}}
										class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors
											{extImportMode === opt.value
											? 'bg-orange-500 text-slate-950'
											: 'bg-slate-800 text-slate-400 hover:text-slate-200'}"
									>
										{opt.label}
									</button>
								{/each}
							</div>
						</div>

						<!-- Target selector -->
						<div>
							<label class="mb-2 block text-sm font-medium text-slate-400"
								>{m.db_import_target()}</label
							>
							<div class="flex gap-1">
								<button
									onclick={() => (extImportTarget = 'list')}
									class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors
										{extImportTarget === 'list'
										? 'bg-orange-500 text-slate-950'
										: 'bg-slate-800 text-slate-400 hover:text-slate-200'}"
								>
									{m.db_import_target_list()}
								</button>
								<button
									onclick={() => (extImportTarget = 'collection')}
									class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors
										{extImportTarget === 'collection'
										? 'bg-orange-500 text-slate-950'
										: 'bg-slate-800 text-slate-400 hover:text-slate-200'}"
								>
									{m.db_import_target_collection()}
								</button>
							</div>
						</div>

						<!-- Input area -->
						<div>
							{#if extImportMode === 'file'}
								<input
									type="file"
									accept=".csv,.txt,.dec"
									bind:this={extImportFileInput}
									onchange={handleExtImportFileSelect}
									disabled={extImportRunning}
									class="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orange-400 hover:file:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
								/>
								{#if extImportSelectedFile}
									<p class="mt-2 text-xs text-slate-500">{extImportSelectedFile.name}</p>
								{/if}
							{:else if extImportMode === 'text'}
								<textarea
									bind:value={extImportText}
									oninput={handleExtImportTextChange}
									disabled={extImportRunning}
									placeholder={m.db_import_text_placeholder()}
									class="h-36 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 font-mono text-sm text-slate-100 placeholder-slate-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50"
								></textarea>
							{:else if extImportMode === 'url'}
								<div class="flex gap-2">
									<input
										type="url"
										bind:value={extImportUrl}
										disabled={extImportRunning || extImportFetching}
										placeholder="https://archidekt.com/decks/..."
										class="field flex-1 disabled:opacity-50"
									/>
									<button
										onclick={handleExtImportUrlFetch}
										disabled={!extImportUrl.trim() || extImportFetching || extImportRunning}
										class="btn btn-quiet disabled:cursor-not-allowed disabled:opacity-50"
									>
										{extImportFetching ? m.db_import_fetching() : m.db_import_fetch()}
									</button>
								</div>
								<p class="mt-2 text-xs text-slate-500">
									{m.db_import_url_note_prefix()}
									<span class="text-slate-400">{URL_IMPORT_HOST}</span>
									{m.db_import_url_note_suffix()}
								</p>
							{/if}
						</div>

						<!-- Preview -->
						{#if extImportPreview}
							<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
								<div class="flex items-center gap-2 text-sm text-slate-300">
									<span class="font-medium"
										>{extImportPreview.cards.length === 1
											? m.db_import_parsed_one({ count: extImportPreview.cards.length })
											: m.db_import_parsed_other({ count: extImportPreview.cards.length })}</span
									>
									{#if extImportPreview.listName}
										<span class="text-slate-500">—</span>
										<span class="text-slate-400">"{extImportPreview.listName}"</span>
									{/if}
								</div>
								{#if extImportPreview.warnings.length > 0}
									<div class="mt-2 space-y-1">
										{#each extImportPreview.warnings as warning, i (i)}
											<p class="text-warning text-xs">{warning}</p>
										{/each}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Error -->
						{#if extImportErr}
							<div
								class="border-danger-edge bg-danger-surface text-danger rounded-lg border p-3 text-sm"
							>
								{extImportErr}
							</div>
						{/if}

						<!-- Results -->
						{#if extImportSummary}
							<div
								class="rounded-lg border {extImportSummary.failed === 0
									? 'border-success-edge bg-success-surface'
									: 'border-warning-edge bg-warning-surface'} p-3"
							>
								<p
									class="text-sm {extImportSummary.failed === 0 ? 'text-success' : 'text-warning'}"
								>
									{#if extImportSummary.failed > 0}
										{extImportSummary.success === 1
											? m.db_import_result_partial_one({
													success: extImportSummary.success,
													failed: extImportSummary.failed
												})
											: m.db_import_result_partial_other({
													success: extImportSummary.success,
													failed: extImportSummary.failed
												})}
									{:else}
										{extImportSummary.success === 1
											? m.db_import_result_ok_one({ success: extImportSummary.success })
											: m.db_import_result_ok_other({ success: extImportSummary.success })}
									{/if}
								</p>
								{#if extImportSummary.notFound.length > 0}
									<details class="mt-2">
										<summary class="cursor-pointer text-xs text-slate-400">
											{extImportSummary.notFound.length === 1
												? m.db_import_not_found_one({ count: extImportSummary.notFound.length })
												: m.db_import_not_found_other({ count: extImportSummary.notFound.length })}
										</summary>
										<ul class="mt-1 max-h-24 space-y-0.5 overflow-y-auto text-xs text-slate-500">
											{#each extImportSummary.notFound as name, i (i)}
												<li>{name}</li>
											{/each}
										</ul>
									</details>
								{/if}
							</div>
						{/if}

						<!-- Import button -->
						{#if !extImportSummary}
							<button
								onclick={handleExtImportRun}
								disabled={extImportRunning ||
									!extImportPreview ||
									extImportPreview.cards.length === 0}
								class="btn btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed"
							>
								{#if extImportRunning}
									<svg
										class="h-4 w-4 animate-spin"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										/>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
									</svg>
									{#if extImportProgress.total > 0}
										{m.db_import_progress({
											current: extImportProgress.current,
											total: extImportProgress.total
										})}
									{:else}
										{m.db_importing()}
									{/if}
								{:else}
									{extImportTarget === 'collection'
										? m.db_import_run_collection()
										: m.db_import_run_list()}
								{/if}
							</button>
						{/if}
					</div>
				{/if}

				<!-- Info Note (always visible) -->
				<div class="mt-6 rounded-lg border border-slate-800 bg-slate-800/50 p-4">
					<p class="text-xs text-slate-400">
						<strong>{m.db_note_label()}</strong>
						{m.db_note_body()}
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Sibling import preview (#91, T3) — one MergePreviewModal per queued file,
     independent of the layout-level instance that drives the linked-file
     external-change flow. -->
<MergePreviewModal
	bind:show={showSiblingPreview}
	fileName={siblingQueue[siblingIndex]?.name ?? ''}
	preview={siblingPreview}
	loading={siblingPreviewLoading}
	error={siblingPreviewError}
	onconfirm={handleSiblingConfirm}
	oncancel={handleSiblingCancel}
/>

<!-- Restore Confirmation — only shown when there is data the restore would replace -->
{#if showRestoreConfirm}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
		onclick={() => (showRestoreConfirm = false)}
		role="dialog"
		aria-modal="true"
		aria-label={m.db_restore_confirm_aria()}
	>
		<div
			class="panel mx-4 w-full max-w-md rounded-xl p-6 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="mb-3 text-lg font-bold text-slate-100">{m.db_restore_confirm_title()}</h3>
			<p class="mb-3 text-sm text-slate-400">
				{m.db_restore_confirm_prefix()}
				<strong class="text-danger">{m.db_restore_replaces()}</strong>
				{m.db_restore_confirm_suffix({
					lists:
						store.savedCardLists.length === 1
							? m.db_count_lists_one({ count: store.savedCardLists.length })
							: m.db_count_lists_other({ count: store.savedCardLists.length }),
					cards:
						store.uniqueOwnedCards === 1
							? m.db_count_collection_one({ count: store.uniqueOwnedCards })
							: m.db_count_collection_other({ count: store.uniqueOwnedCards })
				})}
			</p>
			{#if importPreview}
				<p
					class="mb-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-xs text-slate-400"
				>
					{importPreview}
				</p>
			{/if}
			<p class="mb-5 text-sm text-slate-500">{m.db_restore_confirm_warning()}</p>
			<div class="flex gap-3">
				<button onclick={() => (showRestoreConfirm = false)} class="btn btn-quiet flex-1">
					{m.common_cancel()}
				</button>
				<button onclick={handleLoadFile} class="btn btn-danger flex-1">
					{m.db_restore_confirm_button()}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Create New Database Confirmation -->
{#if showCreateNewConfirm}
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
		onclick={() => (showCreateNewConfirm = false)}
		role="dialog"
		aria-modal="true"
		aria-label={m.db_create_confirm_aria()}
	>
		<div
			class="panel mx-4 w-full max-w-md rounded-xl p-6 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="mb-3 text-lg font-bold text-slate-100">{m.db_create_confirm_title()}</h3>
			<p class="mb-3 text-sm text-slate-400">
				{m.db_create_confirm_prefix()}
				<strong class="text-danger">{m.db_create_confirm_strong()}</strong>
				{m.db_create_confirm_suffix()}
			</p>
			{#if store.linkedFileStatus !== 'none'}
				<p
					class="border-warning-edge bg-warning-surface text-warning mb-3 rounded-lg border p-3 text-sm"
				>
					{m.db_create_confirm_unlink({ name: store.linkedFileName ?? '' })}
				</p>
			{/if}
			<p class="mb-5 text-sm text-slate-500">{m.db_create_confirm_warning()}</p>
			<div class="flex gap-3">
				<button onclick={() => (showCreateNewConfirm = false)} class="btn btn-quiet flex-1">
					{m.common_cancel()}
				</button>
				<button onclick={handleCreateNew} class="btn btn-danger flex-1">
					{m.db_create_confirm_button()}
				</button>
			</div>
		</div>
	</div>
{/if}
