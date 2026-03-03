<script lang="ts">
	import { onMount } from 'svelte';
	let { show = $bindable(false) } = $props();
	import { checkLocalDatabase } from '$lib/db';
	import {
		store,
		initDB,
		peekDB,
		clearDB,
		exportDB,
		loadFromFile,
		isFileSystemAccessSupported,
		linkFile,
		linkExistingFile,
		unlinkFile,
		changeFile,
		reconnectFile
	} from '$lib/store.svelte';

	const fsAccessSupported = isFileSystemAccessSupported();

	let fileInput: HTMLInputElement;
	let localDBexists = $state<boolean | null>(null);
	let selectedFile: File | null = $state(null);
	let isLoadingFile = $state(false);
	let importCurrent = $state(0);
	let importTotal = $state(0);
	let importResult = $state<{ imported: number; merged: number; errors: number } | null>(null);
	let importError = $state<string | null>(null);

	onMount(() => {
		if (store.dbMode === 'none') {
			checkLocalDatabase().then(
				(res) => {
					if (res) {
						peekDB();
						localDBexists = true;
					} else {
						localDBexists = false;
					}
				},
				() => {
					localDBexists = false;
				}
			);
		}
	});

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

	function handleLoadLocal() {
		initDB();
		closeModal();
	}

	function handleExportLocal() {
		const content = exportDB();

		if (!content) return;
		const blob = new Blob([content.buffer as ArrayBuffer], { type: 'application/octet-stream' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = 'document.yjs';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	async function handleCreateNew() {
		if (store.dbMode !== 'none') {
			await clearDB();
			store.dbMode = 'none';
		}
		await initDB();
		closeModal();
	}

	function closeModal() {
		show = false;
		setTimeout(() => null, 300); // Wait for animation
	}
</script>

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
			<div class="bg-gradient-to-r from-orange-900 to-orange-500 px-6 py-4">
				<h2 class="flex items-center gap-2 text-2xl font-bold text-white">
					⚔️ Welcome to LM Deck Tools 🏴‍☠️
				</h2>
				<p class="mt-1 text-sm text-orange-100">Choose how to start your MTG collection</p>
			</div>

			<!-- Content -->
			<div class="space-y-6 p-6">
				<!-- Local Database Option -->
				<div
					class="rounded-xl border-2 border-neutral-800 p-5 transition-colors hover:border-neutral-700"
				>
					<div class="flex items-start gap-4">
						{#if localDBexists === true}
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
										d="M5 13l4 4L19 7"
									></path>
								</svg>
							</div>
						{:else}
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800"
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
										d="M6 18L18 6M6 6l12 12"
									></path>
								</svg>
							</div>
						{/if}
						<div class="flex-1">
							<h3 class="mb-2 text-lg font-semibold text-neutral-100">
								{#if localDBexists === null}
									Searching for local database
								{:else if localDBexists === true}
									Local database found
								{:else}
									Local database not found
								{/if}
							</h3>
							{#if localDBexists === true}
								<div class="mb-4 space-y-2 text-sm text-neutral-400">
									<div class="flex justify-between">
										<span class="font-medium">Total lists:</span>
										<span class="font-mono">{store.savedCardLists.length}</span>
									</div>
									<div class="flex justify-between">
										<span class="font-medium">Total cards:</span>
										<span class="font-mono">{store.totalCards}</span>
									</div>
								</div>
								{#if store.dbMode === 'peek'}
									<div
										class="mb-3 rounded-lg border border-amber-800 bg-amber-950 p-3 text-sm text-amber-400"
									>
										Previewing in read-only mode. Click "Use Local DB" to enable editing.
									</div>
								{/if}
								{#if store.dbMode !== 'active'}
									<button
										onclick={handleLoadLocal}
										class="w-full rounded-lg bg-green-600 px-4 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-green-700"
									>
										Use Local DB
									</button>
								{:else}
									<button
										onclick={handleExportLocal}
										class="w-full rounded-lg bg-green-600 px-4 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-green-700"
									>
										Download local DB
									</button>
								{/if}
							{/if}
						</div>
					</div>
				</div>

				<!-- Import from File Option -->
				<div
					class="rounded-xl border-2 border-neutral-800 p-5 transition-colors hover:border-neutral-700"
				>
					<div class="flex items-start gap-4">
						<div
							class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-neutral-800"
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
							<h3 class="mb-2 text-lg font-semibold text-neutral-100">Import from File</h3>
							<p class="mb-4 text-sm text-neutral-400">
								Import a backup file. Merging with local data is supported.
							</p>
							<input
								type="file"
								accept=".yjs,.json"
								bind:this={fileInput}
								onchange={handleFileSelect}
								disabled={isLoadingFile}
								class="mb-3 block w-full text-sm text-neutral-400 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-orange-400 hover:file:bg-neutral-600 disabled:cursor-not-allowed disabled:opacity-50"
							/>
							{#if selectedFile && !importResult && !importError}
								<p class="mb-3 text-xs text-neutral-400">
									Selected file: {selectedFile.name}
								</p>
							{/if}
							{#if importResult}
								{#if importResult.errors === 0}
									<div
										class="mb-3 rounded-lg border border-green-800 bg-green-950 p-3 text-sm text-green-400"
									>
										Imported {importResult.imported} list{importResult.imported !== 1 ? 's' : ''} successfully.
									</div>
									{#if fsAccessSupported && store.linkedFileStatus === 'none'}
										<div
											class="mb-3 rounded-lg border border-blue-800 bg-blue-950 p-3 text-sm text-blue-300"
										>
											<p class="mb-2">Want to keep this file linked for auto-save?</p>
											<div class="flex gap-2">
												<button
													onclick={async () => {
														await linkExistingFile();
														closeModal();
													}}
													class="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
												>
													Link File...
												</button>
												<button
													onclick={() => closeModal()}
													class="flex-1 rounded-lg bg-neutral-700 px-3 py-1.5 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-600"
												>
													No thanks
												</button>
											</div>
										</div>
									{/if}
								{:else}
									<div
										class="mb-3 rounded-lg border border-amber-800 bg-amber-950 p-3 text-sm text-amber-400"
									>
										Imported {importResult.imported}, failed {importResult.errors}.
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
								class="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
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
										Importing… ({importCurrent}/{importTotal} lists)
									{:else}
										Importing…
									{/if}
								{:else}
									Import File
								{/if}
							</button>
						</div>
					</div>
				</div>

				<!-- Create New Option -->
				<div
					class="rounded-xl border-2 border-neutral-800 p-5 transition-colors hover:border-neutral-700"
				>
					<div class="flex items-start gap-4">
						<div
							class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-900"
						>
							<svg
								class="h-6 w-6 text-purple-400"
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
							<h3 class="mb-2 text-lg font-semibold text-neutral-100">Start from scratch</h3>
							<p class="mb-4 text-sm text-neutral-400">
								Create a new empty database. {#if localDBexists}The local database will be kept but
									not used.{/if}
							</p>
							<button
								onclick={handleCreateNew}
								class="w-full rounded-lg bg-purple-600 px-4 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-purple-700"
							>
								Create New Database
							</button>
						</div>
					</div>
				</div>

				<!-- Linked File Option (File System Access API) -->
				{#if fsAccessSupported}
					<div
						class="rounded-xl border-2 border-neutral-800 p-5 transition-colors hover:border-neutral-700"
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
									class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-900"
								>
									<svg
										class="h-6 w-6 text-blue-400"
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
									<h3 class="mb-2 text-lg font-semibold text-neutral-100">
										Link a File (Bring Your Own Cloud)
									</h3>
									<p class="mb-3 text-sm text-neutral-400">
										Save your data to a file on disk. Place it in a cloud-synced folder (Dropbox,
										iCloud, OneDrive) for cross-device sync with zero server involvement.
									</p>
									<p class="mb-4 text-xs text-neutral-500">
										Supported in Chrome 86+, Edge 86+, and Safari 15.2+. Not available in Firefox.
									</p>
									<div class="flex gap-2">
										<button
											onclick={() => linkFile()}
											disabled={store.dbMode !== 'active'}
											class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
										>
											New File...
										</button>
										<button
											onclick={() => linkExistingFile()}
											disabled={store.dbMode !== 'active'}
											class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-500"
										>
											Existing File...
										</button>
									</div>
								{:else if store.linkedFileStatus === 'active'}
									<h3 class="mb-2 text-lg font-semibold text-neutral-100">
										Linked: {store.linkedFileName}
									</h3>
									{#if store.linkedFileLastSaved}
										<p class="mb-3 text-sm text-neutral-400">
											Last saved: {new Date(store.linkedFileLastSaved).toLocaleString()}
										</p>
									{/if}
									<p class="mb-4 text-sm text-neutral-400">
										Changes are automatically saved to this file.
									</p>
									<div class="flex gap-2">
										<button
											onclick={() => changeFile()}
											class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700"
										>
											Change File...
										</button>
										<button
											onclick={() => unlinkFile()}
											class="flex-1 rounded-lg bg-neutral-700 px-4 py-2 font-medium text-neutral-300 shadow-sm transition-colors duration-200 hover:bg-neutral-600"
										>
											Unlink
										</button>
									</div>
								{:else if store.linkedFileStatus === 'reconnect'}
									<h3 class="mb-2 text-lg font-semibold text-neutral-100">
										File link needs reconnection
									</h3>
									<p class="mb-4 text-sm text-neutral-400">
										The browser needs your permission to access "{store.linkedFileName}" again.
										Click Reconnect to re-grant access.
									</p>
									<div class="flex gap-2">
										<button
											onclick={() => reconnectFile()}
											class="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-amber-700"
										>
											Reconnect
										</button>
										<button
											onclick={() => unlinkFile()}
											class="flex-1 rounded-lg bg-neutral-700 px-4 py-2 font-medium text-neutral-300 shadow-sm transition-colors duration-200 hover:bg-neutral-600"
										>
											Unlink
										</button>
									</div>
								{:else if store.linkedFileStatus === 'not-found'}
									<h3 class="mb-2 text-lg font-semibold text-neutral-100">Linked file not found</h3>
									<p class="mb-4 text-sm text-neutral-400">
										The previously linked file "{store.linkedFileName}" could not be found. It may
										have been moved or deleted.
									</p>
									<div class="flex gap-2">
										<button
											onclick={() => linkFile()}
											class="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700"
										>
											Link New File...
										</button>
										<button
											onclick={() => unlinkFile()}
											class="flex-1 rounded-lg bg-neutral-700 px-4 py-2 font-medium text-neutral-300 shadow-sm transition-colors duration-200 hover:bg-neutral-600"
										>
											Unlink
										</button>
									</div>
								{:else if store.linkedFileStatus === 'write-error'}
									<h3 class="mb-2 text-lg font-semibold text-neutral-100">File write error</h3>
									{#if store.linkedFileError}
										<p
											class="mb-3 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-400"
										>
											{store.linkedFileError}
										</p>
									{/if}
									<p class="mb-4 text-sm text-neutral-400">
										Failed to write to "{store.linkedFileName}". The file may be locked or
										inaccessible.
									</p>
									<div class="flex gap-2">
										<button
											onclick={() => reconnectFile()}
											class="flex-1 rounded-lg bg-amber-600 px-4 py-2 font-medium text-white shadow-sm transition-colors duration-200 hover:bg-amber-700"
										>
											Retry
										</button>
										<button
											onclick={() => unlinkFile()}
											class="flex-1 rounded-lg bg-neutral-700 px-4 py-2 font-medium text-neutral-300 shadow-sm transition-colors duration-200 hover:bg-neutral-600"
										>
											Unlink
										</button>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}

				<!-- Info Note -->
				<div class="rounded-lg border border-neutral-800 bg-neutral-800/50 p-4">
					<p class="text-xs text-neutral-400">
						<strong>Note:</strong> You can always export or import your data later using the application
						controls.
					</p>
				</div>
			</div>
		</div>
	</div>
{/if}
