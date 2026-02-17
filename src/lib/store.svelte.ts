import {
  openDatabase,
  clearDatabase,
  loadAllDecks,
  saveDeck as dbSaveDeck,
  deleteDeck as dbDeleteDeck,
  createEmptyDeck,
  loadCollection as dbLoadCollection,
  saveCollectionCard,
  deleteCollectionCard,
  getCollectionCard,
  getMetadata,
  type Deck,
  type CollectionCard,
  type DBSummary
} from './db';


import { exportWithMetadata } from './yjs-integration';

// Database reference
let db: IDBDatabase | null = null;

// ==================== STORE ====================
export interface StoreInterface {
  dbLoaded: boolean,
  savedDecks: Deck[],
  collection: CollectionCard[]
}

class Store implements StoreInterface {
  // DB state
  dbLoaded = $state(false);
  
  // Deck state
  savedDecks= $state([]);
  currentDeckIndex = $state(NaN);
  currentDeck: Deck = $derived(
    this.currentDeckIndex ? 
    savedDecks[this.currentDeckIndex] 
    : null
  );
  deckCards = $derived(this.currentDeck?.deck_cards || []);
  deckNames = $derived(this.savedDecks.map((deck) => deck.name));
  totalCards = $derived(
    this.deckCards.reduce((sum, card) => sum + card.quantity, 0)
  );
  uniqueCards = $derived(this.deckCards.length);
  
  // Collection state
  collection = $state([]);
  totalOwnedCards = $derived(
    this.collection.reduce((sum, card) => sum + card.quantity_owned, 0)
  );
  uniqueOwnedCards = $derived(this.collection.length);
  isCardOwned(cardId) {
    const card = this.collection.find(c => c.id === cardId);
    return card ? card.quantity_owned : 0;
  };

  // Derived deck/collection analysis
  deckNeeds = $derived.by(() => {
    return deckCards.map((deckCard) => {
      const owned = collection.find(c => c.id === deckCard.id);
      const ownedQty = owned?.quantity_owned || 0;
      const needed = Math.max(0, deckCard.quantity - ownedQty);
      return {
        ...deckCard,
        owned: ownedQty,
        needed: needed,
        hasAll: needed === 0
      };
    });
  });
}

// Export a single shared instance
export const store = new Store();

// ==================== INITIALIZATION ====================

/**
 * Initialize IndexedDB and load data
 */
export async function initDB() {
  db = await openDatabase();
  await Promise.all([loadDecks(), loadCollection()]);
  console.log("initDB done");
}

export async function clearDB() {
  await clearDatabase();
  console.log("clearDB done");
}

export function exportDB() {
  if (!db) throw new Error("Database not initialized");
  return exportWithMetadata(store);
}

/**
 * Import database from a file (supports both JSON and Yjs formats)
 * Automatically detects format and handles accordingly
 * 
 * Note: For Yjs merge support, import yjs-integration:
 * import { mergeCardQuantities, importWithMetadata } from './yjs-integration';
 */
export async function importDatabase(
  db: IDBDatabase,
  data: Uint8Array,
  merge: boolean = false
): Promise<{ imported: number; merged: number; errors: number }> {
  let importData: any;
  let decks: Deck[];
  
  // Try to detect format
  try {
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(data);
    importData = JSON.parse(jsonString);
    decks = importData.decks;
  } catch {
    // If JSON parsing fails, might be Yjs format
    // For production, uncomment:
    // import { importWithMetadata } from './yjs-integration';
    // const result = importWithMetadata(data);
    // decks = result.decks;
    throw new Error('Invalid file format. Please use a valid .lmdb or .json export file.');
  }

  let imported = 0;
  let merged = 0;
  let errors = 0;

  if (!merge) {
    // Clear existing data
    await clearDatabase(db);
  }

  // Import decks
  for (const deck of decks) {
    try {
      if (merge) {
        // Check if deck with same name exists
        const existing = await findDeckByName(db, deck.name);
        if (existing) {
          // Merge cards
          const mergedCards = mergeCards(existing.deck_cards, deck.deck_cards);
          await saveDeck(db, {
            ...existing,
            deck_cards: mergedCards,
            updated_at: Date.now()
          });
          merged++;
        } else {
          await saveDeck(db, {
            ...deck,
            id: undefined, // Let autoIncrement assign new ID
            created_at: deck.created_at || Date.now(),
            updated_at: Date.now()
          });
          imported++;
        }
      } else {
        await saveDeck(db, {
          ...deck,
          id: undefined,
          created_at: deck.created_at || Date.now(),
          updated_at: Date.now()
        });
        imported++;
      }
    } catch (error) {
      console.error('Error importing deck:', error);
      errors++;
    }
  }

  return { imported, merged, errors };
}


// ==================== COLLECTION FUNCTIONS ====================

/**
 * Load collection from database
 */
export async function loadCollection() {
  if (!db) throw new Error("Database not initialized");
  
  const cards = await dbLoadCollection(db);
  store.collection = cards;
  return cards;
}

/**
 * Add card to collection
 */
export async function addToCollection(card: any, quantity: number = 1) {
  if (!db) throw new Error("Database not initialized");
  
  const existingCard = await getCollectionCard(db, card.id);
  
  const cardData: CollectionCard = {
    ...JSON.parse(JSON.stringify(card)),
    quantity_owned: existingCard ? existingCard.quantity_owned + quantity : quantity,
  };

  await saveCollectionCard(db, cardData);
  
  if (existingCard) {
    const newCollection = store.collection.map(c =>
      c.id === card.id ? cardData : c
    );
    store.collection = newCollection;
  } else {
    store.collection = [...store.collection, cardData];
  }
  
  return cardData;
}

/**
 * Remove card from collection
 */
export async function removeFromCollection(card: any, quantity: number = 1) {
  if (!db) throw new Error("Database not initialized");
  
  const existingCard = store.collection.find(c => c.id === card.id);
  
  if (!existingCard) {
    throw new Error("Card not in collection");
  }
  
  const newQuantity = existingCard.quantity_owned - quantity;

  if (newQuantity <= 0) {
    // Remove card entirely
    await deleteCollectionCard(db, card.id);
    const newCollection = store.collection.filter(c => c.id !== card.id);
    store.collection = newCollection;
    return null;
  } else {
    // Update quantity
    const cardData: CollectionCard = {
      ...JSON.parse(JSON.stringify(existingCard)),
      quantity_owned: newQuantity
    };

    const newCard = await saveCollectionCard(db, cardData);
    
    const newCollection = store.collection.map(c =>
      c.id === card.id ? cardData : c
    );
    store.collection = newCollection;
    return cardData;
  }
}

/**
 * Update card quantity in collection
 */
export async function updateCollectionQuantity(card: any, quantity: number) {
  if (!db) throw new Error("Database not initialized");
  
  if (quantity <= 0) {
    return removeFromCollection(card, 9999);
  }
  
  const cardData: CollectionCard = {
    ...JSON.parse(JSON.stringify(card)),
    quantity_owned: quantity
  };
  
  await saveCollectionCard(db, cardData);
  
  const existingIndex = store.collection.findIndex(c => c.id === card.id);
  if (existingIndex >= 0) {
    const newCollection = [...store.collection];
    newCollection[existingIndex] = cardData;
    store.collection = newCollection;
  } else {
    store.collection = [...currentCollection, cardData];
  }
  
  return cardData;
}

/**
 * Get quantity owned of a specific card
 */
export function getOwnedQuantity(cardId: string) {
  const card = store.collection.find(c => c.id === cardId);
  return card?.quantity_owned || 0;
}

/**
 * Check if have enough cards for deck
 */
export function checkDeckCompletion() {
  const totalNeeded = deckNeeds.reduce((sum, card) => sum + card.needed, 0);
  const hasAll = totalNeeded === 0;
  
  return {
    complete: hasAll,
    totalNeeded: totalNeeded,
    cardsNeeded: deckNeeds.filter(card => card.needed > 0)
  };
}

/**
 * Import collection from text
 */
export async function importCollectionFromText(text: string) {
  const lines = text.split('\n').filter(line => line.trim());
  const results = { success: 0, failed: 0 };

  for (const line of lines) {
    if (line.startsWith('#')) continue;

    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const quantity = parseInt(match[1]);
      const cardName = match[2].trim();

      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
        );
        if (response.ok) {
          const card = await response.json();
          await updateCollectionQuantity(card, quantity);
          results.success++;
        } else {
          results.failed++;
        }
      } catch (error) {
        console.error(`Failed to import ${cardName}`);
        results.failed++;
      }
    }
  }

  return results;
}

/**
 * Export collection to text
 */
export function exportCollectionToText(fields) {
  const cards = store.collection;
  
  // 1. Define how checkbox values map to card properties
  const fieldMap = {
    'Count': (c) => c.quantity_owned,
    'Name': (c) => c.name,
    'Edition': (c) => c.set?.toUpperCase(),
    'Collector Number': (c) => c.collector_number,
    'Foil': (c) => c.is_foil ? '(Foil)' : '',
    'Language': (c) => c.lang,
    'Scryfall ID': (c) => c.id // it's the scryfall_id
  };

  let collectionText = `# My Collection\n\n`;

  cards
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(card => {
      
      // 2. Loop through the selected fields and get value from map
      const lineParts = fields.map(fieldKey => {
        const getValue = fieldMap[fieldKey];
        // Execute the accessor function, or return empty string if not found
        return getValue ? getValue(card) : '';
      });

      // 3. Join with spaces, filtering out empty values (e.g. non-foils)
      const line = lineParts.join(' ');

      collectionText += `${line}\n`;
    });
  
  return collectionText;
}

// ==================== DECK FUNCTIONS ====================

/**
 * Load all decks from database
 */
export async function loadDecks() {
  if (!db) throw new Error("Database not initialized");
  
  store.savedDecks = await loadAllDecks(db);

  // Ensure we have at least one deck
  if (store.savedDecks.length === 0) {
    await createNewDeck();
  }
}

/**
 * Create new deck
 */
export async function createNewDeck() {
  if (!db) throw new Error("Database not initialized");
  
  const newDeck = createEmptyDeck();
  const deckId = await dbSaveDeck(db, newDeck);
  
  const deckWithId = { ...newDeck, id: deckId };
  const decks = store.savedDecks;
  const newDecks = [...decks, deckWithId];
  
  store.savedDecks = newDecks;
  store.currentDeckIndex = newDecks.length - 1;
  
  return deckWithId;
}

///////// TODO
/**
 * Save current deck
 */
export async function saveDeck(name: string, cards: any[]) {
  if (!db) throw new Error("Database not initialized");
  
  const decks = get(savedDecks);
  const index = get(currentDeckIndex);
  const currentDeckData = decks[index];
  
  if (!currentDeckData) throw new Error("No deck selected");
  
  const updatedDeck: Deck = {
    ...currentDeckData,
    name,
    deck_cards: cards,
    updated_at: Date.now()
  };
  
  await dbSaveDeck(db, updatedDeck);
  
  const newDecks = [...decks];
  newDecks[index] = updatedDeck;
  savedDecks.set(newDecks);
  
  return updatedDeck;
}

/**
 * Delete current deck
 */
export async function deleteDeck() {
  if (!db) throw new Error("Database not initialized");
  
  const decks = get(savedDecks);
  const index = get(currentDeckIndex);
  
  if (decks.length <= 1) {
    throw new Error("Cannot delete the last deck");
  }
  
  const deckToDelete = decks[index];
  if (deckToDelete.id) {
    await dbDeleteDeck(db, deckToDelete.id);
  }
  
  const newDecks = decks.filter((_, i) => i !== index);
  savedDecks.set(newDecks);
  currentDeckIndex.set(Math.max(0, index - 1));
}

/**
 * Update deck name
 */
export async function updateDeckName(name: string) {
  const cards = get(deckCards);
  return saveDeck(name, cards);
}

/**
 * Add card to current deck
 */
export async function addCardToDeck(card: any) {
  const cards = get(deckCards);
  const name = get(deckName);
  
  const existingIndex = cards.findIndex((item) => item.id === card.id);
  let newCards;
  
  if (existingIndex !== -1) {
    newCards = [...cards];
    newCards[existingIndex] = {
      ...newCards[existingIndex],
      LM_quantity: newCards[existingIndex].LM_quantity + 1
    };
  } else {
    newCards = [...cards, { 
      id: card.id,
      name: card.name,
      image_uris: card.image_uris,
      card_faces: card.card_faces,
      mana_cost: card.mana_cost,
      type_line: card.type_line,
      LM_quantity: 1
    }];
  }
  
  return saveDeck(name, newCards);
}

/**
 * Remove card from current deck
 */
export async function removeCardFromDeck(card: any) {
  const cards = get(deckCards);
  const name = get(deckName);
  
  const existingIndex = cards.findIndex((item) => item.id === card.id);
  if (existingIndex === -1) return;
  
  let newCards;
  
  if (cards[existingIndex].LM_quantity > 1) {
    newCards = [...cards];
    newCards[existingIndex] = {
      ...newCards[existingIndex],
      LM_quantity: newCards[existingIndex].LM_quantity - 1
    };
  } else {
    newCards = cards.filter((_, i) => i !== existingIndex);
  }
  
  return saveDeck(name, newCards);
}

/**
 * Import deck from text
 */
export async function importDeckFromText(text: string) {
  const lines = text.split('\n').filter(line => line.trim());
  const newCards = [];
  let newName = get(deckName);

  for (const line of lines) {
    if (line.startsWith('#')) {
      newName = line.replace('#', '').trim();
      continue;
    }

    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const quantity = parseInt(match[1]);
      const cardName = match[2].trim();

      try {
        const response = await fetch(
          `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`
        );
        if (response.ok) {
          const card = await response.json();
          newCards.push({ 
            id: card.id,
            name: card.name,
            image_uris: card.image_uris,
            card_faces: card.card_faces,
            mana_cost: card.mana_cost,
            type_line: card.type_line,
            LM_quantity: quantity
          });
        }
      } catch (error) {
        console.error(`Failed to import ${cardName}`);
      }
    }
  }

  return saveDeck(newName, newCards);
}

/**
 * Export current deck to text
 */
export function exportDeckToText() {
  const name = get(deckName);
  const cards = get(deckCards);
  
  let deckText = `# ${name}\n\n`;
  cards.forEach(card => {
    deckText += `${card.LM_quantity} ${card.name}\n`;
  });
  
  return deckText;
}