<script lang="ts">
	import { onMount } from 'svelte';
	let { show = $bindable(false) } = $props();
	import { checkLocalDatabase } from '$lib/db';
	import { getImageCacheStats, clearImageCache } from '$lib/image-cache';
	import {
		store,
		initDB,
		peekDB,
		clearDB,
		exportDB,
		loadFromFile,
		exportCollectionToText,
		isFileSystemAccessSupported,
		linkFile,
		linkExistingFile,
		unlinkFile,
		changeFile,
		reconnectFile,
		retryWrite,
		saveNow,
		importCardsToCollection,
		importCardsToNewList
	} from '$lib/store.svelte';
	import { parseImportInput } from '$lib/import-parser';
	import type { ParseResult } from '$lib/import-parser';
	import { fetchDeckFromUrl, URL_IMPORT_HOST } from '$lib/import-url';

	const fsAccessSupported = isFileSystemAccessSupported();

	type Section = 'localdb' | 'link' | 'cache' | 'import' | 'export';
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
		if (delta < 60) return 'just now';
		const mins = Math.floor(delta / 60);
		if (mins < 60) return `${mins} min ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	let lastSavedText = $derived(
		store.linkedFileWriting
			? 'Saving…'
			: store.linkedFileLastSaved
				? `Last saved: ${formatRelativeTime(store.linkedFileLastSaved)}`
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
	let imageCacheCount = $state(0);
	let isClearingCache = $state(false);
	let showCreateNewConfirm = $state(false);

	function computeDefaultSection(): Section {
		if (store.dbMode === 'none' || store.dbMode === 'peek') {
			return 'localdb';
		}
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

	onMount(() => {
		getImageCacheStats().then((stats) => {
			imageCacheCount = stats.count;
		});
		clockInterval = setInterval(() => {
			now = Date.now();
		}, 60_000);
		if (store.dbMode === 'none') {
			checkLocalDatabase().then(
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

	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
		}
	}

	async function handleLoadFile() {
		if (!selectedFile) return;
		isLoadingFile = true;
		importCurrent = 0;
		importTotal = 0;
		importResult = null;
		importError = null;
		try {
			const result = await loadFromFile(selectedFile, (current, total) => {
				importCurrent = current;
				importTotal = total;
			});
			importResult = result;
			if (result.errors === 0 && !(fsAccessSupported && store.linkedFileStatus === 'none')) {
				setTimeout(() => closeModal(), 1500);
			}
		} catch (e) {
			console.error('Failed to import file:', e);
			importError = e instanceof Error ? e.message : 'Failed to import file';
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
				extImportErr = 'Could not read file';
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
			extImportErr = e instanceof Error ? e.message : 'Failed to fetch deck';
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
			const listName = extImportPreview.listName || 'Imported List';
			if (extImportTarget === 'collection') {
				extImportSummary = await importCardsToCollection(cards, progressCb);
			} else {
				extImportSummary = await importCardsToNewList(cards, listName, progressCb);
			}
		} catch (e) {
			extImportErr = e instanceof Error ? e.message : 'Import failed';
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

	function handleExportBackup() {
		isExportingBackup = true;
		exportBackupSuccess = false;
		try {
			const data = exportDB();
			const blob = new Blob([new Uint8Array(data)], { type: 'application/octet-stream' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			const timestamp = new Date().toISOString().slice(0, 10);
			link.download = `lm-decktools-backup-${timestamp}.yjs`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			exportBackupSuccess = true;
		} catch (e) {
			console.error('Failed to export backup:', e);
		} finally {
			isExportingBackup = false;
		}
	}

	// CSV collection export state
	const csvFieldOptions = [
		{ label: 'Count', value: 'Count' },
		{ label: 'Name', value: 'Name' },
		{ label: 'Edition', value: 'Edition' },
		{ label: 'Collector #', value: 'Collector Number' },
		{ label: 'Foil', value: 'Foil' },
		{ label: 'Language', value: 'Language' },
		{ label: 'Scryfall ID', value: 'Scryfall ID' }
	];
	let csvSelectedFields = $state(['Count', 'Name', 'Edition']);
	let csvText = $derived.by(() => exportCollectionToText(csvSelectedFields));

	function handleCsvCopy() {
		navigator.clipboard.writeText(csvText);
	}

	function handleCsvDownload() {
		if (!csvText) return;
		const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'mtg_collection_export.csv';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	function closeModal() {
		show = false;
		setTimeout(() => null, 300); // Wait for animation
	}
</script>

<!-- What the database actually holds: lists plus the collection -->
{#snippet dbContentStats()}
	<div class="flex justify-between">
		<span class="font-medium">Card lists:</span>
		<span class="font-mono" data-testid="db-stat-lists">{store.savedCardLists.length}</span>
	</div>
	<div class="flex justify-between">
		<span class="font-medium">Cards in lists:</span>
		<span class="font-mono" data-testid="db-stat-list-cards">{store.totalListCards}</span>
	</div>
	<div class="flex justify-between">
		<span class="font-medium">Collection cards:</span>
		<span class="font-mono" data-testid="db-stat-collection"
			>{store.totalOwnedCards} ({store.uniqueOwnedCards} unique)</span
		>
	</div>
{/snippet}

{#if show}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300"
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
		<div
			class="panel mx-4 w-full max-w-2xl transform overflow-hidden rounded-2xl shadow-2xl transition-all duration-300"
			class:scale-100={show}
			class:scale-95={!show}
		>
			<!-- Header -->
			<div
				class="flex items-center gap-4 border-b border-orange-500/[0.12] bg-gradient-to-br from-orange-500/[0.12] to-transparent px-6 py-5"
			>
				<!-- Jolly Roger — replaces the two stray emoji the design system flagged -->
				<svg
					class="h-10 w-10 shrink-0 text-orange-400"
					viewBox="0 0 100 100"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<g opacity="0.6">
						<path
							d="M50 2C32 2 20 15 20 30c0 10 5 18 12 23v7h36v-7c7-5 12-13 12-23C80 15 68 2 50 2z"
						/>
						<circle cx="39" cy="28" r="5.5" fill="currentColor" />
						<circle cx="61" cy="28" r="5.5" fill="currentColor" />
						<path d="M50 40v3" />
						<path d="M36 49h28" />
					</g>
					<g transform="rotate(-20, 50, 88)">
						<rect x="32" y="48" width="28" height="40" rx="3" fill="#0f1218" stroke-width="2" />
					</g>
					<g transform="rotate(20, 50, 88)">
						<rect x="40" y="48" width="28" height="40" rx="3" fill="#0f1218" stroke-width="2" />
					</g>
				</svg>
				<div>
					<h2 class="text-2xl font-extrabold tracking-tight text-white">
						Welcome to LM Deck Tools
					</h2>
					<p class="mt-0.5 text-sm text-slate-400">Choose how to start your MTG collection</p>
				</div>
			</div>

			<!-- Toolbar -->
			<div class="flex gap-1 border-b border-orange-500/[0.08] bg-slate-900 px-4 py-2">
				<button
					onclick={() => toggleSection('localdb')}
					aria-expanded={activeSection === 'localdb'}
					class="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors
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
					In-browser DB
				</button>
				<button
					onclick={() => {
						toggleSection('link');
						exportBackupSuccess = false;
					}}
					disabled={store.dbMode !== 'active'}
					aria-expanded={activeSection === 'link'}
					class="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors
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
					Link File
				</button>
				<button
					onclick={() => toggleSection('cache')}
					aria-expanded={activeSection === 'cache'}
					class="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors
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
					Cache
				</button>
				<button
					onclick={() => {
						toggleSection('import');
						resetExtImport();
					}}
					disabled={store.dbMode !== 'active'}
					aria-expanded={activeSection === 'import'}
					class="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors
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
					Import
				</button>
				<button
					onclick={() => toggleSection('export')}
					disabled={store.dbMode !== 'active'}
					aria-expanded={activeSection === 'export'}
					class="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs transition-colors
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
					Export
				</button>
			</div>

			<!-- Content -->
			<div class="max-h-[60vh] overflow-y-auto p-6">
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
											Searching for local database
										{:else}
											Local database found
										{/if}
									</h3>
									<div class="mb-4 space-y-2 text-sm text-slate-400">
										{@render dbContentStats()}
									</div>
									{#if store.dbMode === 'peek'}
										<div
											class="mb-3 rounded-lg border border-amber-800 bg-amber-950 p-3 text-sm text-amber-400"
										>
											Previewing in read-only mode. Click "Connect" to enable editing.
										</div>
									{/if}
									<button onclick={handleLoadLocal} class="btn btn-subtle w-full">
										Connect to local DB
									</button>
								</div>
							</div>
						</div>
					{/if}

					<!-- DB info when active -->
					{#if store.dbMode === 'active'}
						<div class="rounded-xl border-2 border-green-800 p-5">
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
									<h3 class="mb-2 text-lg font-semibold text-slate-100">Local database active</h3>
									<div class="space-y-2 text-sm text-slate-400">
										{@render dbContentStats()}
									</div>
								</div>
							</div>
						</div>
					{/if}

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
								<h3 class="mb-2 text-lg font-semibold text-slate-100">Start from scratch</h3>
								<p class="mb-4 text-sm text-slate-400">
									Create a new empty database. All existing data will be cleared.
								</p>
								<button
									onclick={() => (showCreateNewConfirm = true)}
									class="btn btn-primary w-full"
								>
									Create New Database
								</button>
							</div>
						</div>
					</div>
				{/if}

				<!-- Export Section (CSV collection export) -->
				{#if activeSection === 'export'}
					<div class="space-y-4">
						<p class="text-sm text-slate-400">
							Export your collection as CSV to share with other tools and services.
						</p>

						<div>
							<label class="mb-2 block text-sm font-semibold text-slate-300">Include Fields:</label>
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

						<textarea
							value={csvText}
							readonly
							class="h-64 w-full rounded-lg border border-slate-700 bg-slate-800 p-3 font-mono text-sm text-slate-300"
							placeholder="Select fields to generate preview..."
						></textarea>

						<div class="flex gap-3">
							<button
								onclick={handleCsvDownload}
								disabled={!csvText}
								class="btn btn-primary flex-1 disabled:cursor-not-allowed sm:flex-none"
							>
								Download File
							</button>
							<button
								onclick={handleCsvCopy}
								disabled={!csvText}
								class="btn btn-quiet disabled:cursor-not-allowed disabled:opacity-50"
							>
								Copy to Clipboard
							</button>
						</div>
					</div>
				{/if}

				<!-- Linked File Section -->
				{#if activeSection === 'link'}
					{#if fsAccessSupported}
						<!-- Auto-save link controls -->
						<div
							class="rounded-xl border border-orange-500/[0.08] p-5 transition-colors hover:border-orange-500/20"
						>
							<div class="flex items-start gap-4">
								{#if store.linkedFileStatus === 'active'}
									<div
										class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-900"
									>
										<svg
											class="h-6 w-6 text-green-400"
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
										class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-900"
									>
										<svg
											class="h-6 w-6 text-amber-400"
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
										class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900"
									>
										<svg
											class="h-6 w-6 text-red-400"
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
										<h3 class="mb-2 text-lg font-semibold text-slate-100">
											Link a File (Bring Your Own Cloud)
										</h3>
										<p class="mb-3 text-sm text-slate-400">
											Save your data to a file on disk. Place it in a cloud-synced folder (Dropbox,
											iCloud, OneDrive) for cross-device sync with zero server involvement.
										</p>
										<div class="flex gap-2">
											<button
												onclick={() => linkFile()}
												disabled={store.dbMode !== 'active'}
												class="btn btn-subtle flex-1 disabled:cursor-not-allowed"
											>
												New File...
											</button>
											<button
												onclick={() => linkExistingFile()}
												disabled={store.dbMode !== 'active'}
												class="btn btn-subtle flex-1 disabled:cursor-not-allowed"
											>
												Existing File...
											</button>
										</div>
									{:else if store.linkedFileStatus === 'active'}
										<h3 class="mb-2 text-lg font-semibold text-slate-100">
											Linked: {store.linkedFileName}
										</h3>
										{#if lastSavedText}
											<p class="mb-3 text-sm text-slate-400">
												{lastSavedText}
											</p>
										{/if}
										<p class="mb-4 text-sm text-slate-400">
											Changes are automatically saved to this file.
										</p>
										<div class="flex gap-2">
											<button
												onclick={() => saveNow()}
												disabled={store.linkedFileWriting}
												class="btn btn-subtle flex-1 disabled:cursor-not-allowed"
											>
												{store.linkedFileWriting ? 'Saving…' : 'Save Now'}
											</button>
											<button onclick={() => changeFile()} class="btn btn-subtle flex-1">
												Change File...
											</button>
											<button onclick={() => unlinkFile()} class="btn btn-quiet flex-1">
												Unlink
											</button>
										</div>
									{:else if store.linkedFileStatus === 'reconnect'}
										<h3 class="mb-2 text-lg font-semibold text-slate-100">
											File link needs reconnection
										</h3>
										<p class="mb-4 text-sm text-slate-400">
											The browser needs your permission to access "{store.linkedFileName}" again.
											Click Reconnect to re-grant access.
										</p>
										{#if store.linkedFilePermissionDenied}
											<p
												class="mb-3 rounded-lg border border-amber-800 bg-amber-950 p-3 text-sm text-amber-400"
											>
												Permission was denied. Reload the page to try again, or grant access in your
												browser settings.
											</p>
										{/if}
										<div class="flex gap-2">
											<button
												onclick={() => reconnectFile()}
												disabled={store.linkedFilePermissionDenied}
												class="btn btn-subtle flex-1 disabled:cursor-not-allowed"
											>
												Reconnect
											</button>
											<button onclick={() => unlinkFile()} class="btn btn-quiet flex-1">
												Unlink
											</button>
										</div>
									{:else if store.linkedFileStatus === 'not-found'}
										<h3 class="mb-2 text-lg font-semibold text-slate-100">Linked file not found</h3>
										<p class="mb-3 text-sm text-slate-400">
											File not found — "{store.linkedFileName}" could not be located.
										</p>
										<p class="mb-4 text-sm text-green-400">Your data is safe in the browser.</p>
										<button onclick={() => unlinkFile()} class="btn btn-quiet"> Unlink </button>
									{:else if store.linkedFileStatus === 'write-error'}
										<h3 class="mb-2 text-lg font-semibold text-slate-100">File write error</h3>
										{#if store.linkedFileError}
											<p
												class="mb-3 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-400"
											>
												{store.linkedFileError}
											</p>
										{/if}
										<p class="mb-3 text-sm text-slate-400">
											Failed to write to "{store.linkedFileName}". The file may be locked or
											inaccessible.
										</p>
										<p class="mb-4 text-sm text-green-400">Your data is safe in the browser.</p>
										<div class="flex gap-2">
											<button onclick={() => retryWrite()} class="btn btn-subtle flex-1">
												Retry
											</button>
											<button onclick={() => unlinkFile()} class="btn btn-quiet flex-1">
												Unlink
											</button>
										</div>
									{/if}
								</div>
							</div>
						</div>

						<!-- Separator -->
						<div class="my-4 border-t border-orange-500/[0.08]"></div>
					{/if}

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
								<h3 class="mb-2 text-lg font-semibold text-slate-100">Download copy</h3>
								<p class="mb-4 text-sm text-slate-400">
									Download a full copy of your database (collection + all card lists).
								</p>
								{#if exportBackupSuccess}
									<div
										class="mb-3 rounded-lg border border-green-800 bg-green-950 p-3 text-sm text-green-400"
									>
										Download started.
									</div>
								{/if}
								<button
									onclick={handleExportBackup}
									disabled={isExportingBackup}
									class="btn btn-subtle flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed"
								>
									{isExportingBackup ? 'Preparing…' : 'Download .yjs file'}
								</button>
							</div>
						</div>
					</div>

					{#if !fsAccessSupported}
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
									<h3 class="mb-2 text-lg font-semibold text-slate-100">Restore from file</h3>
									<p class="mb-4 text-sm text-slate-400">
										Restore your database from a previously downloaded copy. This replaces all
										current data.
									</p>
									<input
										type="file"
										accept=".yjs,.json"
										bind:this={fileInput}
										onchange={handleFileSelect}
										disabled={isLoadingFile}
										class="mb-3 block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orange-400 hover:file:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
									/>
									{#if selectedFile && !importResult && !importError}
										<p class="mb-3 text-xs text-slate-400">
											Selected file: {selectedFile.name}
										</p>
									{/if}
									{#if importResult}
										{#if importResult.errors === 0}
											<div
												class="mb-3 rounded-lg border border-green-800 bg-green-950 p-3 text-sm text-green-400"
											>
												Restored {importResult.imported} list{importResult.imported !== 1
													? 's'
													: ''} successfully.
											</div>
										{:else}
											<div
												class="mb-3 rounded-lg border border-amber-800 bg-amber-950 p-3 text-sm text-amber-400"
											>
												Restored {importResult.imported}, failed {importResult.errors}.
											</div>
										{/if}
									{/if}
									{#if importError}
										<div
											class="mb-3 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-400"
										>
											{importError}
										</div>
									{/if}
									<button
										onclick={handleLoadFile}
										disabled={!selectedFile || isLoadingFile || importResult !== null}
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
												Restoring… ({importCurrent}/{importTotal} lists)
											{:else}
												Restoring…
											{/if}
										{:else}
											Restore from file
										{/if}
									</button>
								</div>
							</div>
						</div>

						<p class="mt-4 text-xs text-slate-500">
							Auto-save to a linked file requires Chrome 86+, Edge 86+, or Safari 15.2+.
						</p>
					{/if}
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
								<h3 class="mb-2 text-lg font-semibold text-slate-100">Image Cache</h3>
								<p class="mb-3 text-sm text-slate-400">
									Card images are cached locally for faster loading.
								</p>
								<div class="mb-4 space-y-2 text-sm text-slate-400">
									<div class="flex justify-between">
										<span class="font-medium">Cached images:</span>
										<span class="font-mono">{imageCacheCount}</span>
									</div>
								</div>
								<button
									onclick={async () => {
										isClearingCache = true;
										await clearImageCache();
										imageCacheCount = 0;
										isClearingCache = false;
									}}
									disabled={isClearingCache || imageCacheCount === 0}
									class="btn btn-quiet w-full disabled:cursor-not-allowed disabled:opacity-50"
								>
									{isClearingCache ? 'Clearing…' : 'Clear Image Cache'}
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
							<label class="mb-2 block text-sm font-medium text-slate-400">Source</label>
							<div class="flex gap-1">
								{#each [{ value: 'file', label: 'File' }, { value: 'text', label: 'Paste' }, { value: 'url', label: 'URL' }] as opt (opt.value)}
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
							<label class="mb-2 block text-sm font-medium text-slate-400">Import into</label>
							<div class="flex gap-1">
								<button
									onclick={() => (extImportTarget = 'list')}
									class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors
										{extImportTarget === 'list'
										? 'bg-orange-500 text-slate-950'
										: 'bg-slate-800 text-slate-400 hover:text-slate-200'}"
								>
									New List
								</button>
								<button
									onclick={() => (extImportTarget = 'collection')}
									class="flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors
										{extImportTarget === 'collection'
										? 'bg-orange-500 text-slate-950'
										: 'bg-slate-800 text-slate-400 hover:text-slate-200'}"
								>
									Collection
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
									placeholder="4 Lightning Bolt&#10;2 Counterspell&#10;&#10;Or paste CSV data..."
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
										{extImportFetching ? 'Fetching…' : 'Fetch'}
									</button>
								</div>
								<p class="mt-2 text-xs text-slate-500">
									Supported: Archidekt (public decks). Fetching sends a request to <span
										class="text-slate-400">{URL_IMPORT_HOST}</span
									> carrying the deck ID; no other data leaves your device. Any other site: export the
									deck as a file and use the File tab.
								</p>
							{/if}
						</div>

						<!-- Preview -->
						{#if extImportPreview}
							<div class="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
								<div class="flex items-center gap-2 text-sm text-slate-300">
									<span class="font-medium"
										>{extImportPreview.cards.length} card{extImportPreview.cards.length !== 1
											? 's'
											: ''} parsed</span
									>
									{#if extImportPreview.listName}
										<span class="text-slate-500">—</span>
										<span class="text-slate-400">"{extImportPreview.listName}"</span>
									{/if}
								</div>
								{#if extImportPreview.warnings.length > 0}
									<div class="mt-2 space-y-1">
										{#each extImportPreview.warnings as warning, i (i)}
											<p class="text-xs text-amber-400">{warning}</p>
										{/each}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Error -->
						{#if extImportErr}
							<div class="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-400">
								{extImportErr}
							</div>
						{/if}

						<!-- Results -->
						{#if extImportSummary}
							<div
								class="rounded-lg border {extImportSummary.failed === 0
									? 'border-green-800 bg-green-950'
									: 'border-amber-800 bg-amber-950'} p-3"
							>
								<p
									class="text-sm {extImportSummary.failed === 0
										? 'text-green-400'
										: 'text-amber-400'}"
								>
									Imported {extImportSummary.success} card{extImportSummary.success !== 1
										? 's'
										: ''}{extImportSummary.failed > 0
										? `, ${extImportSummary.failed} failed`
										: ' successfully'}.
								</p>
								{#if extImportSummary.notFound.length > 0}
									<details class="mt-2">
										<summary class="cursor-pointer text-xs text-slate-400">
											{extImportSummary.notFound.length} card{extImportSummary.notFound.length !== 1
												? 's'
												: ''} not found on Scryfall
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
										Importing… ({extImportProgress.current}/{extImportProgress.total} batches)
									{:else}
										Importing…
									{/if}
								{:else}
									Import {extImportTarget === 'collection' ? 'to Collection' : 'as New List'}
								{/if}
							</button>
						{/if}
					</div>
				{/if}

				<!-- Info Note (always visible) -->
				<div class="mt-6 rounded-lg border border-slate-800 bg-slate-800/50 p-4">
					<p class="text-xs text-slate-400">
						<strong>Note:</strong> You can always export or import your data later using the application
						controls.
					</p>
				</div>
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
		aria-label="Confirm new database"
	>
		<div
			class="panel mx-4 w-full max-w-md rounded-xl p-6 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="mb-3 text-lg font-bold text-slate-100">Create new database?</h3>
			<p class="mb-3 text-sm text-slate-400">
				This will <strong class="text-red-400">permanently delete</strong> all your current data — card
				lists, collection, and settings.
			</p>
			{#if store.linkedFileStatus !== 'none'}
				<p class="mb-3 rounded-lg border border-amber-800 bg-amber-950 p-3 text-sm text-amber-400">
					Your linked file "{store.linkedFileName}" will be unlinked. The file itself won't be
					deleted, but it will no longer sync with the app.
				</p>
			{/if}
			<p class="mb-5 text-sm text-slate-500">
				This action cannot be undone. Make sure you have a backup if needed.
			</p>
			<div class="flex gap-3">
				<button onclick={() => (showCreateNewConfirm = false)} class="btn btn-quiet flex-1">
					Cancel
				</button>
				<button onclick={handleCreateNew} class="btn btn-danger flex-1">
					Delete and Create New
				</button>
			</div>
		</div>
	</div>
{/if}
