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
		updateListParams,
		updateListName,
		addAllToCollection,
		addToCollection,
		logAppError
	} from '$lib/store.svelte';
	import type { ErrorCategory } from '$lib/error-journal';
	import * as m from '$lib/paraglide/messages';

	/**
	 * A read-only database rejects writes by design, so those failures are a
	 * user-flow message rather than a defect — journaling them would bury the
	 * real errors on /diagnostics.
	 */
	function reportFailure(
		category: ErrorCategory,
		error: unknown,
		context: Record<string, unknown>
	) {
		if (store.isReadOnly) return;
		logAppError(category, error, context);
	}

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
	const PAGE_SIZE = 50;
	let visibleCount = $state(PAGE_SIZE);
	let sentinelEl = $state<HTMLDivElement | null>(null);

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
				notify(m.search_no_results(), 'error');
			}
		} catch (error) {
			logAppError('scryfall-api', error, { operation: 'search', query: querystring });
			notify(m.search_failed(), 'error');
		} finally {
			isSearching = false;
		}
	}

	async function handleAddCard(card: any) {
		try {
			await addCardToList(card);
			notify(m.lists_notify_added_card({ name: card.name }));
		} catch (error) {
			reportFailure('indexeddb', error, { operation: 'addCardToList', cardName: card.name });
			notify(store.isReadOnly ? m.common_read_only_hint() : m.error_failed_add_card(), 'error');
		}
	}

	async function handleRemoveCard(card: any) {
		try {
			await removeCardFromList(card);
			notify(m.lists_notify_removed_card({ name: card.name }));
		} catch (error) {
			reportFailure('indexeddb', error, { operation: 'removeCardFromList', cardName: card.name });
			notify(store.isReadOnly ? m.common_read_only_hint() : m.error_failed_remove_card(), 'error');
		}
	}

	async function handleIncrementQuantity(card: any) {
		try {
			await addCardToList(card);
		} catch {
			notify(
				store.isReadOnly ? m.common_read_only_hint() : m.error_failed_update_quantity(),
				'error'
			);
		}
	}

	async function handleDecrementQuantity(card: any) {
		try {
			await removeCardFromList(card);
		} catch {
			notify(
				store.isReadOnly ? m.common_read_only_hint() : m.error_failed_update_quantity(),
				'error'
			);
		}
	}

	async function handleCreateList() {
		try {
			await createNewCardList();
			notify(m.lists_notify_created());
		} catch (error) {
			reportFailure('indexeddb', error, { operation: 'createNewCardList' });
			notify(store.isReadOnly ? m.common_read_only_hint() : m.error_failed_create_list(), 'error');
		}
	}

	async function handleDeleteList() {
		try {
			await deleteCardList();
			showDeleteConfirmModal = false;
			notify(m.lists_notify_deleted());
		} catch (error) {
			reportFailure('indexeddb', error, { operation: 'deleteCardList' });
			showDeleteConfirmModal = false;
			notify(store.isReadOnly ? m.common_read_only_hint() : m.error_failed_delete_list(), 'error');
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
			notify(m.lists_notify_imported());
		} catch (error) {
			reportFailure('import', error, {
				operation: 'importListFromText',
				lines: importText.split('\n').length
			});
			notify(store.isReadOnly ? m.common_read_only_hint() : m.error_import_failed(), 'error');
		} finally {
			isImporting = false;
		}
	}

	function handleExport() {
		exportText = exportListToText();
		showExportModal = true;
	}

	async function handleAddAllToCollection() {
		try {
			const { added, failed } = await addAllToCollection();
			if (failed === 0) {
				notify(
					added === 1
						? m.lists_notify_added_to_collection_one({ count: added })
						: m.lists_notify_added_to_collection_other({ count: added })
				);
			} else {
				notify(m.lists_notify_added_partial({ added, failed }), 'error');
			}
		} catch {
			notify(
				store.isReadOnly ? m.common_read_only_hint() : m.error_failed_add_all_to_collection(),
				'error'
			);
		}
	}

	async function handleAddSingleToCollection(card: any) {
		try {
			await addToCollection(card, card.LM_quantity);
			notify(m.collection_notify_added({ name: card.name }));
		} catch {
			notify(
				store.isReadOnly ? m.common_read_only_hint() : m.error_failed_add_card_to_collection(),
				'error'
			);
		}
	}

	async function handleCardMatchingChange(value: 'generic' | 'specific') {
		try {
			await updateListParams({ cardMatching: value });
		} catch (e) {
			if (store.isReadOnly) {
				notify(m.common_read_only_hint(), 'error');
			} else {
				logAppError('indexeddb', e, { operation: 'updateListParams', cardMatching: value });
			}
		}
	}

	async function handleLanguageMatchingChange(value: 'any' | 'strict') {
		try {
			await updateListParams({ languageMatching: value });
		} catch (e) {
			if (store.isReadOnly) {
				notify(m.common_read_only_hint(), 'error');
			} else {
				logAppError('indexeddb', e, { operation: 'updateListParams', languageMatching: value });
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

	let dedupedCards = $derived.by(() => {
		// Local scratch map, discarded when the derivation returns — no reactivity needed
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const seen = new Map<string, { card: any; owned: boolean }>();
		for (const entry of ownershipCheck.cards) {
			const existing = seen.get(entry.card.id);
			if (existing) {
				// Merge duplicate: sum quantities, owned only if both owned
				existing.card = {
					...existing.card,
					LM_quantity: existing.card.LM_quantity + entry.card.LM_quantity
				};
				existing.owned = existing.owned && entry.owned;
			} else {
				seen.set(entry.card.id, { card: { ...entry.card }, owned: entry.owned });
			}
		}
		return [...seen.values()];
	});

	let filteredListCards = $derived(
		dedupedCards
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

	let visibleListCards = $derived(filteredListCards.slice(0, visibleCount));
	let hasMore = $derived(visibleCount < filteredListCards.length);

	// Reset visible count when filter/sort changes
	$effect(() => {
		// Read both so the effect re-runs on either change
		const _deps = [filterText, sortBy];
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
</script>

<NotificationToast bind:show={showNotification} message={notificationMessage} />

<!-- Add Cards Modal -->
{#if showAddCardsModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showAddCardsModal = false)}
		role="dialog"
		aria-modal="true"
		aria-label={m.lists_add_cards_modal_title()}
	>
		<div
			class="panel max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="flex items-center justify-between border-b border-orange-500/[0.08] p-6">
				<h2 class="text-2xl font-bold text-slate-100">{m.lists_add_cards_modal_title()}</h2>
				<button
					onclick={() => (showAddCardsModal = false)}
					class="rounded-lg p-2 text-slate-400 transition hover:bg-orange-500/[0.08] hover:text-orange-300"
					title={m.common_close()}
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
		aria-label={m.lists_import_modal_title()}
	>
		<div
			class="panel w-full max-w-lg rounded-xl p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-4 text-xl font-bold text-slate-100">{m.lists_import_modal_title()}</h2>
			<p class="mb-3 text-sm text-slate-400">{m.lists_import_hint()}</p>
			<textarea
				bind:value={importText}
				disabled={isImporting}
				placeholder={m.lists_import_placeholder()}
				class="field h-48 w-full font-mono disabled:opacity-50"
			></textarea>
			<div class="mt-4 flex justify-end gap-2">
				<button
					onclick={() => (showImportModal = false)}
					disabled={isImporting}
					class="btn btn-quiet disabled:cursor-not-allowed disabled:opacity-50"
				>
					{m.common_cancel()}
				</button>
				<button
					onclick={handleImport}
					disabled={isImporting}
					class="btn btn-primary disabled:cursor-not-allowed disabled:opacity-75"
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
						{importTotal > 0
							? m.lists_import_progress({ current: importCurrent, total: importTotal })
							: m.lists_importing()}
					{:else}
						{m.lists_import_submit()}
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
		aria-label={m.lists_delete_modal_aria()}
	>
		<div
			class="panel w-full max-w-sm rounded-xl p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="text-danger mb-3 text-xl font-bold">{m.lists_delete_modal_title()}</h2>
			<p class="mb-1 text-slate-300">
				{m.lists_delete_confirm_prefix()}
				<strong>{store.currentCardList?.name}</strong>?
			</p>
			<p class="mb-6 text-sm text-slate-400">{m.common_cannot_be_undone()}</p>
			<div class="flex justify-end gap-2">
				<button onclick={() => (showDeleteConfirmModal = false)} class="btn btn-quiet">
					{m.common_cancel()}
				</button>
				<button onclick={handleDeleteList} class="btn btn-danger">{m.common_delete()}</button>
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
		aria-label={m.lists_export_modal_title()}
	>
		<div
			class="panel w-full max-w-lg rounded-xl p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
		>
			<h2 class="mb-4 text-xl font-bold text-slate-100">{m.lists_export_modal_title()}</h2>
			<pre
				data-testid="export-text"
				class="h-48 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-800 p-3 font-mono text-sm whitespace-pre-wrap text-slate-300">{exportText}</pre>
			<div class="mt-4 flex justify-end gap-2">
				<button
					onclick={() =>
						navigator.clipboard.writeText(exportText).then(() => notify(m.lists_notify_copied()))}
					class="btn btn-quiet"
				>
					{m.common_copy()}
				</button>
				<button onclick={() => (showExportModal = false)} class="btn btn-primary"
					>{m.common_close()}</button
				>
			</div>
		</div>
	</div>
{/if}

<div class="mx-auto max-w-7xl p-4">
	<!-- Header -->
	<div class="surface-card mb-6 p-6">
		<!-- Row 1: Lists label + dropdown + New List button -->
		<div class="mb-4 flex flex-wrap items-center justify-between gap-4">
			<div class="flex items-center gap-3">
				<span class="text-lg font-semibold text-slate-400">{m.lists_label()}</span>
				<select
					onchange={(e) => handleSwitchList(parseInt((e.currentTarget as HTMLSelectElement).value))}
					disabled={!store.dbLoaded || store.savedCardLists.length === 0}
					class="field min-w-[200px] disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if store.savedCardLists.length === 0}
						<option value={-1}>{m.lists_none()}</option>
					{:else}
						{#each store.savedCardLists as cardList, i (cardList.id ?? i)}
							<option value={i} selected={store.currentCardListIndex === i}>{cardList.name}</option>
						{/each}
					{/if}
				</select>
				<button
					onclick={() => (showDeleteConfirmModal = true)}
					disabled={store.dbMode === 'none' || !store.currentCardList}
					class="btn btn-danger disabled:cursor-not-allowed disabled:opacity-50"
					title={m.lists_delete_button_title()}
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
					{m.lists_delete_button()}
				</button>
			</div>
			<div class="flex items-center gap-2">
				<a
					href="/card-lists/compare"
					class="btn btn-quiet {store.savedCardLists.length < 2
						? 'pointer-events-none opacity-50'
						: ''}"
					aria-disabled={store.savedCardLists.length < 2}
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
						<path d="M16 3h5v5" />
						<path d="M8 3H3v5" />
						<path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
						<path d="m15 9 6-6" />
					</svg>
					{m.lists_compare_button()}
				</a>
				<button
					onclick={handleCreateList}
					disabled={store.dbMode === 'none'}
					class="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
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
					{m.lists_new_button()}
				</button>
			</div>
		</div>
	</div>

	<!-- Card Panel -->
	<div class="surface-card p-6">
		<!-- List name + card count | Filter + Sort + Action buttons -->
		<div class="mb-4 flex flex-wrap items-center justify-between gap-4">
			<div>
				<div class="eyebrow mb-0.5">{m.lists_current_chart()}</div>
				<h2
					class="text-xl font-extrabold tracking-tight text-white outline-none {store.currentCardList &&
					!store.isReadOnly
						? 'cursor-text'
						: ''}"
					contenteditable={store.currentCardList && !store.isReadOnly ? 'plaintext-only' : 'false'}
					onblur={(e) => {
						const trimmed = (e.currentTarget as HTMLElement).innerText.trim();
						if (!trimmed) {
							(e.currentTarget as HTMLElement).innerText = store.currentCardList?.name ?? '';
							return;
						}
						if (trimmed !== store.currentCardList?.name) {
							updateListName(trimmed).catch((err) => {
								reportFailure('indexeddb', err, { operation: 'updateListName', name: trimmed });
								notify(
									store.isReadOnly ? m.common_read_only_hint() : m.error_failed_rename_list(),
									'error'
								);
							});
						}
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter') e.preventDefault();
						if (e.key === 'Escape') {
							(e.currentTarget as HTMLElement).innerText = store.currentCardList?.name ?? '';
							(e.currentTarget as HTMLElement).blur();
						}
					}}
				>
					{store.currentCardList?.name || m.lists_no_list_selected()}
				</h2>
				<p class="mt-1 text-sm text-slate-400">
					{#if store.dbLoaded}
						{m.lists_count({ total: store.totalCards, unique: store.uniqueCards })}
					{:else}
						{m.common_no_database_selected()}
					{/if}
				</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<input
					type="text"
					disabled={!store.dbLoaded}
					bind:value={filterText}
					placeholder={m.common_filter_placeholder()}
					class="field disabled:opacity-50"
				/>
				<select bind:value={sortBy} disabled={!store.dbLoaded} class="field disabled:opacity-50">
					<option value="name">{m.common_sort_by_name()}</option>
					<option value="quantity">{m.common_sort_by_quantity()}</option>
					<option value="set">{m.common_sort_by_set()}</option>
				</select>
				<button
					onclick={handleAddAllToCollection}
					disabled={store.isReadOnly || store.listCards.length === 0}
					class="btn btn-quiet disabled:cursor-not-allowed disabled:opacity-50"
					title={m.lists_add_all_to_collection_title()}
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
					{m.lists_add_all_to_collection()}
				</button>
				<button
					onclick={() => (showAddCardsModal = true)}
					disabled={store.dbMode === 'none'}
					class="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
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
					{m.common_add_cards()}
				</button>
				<button
					onclick={() => (showImportModal = true)}
					disabled={store.dbMode === 'none'}
					class="btn btn-quiet disabled:cursor-not-allowed disabled:opacity-50"
				>
					{m.common_import()}
				</button>
				<button
					onclick={handleExport}
					disabled={!store.dbLoaded || store.listCards.length === 0}
					class="btn btn-quiet disabled:cursor-not-allowed disabled:opacity-50"
				>
					{m.common_export()}
				</button>
			</div>
		</div>

		<!-- Card matching / language controls + ownership banner (above grid) -->
		{#if store.currentCardList}
			<div class="mb-4 flex flex-wrap items-center gap-3 text-sm">
				<div class="flex items-center gap-2">
					<span class="font-medium text-slate-400">{m.common_card_matching_label()}</span>
					<div class="inline-flex">
						<button
							onclick={() => handleCardMatchingChange('generic')}
							disabled={store.dbMode === 'none'}
							class="seg seg-l {store.currentCardList.cardMatching === 'generic'
								? 'seg-active'
								: ''}"
						>
							{m.common_generic()}
						</button>
						<button
							onclick={() => handleCardMatchingChange('specific')}
							disabled={store.dbMode === 'none'}
							class="seg seg-r {store.currentCardList.cardMatching === 'specific'
								? 'seg-active'
								: ''}"
						>
							{m.common_specific()}
						</button>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<span class="font-medium text-slate-400">{m.common_language_label()}</span>
					<div class="inline-flex">
						<button
							onclick={() => handleLanguageMatchingChange('any')}
							disabled={store.dbMode === 'none'}
							class="seg seg-l {store.currentCardList.languageMatching === 'any'
								? 'seg-active'
								: ''}"
						>
							{m.common_any()}
						</button>
						<button
							onclick={() => handleLanguageMatchingChange('strict')}
							disabled={store.dbMode === 'none'}
							class="seg seg-r {store.currentCardList.languageMatching === 'strict'
								? 'seg-active'
								: ''}"
						>
							{m.common_strict()}
						</button>
					</div>
				</div>
				{#if store.listCards.length > 0}
					{#if ownershipCheck.owned}
						<div
							data-testid="ownership-banner"
							class="border-success-edge bg-success-surface text-success rounded-lg border px-3 py-1 text-sm"
						>
							{m.lists_owned_banner()}
						</div>
					{:else}
						<div
							data-testid="ownership-banner"
							class="border-warning-edge bg-warning-surface text-warning rounded-lg border px-3 py-1 text-sm"
						>
							{missingCount === 1
								? m.lists_missing_banner_one({ count: missingCount })
								: m.lists_missing_banner_other({ count: missingCount })}
						</div>
					{/if}
				{/if}
			</div>
		{/if}

		<!-- Card Grid -->
		<div class="list-cards" data-testid="list-cards">
			{#if store.listCards.length === 0}
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
					<p>{m.lists_empty_title()}</p>
					<p class="mt-2 text-sm">{m.lists_empty_body()}</p>
				</div>
			{:else if filteredListCards.length === 0}
				<div class="py-12 text-center text-slate-400">
					<p>{m.common_no_cards_match_filter()}</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
					{#each visibleListCards as { card, owned } (card.id)}
						<CardListCard
							{card}
							{owned}
							onRemove={handleRemoveCard}
							onAddToCollection={handleAddSingleToCollection}
							onIncrement={handleIncrementQuantity}
							onDecrement={handleDecrementQuantity}
							disabled={store.dbMode === 'none'}
						/>
					{/each}
				</div>
				{#if hasMore}
					<div bind:this={sentinelEl} class="flex justify-center py-8">
						<p class="text-sm text-slate-500">
							{m.common_showing_of({ shown: visibleCount, total: filteredListCards.length })}
						</p>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>
