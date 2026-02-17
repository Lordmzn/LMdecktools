/**
 * Database utilities for LM Deck Tools
 * Provides transparent IndexedDB operations with import/export capabilities
 */

export interface Deck {
  id?: number;
  name: string;
  deck_cards: Card[];
  created_at: number;
  updated_at: number;
}

export interface Card {
  id: string;  // TODO scryfall_id would be better
  LM_quantity: number;
  name: string;  // TODO remove?
  mana_cost?: string;  // TODO remove?
  [key: string]: any;
}

export interface CollectionCard {
  id: string;
  name: string;
  quantity_owned: number;
  image_uris?: any;
  card_faces?: any;
  mana_cost?: string;
  type_line?: string;
  set?: string;
  set_name?: string;
  [key: string]: any;
}

const DB_NAME = "LMdecktools";
const DB_VERSION = 2;
const STORE_NAME = "decks";
const COLLECTION_STORE = "collection";
const METADATA_STORE = "metadata";

/**
 * Check local DB existence
 */
export async function checkLocalDatabase(): Promise<boolean> {
  try {
    return indexedDB.databases().then(
      (dbs) => dbs.map(db => db.name).includes(DB_NAME),
      (err) => false
    );
  } catch (error) {
    console.warn("Browser doesn't support indexedDB.databases()");
    return false;
  }
}

/**
 * Open or create the IndexedDB database
 */
export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Database error: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };


    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create decks store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { 
          keyPath: 'id',
          autoIncrement: true 
        });
        objectStore.createIndex('name', 'name', { unique: false });
        objectStore.createIndex('updated_at', 'updated_at', { unique: false });
      }

      // Create collection store if it doesn't exist
      if (!db.objectStoreNames.contains(COLLECTION_STORE)) {
        db.createObjectStore(COLLECTION_STORE, { keyPath: 'id' });
      }

      // Create metadata store for tracking changes
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
      }
    };
  });
}

/**
 * Clear all data from the database
 */
export async function clearDatabase(db: IDBDatabase): Promise<void> {
  return Promise.all([
    new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        updateMetadata(db, 'last_clear', Date.now());
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear database: ${request.error?.message}`));
      };
    }),
    new Promise((resolve, reject) => {
      const transaction = db.transaction(COLLECTION_STORE, 'readwrite');
      const store = transaction.objectStore(COLLECTION_STORE);
      const request = store.clear();

      request.onsuccess = () => {
        updateMetadata(db, 'last_clear', Date.now());
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to clear database: ${request.error?.message}`));
      };
    })
  ]);
}

/**
 * Load all decks from the database
 */
export async function loadAllDecks(db: IDBDatabase): Promise<Deck[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`Failed to load decks: ${request.error?.message}`));
    };
  });
}

/**
 * Save a deck to the database
 */
export async function saveDeck(db: IDBDatabase, deck: Deck): Promise<number> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const deckToSave = {
      ...deck,
      updated_at: Date.now()
    };

    const request = deck.id 
      ? store.put(deckToSave)
      : store.add(deckToSave);

    request.onsuccess = () => {
      updateMetadata(db, 'last_save', Date.now());
      resolve(request.result as number);
    };

    request.onerror = () => {
      reject(new Error(`Failed to save deck: ${request.error?.message}`));
    };
  });
}

/**
 * Delete a deck from the database
 */
export async function deleteDeck(db: IDBDatabase, deckId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(deckId);

    request.onsuccess = () => {
      updateMetadata(db, 'last_save', Date.now());
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to delete deck: ${request.error?.message}`));
    };
  });
}

/**
 * Update metadata in the database
 */
async function updateMetadata(db: IDBDatabase, key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(METADATA_STORE, 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    const request = store.put({ key, value, timestamp: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get metadata in the database
 */
export async function getMetadata(db: IDBDatabase, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(METADATA_STORE, 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Find a deck by name
 */
async function findDeckByName(db: IDBDatabase, name: string): Promise<Deck | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('name');
    const request = index.get(name);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error(`Failed to find deck: ${request.error?.message}`));
    };
  });
}

/**
 * Merge two card lists, combining quantities for matching cards
 */
function mergeCards(existing: Card[], incoming: Card[]): Card[] {
  const cardMap = new Map<string, Card>();

  // Add existing cards
  for (const card of existing) {
    cardMap.set(card.id, { ...card });
  }

  // Merge incoming cards
  for (const card of incoming) {
    const existingCard = cardMap.get(card.id);
    if (existingCard) {
      existingCard.LM_quantity += card.LM_quantity;
    } else {
      cardMap.set(card.id, { ...card });
    }
  }

  return Array.from(cardMap.values());
}

/**
 * Create a new empty deck with default values
 */
export function createEmptyDeck(): Deck {
  return {
    name: "Nuovo mazzo",
    deck_cards: [],
    created_at: Date.now(),
    updated_at: Date.now()
  };
}

// ==================== COLLECTION FUNCTIONS ====================

/**
 * Load all cards from the collection
 */
export async function loadCollection(db: IDBDatabase): Promise<CollectionCard[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COLLECTION_STORE, 'readonly');
    const store = transaction.objectStore(COLLECTION_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(new Error(`Failed to load collection: ${request.error?.message}`));
    };
  });
}

/**
 * Add or update a card in the collection
 */
export async function saveCollectionCard(db: IDBDatabase, card: CollectionCard): Promise<CollectionCard> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COLLECTION_STORE, 'readwrite');
    const store = transaction.objectStore(COLLECTION_STORE);
    const request = store.put(card);

    request.onsuccess = () => {
      resolve(card);
    };

    request.onerror = () => {
      reject(new Error(`Failed to save card: ${request.error?.message}`));
    };
  });
}

/**
 * Delete a card from the collection
 */
export async function deleteCollectionCard(db: IDBDatabase, cardId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COLLECTION_STORE, 'readwrite');
    const store = transaction.objectStore(COLLECTION_STORE);
    const request = store.delete(cardId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error(`Failed to delete card: ${request.error?.message}`));
    };
  });
}

/**
 * Get a specific card from the collection
 */
export async function getCollectionCard(db: IDBDatabase, cardId: string): Promise<CollectionCard | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(COLLECTION_STORE, 'readonly');
    const store = transaction.objectStore(COLLECTION_STORE);
    const request = store.get(cardId);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get card: ${request.error?.message}`));
    };
  });
}

