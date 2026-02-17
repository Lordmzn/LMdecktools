# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
pnpm run dev

# or start the server and open the app in a new browser tab
pnpm run dev -- --open
```

## Building

To create a production version of your app:

```bash
pnpm run build
```

You can preview the production build with `pnpm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.


# Collection-Enabled Architecture Guide

## Overview

The application now supports both **deck management** and **card collection tracking**. You can manage which cards you own and see at a glance which cards you need to complete your decks.

## New Features

### ✨ Collection Management
- Track all owned cards with quantities
- Add/remove cards from collection
- Filter and sort your collection
- Import/export collection lists
- Visual indicators showing owned cards

### ✨ Deck Analysis
- See which deck cards you own
- Track how many more you need
- Visual completion status
- "Own all" vs "Need X" indicators

### ✨ Smart Search
- Search results show if you own cards
- Quantity badges on owned cards
- Quick add to collection or deck

## Architecture Changes

### Store: `cardStore.ts` (replaces `deckStore.ts`)

```
cardStore.ts
├── Deck Management (existing)
│   ├── savedDecks, currentDeckIndex, currentDeck
│   ├── deckName, deckCards, totalCards, uniqueCards
│   └── Functions: loadDeck, saveDeck, addCardToDeck, etc.
│
└── Collection Management (NEW)
    ├── collection, totalOwnedCards, uniqueOwnedCards
    ├── deckNeeds (analysis of owned vs needed)
    ├── isCardOwned (reactive checker)
    └── Functions: addToCollection, removeFromCollection, etc.
```

### Database Schema

**IndexedDB: "LMdecktools" v2**

```
decks (objectStore)
├── key: auto-increment
├── name: string
└── deck_cards: Array<{
      id: string,
      name: string,
      quantity: number,
      image_uris: object,
      mana_cost: string,
      ...
    }>

collection (objectStore)
├── key: card.id (keyPath)
└── {
      id: string,
      name: string,
      quantity_owned: number,
      image_uris: object,
      mana_cost: string,
      set: string,
      set_name: string,
      ...
    }
```

## Component Structure

### Updated Components

**Card.svelte** (updated)
- Shows "Own: X" badge if card is in collection
- Badge appears in top-right corner
- Can be toggled with `showOwned` prop

**CardListItem.svelte** (updated)
- Shows ownership status: "Own all", "Own X/Y", or "Need X"
- Green border if all cards owned
- Color-coded badges (green/orange/red)
- Can be toggled with `showOwnership` prop

**DeckControls.svelte** (updated)
- Added "Collection" button linking to `/collection`
- Shows deck completion status
- "Complete" badge or "Need X" badge

**DeckList.svelte** (updated)
- Uses updated CardListItem with ownership info
- Automatically shows owned/needed for each card

**SearchResults.svelte** (updated)
- Uses updated Card component with owned badges
- Shows which search results you already own

### New Components

**CollectionCard.svelte**
- Displays cards in your collection
- Quick controls: +1, Edit, -1
- Edit modal for bulk quantity changes
- Shows card name and set

**collection-page.svelte**
- Full collection management interface
- Search and add cards to collection
- Filter and sort collection
- Import/export collection
- Collection statistics

## Store API Reference

### Collection Stores

| Store | Type | Description |
|-------|------|-------------|
| `collection` | `Card[]` | All owned cards |
| `totalOwnedCards` | `number` | Total cards owned (sum of quantities) |
| `uniqueOwnedCards` | `number` | Number of unique cards owned |
| `deckNeeds` | `DeckCard[]` | Deck cards with ownership analysis |
| `isCardOwned` | `(id) => number` | Function to check owned quantity |

### Collection Functions

| Function | Parameters | Returns | Description |
|----------|-----------|---------|-------------|
| `loadCollection()` | none | `Promise<Card[]>` | Load collection from DB |
| `addToCollection(card, qty)` | `card: Card, qty: number` | `Promise<Card>` | Add cards to collection |
| `removeFromCollection(card, qty)` | `card: Card, qty: number` | `Promise<Card \| null>` | Remove cards from collection |
| `updateCollectionQuantity(card, qty)` | `card: Card, qty: number` | `Promise<Card>` | Set exact quantity |
| `getOwnedQuantity(id)` | `id: string` | `number` | Get quantity owned |
| `checkDeckCompletion()` | none | `CompletionStatus` | Check if have all deck cards |
| `importCollectionFromText(text)` | `text: string` | `Promise<Results>` | Import collection |
| `exportCollectionToText()` | none | `string` | Export collection |

### Deck Analysis Types

```typescript
// DeckNeeds - Each card with ownership info
{
  ...card,
  owned: number,      // How many you own
  needed: number,     // How many more needed
  hasAll: boolean     // true if owned >= quantity
}

// Completion Status
{
  complete: boolean,           // true if have all cards
  totalNeeded: number,         // total cards still needed
  cardsNeeded: DeckCard[]      // array of cards missing
}
```

## Usage Examples

### Check if Card is Owned

```svelte
<script>
  import { isCardOwned } from './cardStore';
  
  let card = { id: '123', name: 'Lightning Bolt' };
  let owned = $isCardOwned(card.id);  // Returns quantity owned
</script>

{#if owned > 0}
  <span>You own {owned} of these</span>
{/if}
```

### Track Deck Completion

```svelte
<script>
  import { checkDeckCompletion } from './cardStore';
  
  let completion = $derived(checkDeckCompletion());
</script>

{#if completion.complete}
  <span>✓ Deck Complete!</span>
{:else}
  <span>Need {completion.totalNeeded} more cards</span>
  <ul>
    {#each completion.cardsNeeded as card}
      <li>Need {card.needed} × {card.name}</li>
    {/each}
  </ul>
{/if}
```

### Add to Collection

```svelte
<script>
  import { addToCollection } from './cardStore';
  
  async function handleAdd(card) {
    await addToCollection(card, 4);  // Add 4 copies
  }
</script>
```

### Get Deck Analysis

```svelte
<script>
  import { deckNeeds } from './cardStore';
</script>

{#each $deckNeeds as card}
  <div>
    {card.name}
    {#if card.hasAll}
      ✓ Complete
    {:else}
      Need {card.needed} more (have {card.owned})
    {/if}
  </div>
{/each}
```

## File Structure

```
src/routes/
├── +layout.svelte                 # Initializes cardStore
├── +page.svelte                   # Deck builder (updated)
├── collection/
│   └── +page.svelte              # Collection manager (NEW)
├── cardStore.ts                   # Central store (NEW - replaces deckStore)
├── Card-updated.svelte           # With owned indicator (UPDATED)
├── CardListItem-updated.svelte   # With ownership status (UPDATED)
├── CollectionCard.svelte          # Collection management (NEW)
├── DeckControls-updated.svelte   # With collection link (UPDATED)
├── DeckList-updated.svelte       # Uses updated CardListItem
├── SearchResults-updated.svelte  # Uses updated Card
├── NotificationToast.svelte
├── CardPreview.svelte
├── ImportExportModal.svelte
├── DeckSelector.svelte
└── SearchBar.svelte
```

## Migration Steps

1. **Replace** `deckStore.ts` with `cardStore.ts`
2. **Update** `+layout.svelte` to import from `cardStore`
3. **Replace** main `+page.svelte` with updated version
4. **Update** all component imports to use `-updated` versions
5. **Create** `/collection` route with `+page.svelte`
6. **Test** both deck and collection features

## Routes

- `/` - Deck builder with ownership tracking
- `/collection` - Collection management page

## Migration from Old Version

The new store is **backward compatible** with existing deck data. When you upgrade:

1. Database version bumps from 1 → 2
2. Existing decks are preserved
3. New `collection` objectStore is created
4. Collection starts empty (add cards as needed)
5. Old deck format auto-converts: `LM_quantity` → `quantity`

## Best Practices

### 1. **Use Ownership Indicators**
Always enable ownership displays in deck views:
```svelte
<CardListItem {card} showOwnership={true} />
<Card {card} showOwned={true} />
```

### 2. **Check Completion**
Show users deck completion status:
```svelte
let completion = $derived(checkDeckCompletion());
```

### 3. **Sync Collection First**
Encourage users to add cards to collection before building decks.

### 4. **Import Bulk Collections**
For users with large collections, use import:
```
# My Collection
4 Lightning Bolt
3 Counterspell
20 Island
```

## Advanced Features

### Deck-Building Helpers

```svelte
<!-- Show only cards you don't have enough of -->
{#each $deckNeeds.filter(c => c.needed > 0) as card}
  <div>Missing: {card.needed} × {card.name}</div>
{/each}

<!-- Calculate total cost of missing cards -->
{@const missing = $deckNeeds.filter(c => c.needed > 0)}
<p>Need to acquire {missing.length} different cards</p>
```

### Collection Statistics

```svelte
<script>
  import { collection, totalOwnedCards } from './cardStore';
  
  let avgCopies = $derived($totalOwnedCards / $collection.length);
  let mostOwned = $derived(
    [...$collection].sort((a,b) => b.quantity_owned - a.quantity_owned)[0]
  );
</script>

<p>Average copies per card: {avgCopies.toFixed(1)}</p>
<p>Most owned: {mostOwned?.name} ({mostOwned?.quantity_owned}×)</p>
```

## Future Enhancements

With this architecture, you can easily add:
- Price tracking integration
- Trade/wishlist features
- Deck recommendations based on owned cards
- "Budget" deck builder (only use owned cards)
- Collection value estimates
- Duplicate detection
- Printing/edition tracking
- Condition tracking
- Storage location tracking

## Troubleshooting

**Q: Ownership not showing?**
- Ensure `cardStore.ts` imported (not old `deckStore`)
- Check browser console for DB errors
- Verify collection loaded: `console.log($collection)`

**Q: Deck says "Need 0" but I don't own cards?**
- Old data might use `LM_quantity` instead of `quantity`
- Re-import deck to convert format

**Q: Collection not persisting?**
- Check IndexedDB in DevTools
- Ensure `initDB()` called in layout's `onMount`
- Database version should be 2

**Q: Performance issues with large collections?**
- Collection filtered/sorted reactively
- Consider pagination if >1000 cards
- Use IndexedDB indexes for faster queries

