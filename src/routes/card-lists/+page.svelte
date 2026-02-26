<script lang="ts">
	import NotificationToast from '$lib/components/NotificationToast.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SearchResults from '$lib/components/SearchResults.svelte';
	import CardListCard from './CardListCard.svelte';
	import {
		store,
		createNewCardList,
		deleteCardList,
		addCardToList,
		removeCardFromList,
		importListFromText,
		exportListToText,
		updateListParams
	} from '$lib/store.svelte';

	const READ_ONLY_MSG = 'Select a database to enable editing — click "Preview" in the header';

	let searchResults = $state<any[]>([]);
	let isSearching = $state(false);
	let showNotification = $state(false);
	let notificationMessage = $state('');
	let showImportModal = $state(false);
	let isImporting = $state(false);
	let importCurrent = $state(0);
	let importTotal = $state(0);
	let showExportModal = $state(false);
	let showAddCardsModal = $state(false);
	let showDeleteConfirmModal = $state(false);
	let importText = $state('');
	let exportText = $state('');
	let filterText = $state('');
	let sortBy = $state('name');

	async function queryScryfall(querystring: string) {
		if (!querystring.trim()) return;
		isSearching = true;
		const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(querystring)}`;
		const headers = { 'User-Agent': 'LMdecktools/0.1', Accept: '*/*' };
		try {
			const response = await fetch(url, { headers });
			if (response.ok) {
				const json = await response.json();
				searchResults = json.data;
			} else {
				searchResults = [];
				notify('No results found', 'error');
			}
		} catch (error) {
			console.error(error);
			notify('Search failed', 'error');
		} finally {
			isSearching = false;
		}
	}

	async function handleAddCard(card: any) {
		try {
			await addCardToList(card);
			notify(`Added ${card.name} to list`);
		} catch (error) {
			console.error('Failed to add card:', error);
			notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to add card', 'error');
		}
	}

	async function handleRemoveCard(card: any) {
		try {
			await removeCardFromList(card);
			notify(`Removed ${card.name} from list`);
		} catch (error) {
			console.error('Failed to remove card:', error);
			notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to remove card', 'error');
		}
	}

	async function handleCreateList() {
		try {
			await createNewCardList();
			notify('New list created');
		} catch (error) {
			console.error('Failed to create list:', error);
			notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to create list', 'error');
		}
	}

	async function handleDeleteList() {
		try {
			await deleteCardList();
			showDeleteConfirmModal = false;
			notify('List deleted');
		} catch (error) {
			console.error('Failed to delete list:', error);
			showDeleteConfirmModal = false;
			notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to delete list', 'error');
		}
	}

	function handleSwitchList(index: number) {
		store.currentCardListIndex = index;
	}

	async function handleImport() {
		isImporting = true;
		importCurrent = 0;
		importTotal = 0;
		try {
			await importListFromText(importText, (current, total) => {
				importCurrent = current;
				importTotal = total;
			});
			showImportModal = false;
			importText = '';
			notify('List imported');
		} catch (error) {
			console.error('Import failed:', error);
			notify(store.isReadOnly ? READ_ONLY_MSG : 'Import failed', 'error');
		} finally {
			isImporting = false;
		}
	}

	function handleExport() {
		exportText = exportListToText();
		showExportModal = true;
	}

	async function handleCardMatchingChange(value: 'generic' | 'specific') {
		try {
			await updateListParams({ cardMatching: value });
		} catch (e) {
			if (store.isReadOnly) {
				notify(READ_ONLY_MSG, 'error');
			} else {
				console.error('Failed to update card matching', e);
			}
		}
	}

	async function handleLanguageMatchingChange(value: 'any' | 'strict') {
		try {
			await updateListParams({ languageMatching: value });
		} catch (e) {
			if (store.isReadOnly) {
				notify(READ_ONLY_MSG, 'error');
			} else {
				console.error('Failed to update language matching', e);
			}
		}
	}

	function notify(message: string, _type = 'success') {
		notificationMessage = message;
		showNotification = true;
		setTimeout(() => {
			showNotification = false;
		}, 3000);
	}

	let ownershipCheck = $derived(store.listOwnershipCheck);
	let missingCount = $derived(ownershipCheck.cards.filter((r) => !r.owned).length);

	let filteredListCards = $derived(
		ownershipCheck.cards
			.filter(
				({ card }) =>
					filterText === '' ||
					card.name.toLowerCase().includes(filterText.toLowerCase()) ||
					(card.set_name ?? '').toLowerCase().includes(filterText.toLowerCase())
			)
			.sort((a: { card: any; owned: boolean }, b: { card: any; owned: boolean }) => {
				if (sortBy === 'name') return a.card.name.localeCompare(b.card.name);
				if (sortBy === 'quantity') return b.card.LM_quantity - a.card.LM_quantity;
				if (sortBy === 'set') return (a.card.set_name ?? '').localeCompare(b.card.set_name ?? '');
				return 0;
			})
	);
</script>

<NotificationToast bind:show={showNotification} message={notificationMessage} />

<!-- Add Cards Modal -->
{#if showAddCardsModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showAddCardsModal = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Add Cards to List"
	>
		<div
			class="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between border-b border-orange-100 p-6">
				<h2 class="text-2xl font-bold text-orange-900">Add Cards to List</h2>
				<button
					onclick={() => (showAddCardsModal = false)}
					class="rounded-lg p-2 transition hover:bg-orange-100"
					title="Close"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</div>
			<div class="max-h-[calc(90vh-80px)] space-y-4 overflow-y-auto p-6">
				<SearchBar {isSearching} resultCount={searchResults.length} onSearch={queryScryfall} />
				<SearchResults
					{isSearching}
					results={searchResults}
					onAddCard={handleAddCard}
					target="cardList"
				/>
			</div>
		</div>
	</div>
{/if}

<!-- Import Modal -->
{#if showImportModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showImportModal = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Import List"
	>
		<div
			class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-4 text-xl font-bold text-orange-900">Import List</h2>
			<p class="mb-3 text-sm text-stone-500">Paste a card list in standard format:</p>
			<textarea
				bind:value={importText}
				disabled={isImporting}
				placeholder="# List Name&#10;4 Lightning Bolt&#10;2 Mountain"
				class="h-48 w-full rounded-lg border border-orange-300 p-3 font-mono text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
			></textarea>
			<div class="mt-4 flex justify-end gap-2">
				<button
					onclick={() => (showImportModal = false)}
					disabled={isImporting}
					class="rounded-lg border border-orange-300 px-4 py-2 text-stone-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					onclick={handleImport}
					disabled={isImporting}
					class="flex items-center gap-2 rounded-lg bg-orange-700 px-4 py-2 text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-75"
				>
					{#if isImporting}
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
						{importTotal > 0 ? `Importing… (${importCurrent}/${importTotal})` : 'Importing…'}
					{:else}
						Load List
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showDeleteConfirmModal = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Confirm delete list"
	>
		<div
			class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-3 text-xl font-bold text-red-700">Delete List</h2>
			<p class="mb-1 text-stone-700">
				Are you sure you want to delete <strong>{store.currentCardList?.name}</strong>?
			</p>
			<p class="mb-6 text-sm text-stone-500">This action cannot be undone.</p>
			<div class="flex justify-end gap-2">
				<button
					onclick={() => (showDeleteConfirmModal = false)}
					class="rounded-lg border border-orange-300 px-4 py-2 text-stone-700 transition hover:bg-orange-50"
				>
					Cancel
				</button>
				<button
					onclick={handleDeleteList}
					class="rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
				>
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Export Modal -->
{#if showExportModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showExportModal = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Export List"
	>
		<div
			class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-4 text-xl font-bold text-orange-900">Export List</h2>
			<pre
				data-testid="export-text"
				class="h-48 w-full overflow-auto rounded-lg border border-orange-300 bg-orange-50 p-3 font-mono text-sm whitespace-pre-wrap">{exportText}</pre>
			<div class="mt-4 flex justify-end gap-2">
				<button
					onclick={() => navigator.clipboard.writeText(exportText).then(() => notify('Copied!'))}
					class="rounded-lg border border-orange-300 px-4 py-2 text-stone-700 transition hover:bg-orange-50"
				>
					Copy
				</button>
				<button
					onclick={() => (showExportModal = false)}
					class="rounded-lg bg-orange-700 px-4 py-2 text-white transition hover:bg-orange-800"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="min-h-screen bg-orange-50">
	<div class="mx-auto max-w-7xl p-4">
		<!-- Header -->
		<div class="mb-6 rounded-lg border border-orange-100 bg-white p-6 shadow-lg">
			<!-- Row 1: Lists label + dropdown + New List button -->
			<div class="mb-4 flex flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<span class="text-lg font-semibold text-stone-600">Lists</span>
					<select
						onchange={(e) =>
							handleSwitchList(parseInt((e.currentTarget as HTMLSelectElement).value))}
						disabled={!store.dbLoaded || store.savedCardLists.length === 0}
						class="min-w-[200px] rounded-lg border border-orange-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if store.savedCardLists.length === 0}
							<option value={-1}>No lists</option>
						{:else}
							{#each store.savedCardLists as cardList, i (cardList.id ?? i)}
								<option value={i} selected={store.currentCardListIndex === i}
									>{cardList.name}</option
								>
							{/each}
						{/if}
					</select>
					<button
						onclick={() => (showDeleteConfirmModal = true)}
						disabled={store.dbMode === 'none' ||
							!store.currentCardList ||
							store.savedCardLists.length <= 1}
						class="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
						title="Delete this list"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M3 6h18" />
							<path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
							<path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
						</svg>
						Delete List
					</button>
				</div>
				<button
					onclick={handleCreateList}
					disabled={store.dbMode === 'none'}
					class="flex items-center gap-2 rounded-lg bg-orange-700 px-4 py-2 text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M5 12h14" />
						<path d="M12 5v14" />
					</svg>
					New List
				</button>
			</div>

			</div>

		<!-- Card Panel -->
		<div class="rounded-lg border border-orange-100 bg-white p-6 shadow-lg">
			<!-- List name + card count | Filter + Sort + Action buttons -->
			<div class="mb-4 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 class="text-xl font-bold text-orange-900">
						{store.currentCardList?.name || 'No list selected'}
					</h2>
					<p class="mt-1 text-sm text-stone-500">
						{#if store.dbLoaded}
							{store.totalCards} cards ({store.uniqueCards} unique)
						{:else}
							No database selected
						{/if}
					</p>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<input
						type="text"
						disabled={!store.dbLoaded}
						bind:value={filterText}
						placeholder="Filter cards..."
						class="rounded-lg border border-orange-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
					/>
					<select
						bind:value={sortBy}
						disabled={!store.dbLoaded}
						class="rounded-lg border border-orange-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
					>
						<option value="name">Sort by Name</option>
						<option value="quantity">Sort by Quantity</option>
						<option value="set">Sort by Set</option>
					</select>
					<button
						onclick={() => (showAddCardsModal = true)}
						disabled={store.dbMode === 'none' || !store.currentCardList}
						class="flex items-center gap-2 rounded-lg bg-orange-700 px-4 py-2 text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M5 12h14" />
							<path d="M12 5v14" />
						</svg>
						Add Cards
					</button>
					<button
						onclick={() => (showImportModal = true)}
						disabled={store.dbMode === 'none'}
						class="rounded-lg bg-orange-600 px-4 py-2 text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Import
					</button>
					<button
						onclick={handleExport}
						disabled={!store.dbLoaded || store.listCards.length === 0}
						class="rounded-lg bg-orange-500 px-4 py-2 text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Export
					</button>
				</div>
			</div>

			<!-- Card matching / language controls + ownership banner (above grid) -->
			{#if store.currentCardList}
				<div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
					<div class="flex items-center gap-2">
						<span class="font-medium text-stone-600">Card Matching:</span>
						<button
							onclick={() => handleCardMatchingChange('generic')}
							disabled={store.dbMode === 'none'}
							class="rounded-l-lg border border-orange-300 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-50 {store
								.currentCardList.cardMatching === 'generic'
								? 'bg-orange-700 text-white'
								: 'bg-white text-stone-700 hover:bg-orange-50'}"
						>
							Generic
						</button>
						<button
							onclick={() => handleCardMatchingChange('specific')}
							disabled={store.dbMode === 'none'}
							class="-ml-px rounded-r-lg border border-orange-300 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-50 {store
								.currentCardList.cardMatching === 'specific'
								? 'bg-orange-700 text-white'
								: 'bg-white text-stone-700 hover:bg-orange-50'}"
						>
							Specific
						</button>
					</div>
					<div class="flex items-center gap-2">
						<span class="font-medium text-stone-600">Language:</span>
						<button
							onclick={() => handleLanguageMatchingChange('any')}
							disabled={store.dbMode === 'none'}
							class="rounded-l-lg border border-orange-300 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-50 {store
								.currentCardList.languageMatching === 'any'
								? 'bg-orange-700 text-white'
								: 'bg-white text-stone-700 hover:bg-orange-50'}"
						>
							Any
						</button>
						<button
							onclick={() => handleLanguageMatchingChange('strict')}
							disabled={store.dbMode === 'none'}
							class="-ml-px rounded-r-lg border border-orange-300 px-3 py-1 transition disabled:cursor-not-allowed disabled:opacity-50 {store
								.currentCardList.languageMatching === 'strict'
								? 'bg-orange-700 text-white'
								: 'bg-white text-stone-700 hover:bg-orange-50'}"
						>
							Strict
						</button>
					</div>
					{#if store.listCards.length > 0}
						{#if ownershipCheck.owned}
							<div
								data-testid="ownership-banner"
								class="rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-sm text-green-800"
							>
								✓ Owned — you have all cards in this list
							</div>
						{:else}
							<div
								data-testid="ownership-banner"
								class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-sm text-amber-800"
							>
								✗ Missing {missingCount}
								{missingCount === 1 ? 'card' : 'cards'}
							</div>
						{/if}
					{/if}
				</div>
			{/if}

			<!-- Card Grid -->
			<div class="list-cards" data-testid="list-cards">
				{#if store.listCards.length === 0}
					<div class="py-12 text-center text-stone-500">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							class="mx-auto mb-4 opacity-50"
						>
							<rect width="18" height="18" x="3" y="3" rx="2" />
							<path d="M3 9h18" />
						</svg>
						<p>No cards in list yet</p>
						<p class="mt-2 text-sm">Click "Add Cards" to get started</p>
					</div>
				{:else if filteredListCards.length === 0}
					<div class="py-12 text-center text-stone-500">
						<p>No cards match your filter</p>
					</div>
				{:else}
					<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
						{#each filteredListCards as { card, owned } (card.id)}
							<CardListCard
								{card}
								{owned}
								onRemove={handleRemoveCard}
								disabled={store.dbMode === 'none'}
							/>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
