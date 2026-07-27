<script lang="ts">
	import NotificationToast from '$lib/components/NotificationToast.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SearchResults from '$lib/components/SearchResults.svelte';
	import CollectionCard from './CollectionCard.svelte';
	import {
		store,
		addToCollection,
		removeFromCollection,
		updateCollectionQuantity
	} from '$lib/store.svelte';

	const READ_ONLY_MSG = 'Select a database to enable editing — click "Preview" in the header';

	let search_results = $state<any[]>([]);
	let isSearching = $state(false);
	let showNotification = $state(false);
	let notificationMessage = $state('');
	let showSearchModal = $state(false);
	let filterText = $state('');
	let sortBy = $state('name'); // name, quantity, set
	const PAGE_SIZE = 50;
	let visibleCount = $state(PAGE_SIZE);
	let sentinelEl = $state<HTMLDivElement | null>(null);

	// Filtered and sorted collection
	let filteredCollection = $derived(
		store.dbLoaded
			? store.collection
					.filter(
						(card) =>
							filterText === '' ||
							card.name.toLowerCase().includes(filterText.toLowerCase()) ||
							card.set_name?.toLowerCase().includes(filterText.toLowerCase())
					)
					.sort((a, b) => {
						if (sortBy === 'name') return a.name.localeCompare(b.name);
						if (sortBy === 'quantity') return b.quantity_owned - a.quantity_owned;
						if (sortBy === 'set') return (a.set_name || '').localeCompare(b.set_name || '');
						return 0;
					})
			: []
	);

	let visibleCollection = $derived(filteredCollection.slice(0, visibleCount));
	let hasMore = $derived(visibleCount < filteredCollection.length);

	// Reset visible count when filter/sort changes
	$effect(() => {
		filterText;
		sortBy;
		visibleCount = PAGE_SIZE;
	});

	// Infinite scroll via IntersectionObserver
	$effect(() => {
		if (!sentinelEl) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore) {
					visibleCount += PAGE_SIZE;
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(sentinelEl);
		return () => observer.disconnect();
	});

	// Query Scryfall API
	async function queryScryfall(querystring: string) {
		if (!querystring.trim()) return;

		isSearching = true;
		const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(querystring)}`;
		const headers = { 'User-Agent': 'LMdecktools/0.1', Accept: '*/*' };

		try {
			const response = await fetch(url, { headers });
			if (!response.ok) {
				search_results = [];
				notify(`No results found`, 'error');
			} else {
				const json = await response.json();
				search_results = json.data;
				notify(`Found ${json.data.length} cards`);
			}
		} catch (error) {
			console.error(error instanceof Error ? error.message : error);
			notify('Search failed', 'error');
		} finally {
			isSearching = false;
		}
	}

	// Add card to collection
	async function addCard(card: any) {
		try {
			await addToCollection(card, 1);
			notify(`Added ${card.name} to collection`);
		} catch (error) {
			console.error('Failed to add card:', error);
			notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to add card', 'error');
		}
	}

	// Add one to existing card
	async function handleAddOne(card: any) {
		try {
			await addToCollection(card, 1);
			notify(`Added one ${card.name}`);
		} catch (error) {
			console.error('Failed to add card:', error);
			notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to add card', 'error');
		}
	}

	// Remove one from collection
	async function handleRemoveOne(card: any) {
		try {
			await removeFromCollection(card, 1);
			notify(`Removed one ${card.name}`);
		} catch (error) {
			console.error('Failed to remove card:', error);
			notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to remove card', 'error');
		}
	}

	// Update quantity
	async function handleUpdateQuantity(card: any, quantity: number) {
		try {
			await updateCollectionQuantity(card, quantity);
			notify(`Updated ${card.name} quantity`);
		} catch (error) {
			console.error('Failed to update quantity:', error);
			notify(store.isReadOnly ? READ_ONLY_MSG : 'Failed to update quantity', 'error');
		}
	}

	// Show notification
	function notify(message: string, _type = 'success') {
		notificationMessage = message;
		showNotification = true;
		setTimeout(() => {
			showNotification = false;
		}, 3000);
	}
</script>

<NotificationToast bind:show={showNotification} message={notificationMessage} />

<!-- Search Modal -->
{#if showSearchModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showSearchModal = false)}
	>
		<div
			class="panel max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between border-b border-orange-500/[0.08] p-6">
				<h2 class="text-2xl font-bold tracking-tight text-slate-50">Add Cards to Collection</h2>
				<button
					onclick={() => (showSearchModal = false)}
					class="rounded-lg p-2 text-slate-400 transition hover:bg-orange-500/[0.08] hover:text-orange-300"
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
				<SearchBar {isSearching} resultCount={search_results.length} onSearch={queryScryfall} />

				<SearchResults {isSearching} results={search_results} onAddCard={addCard} />
			</div>
		</div>
	</div>
{/if}

<div class="mx-auto max-w-7xl p-4">
	<!-- Header + Collection Grid -->
	<div class="surface-card p-6">
		<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
			<div>
				<div class="eyebrow mb-1">The Hold</div>
				<h1 class="text-3xl font-extrabold tracking-tight text-white">My Collection</h1>
				{#if store.dbLoaded}
					<p class="mt-1 text-sm text-slate-400">
						{store.totalOwnedCards} cards ({store.uniqueOwnedCards} unique)
					</p>
				{/if}
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<!-- Filter -->
				<input
					type="text"
					disabled={!store.dbLoaded}
					bind:value={filterText}
					placeholder="Filter cards..."
					class="field"
				/>

				<!-- Sort -->
				<select bind:value={sortBy} disabled={!store.dbLoaded} class="field">
					<option value="name">Sort by Name</option>
					<option value="quantity">Sort by Quantity</option>
					<option value="set">Sort by Set</option>
				</select>

				<button
					onclick={() => (showSearchModal = true)}
					disabled={store.dbMode === 'none'}
					class="btn btn-primary"
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
			</div>
		</div>

		{#if filteredCollection.length > 0}
			<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{#each visibleCollection as card (card.id)}
					<CollectionCard
						{card}
						onAdd={handleAddOne}
						onRemove={handleRemoveOne}
						onUpdate={handleUpdateQuantity}
					/>
				{/each}
			</div>
			{#if hasMore}
				<div bind:this={sentinelEl} class="flex justify-center py-8">
					<p class="font-mono text-xs tracking-wider text-slate-400 uppercase">
						Showing {visibleCount} of {filteredCollection.length} cards...
					</p>
				</div>
			{/if}
		{:else if filterText !== ''}
			<div class="py-12 text-center text-slate-400">
				<p>No cards match your filter</p>
			</div>
		{:else}
			<div class="py-12 text-center text-slate-400">
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
				{#if store.dbLoaded}
					<p>Your hold is empty</p>
					<p class="mt-2 text-sm text-slate-400">Click "Add Cards" to start logging what you own</p>
				{:else}
					<p>No database selected</p>
					<p class="mt-2 text-sm text-slate-400">Click "Choose DB" to get started</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
