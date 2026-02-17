/**
 * Yjs integration for LM Deck Tools
 * Provides CRDT-based data synchronization and merging
 * 
 * Install: npm install yjs
 */

import * as Y from 'yjs';
import type { StoreInterface } from './store.svelte';
import type { Deck, Card, CollectionCard } from './db';

/**
 * Convert decks to a Yjs document
 */
export function decksToYDoc(decks: Deck[]): Y.Doc {
  const ydoc = new Y.Doc();
  const yDecks = ydoc.getMap('decks');
  
  // Use deck name as key for automatic merging
  for (const deck of decks) {
    const yDeck = new Y.Map();
    yDeck.set('id', deck.id);
    yDeck.set('name', deck.name);
    yDeck.set('created_at', deck.created_at);
    yDeck.set('updated_at', deck.updated_at);
    
    // Store cards as a map keyed by card ID
    const yCards = new Y.Map();
    for (const card of deck.deck_cards) {
      const yCard = new Y.Map();
      yCard.set('id', card.id);
      yCard.set('name', card.name);
      yCard.set('mana_cost', card.mana_cost || '');
      yCard.set('LM_quantity', card.LM_quantity);
      
      // Store other card properties
      for (const [key, value] of Object.entries(card)) {
        if (!['id', 'name', 'mana_cost', 'LM_quantity'].includes(key)) {
          yCard.set(key, value);
        }
      }
      
      yCards.set(card.id, yCard);
    }
    
    yDeck.set('cards', yCards);
    yDecks.set(deck.name, yDeck);
  }
  
  return ydoc;
}

/**
 * Convert a Yjs document back to deck array
 */
export function yDocToDecks(ydoc: Y.Doc): Deck[] {
  const yDecks = ydoc.getMap('decks');
  const decks: Deck[] = [];
  
  yDecks.forEach((yDeck: Y.Map<any>, deckName: string) => {
    const yCards = yDeck.get('cards') as Y.Map<Y.Map<any>>;
    const cards: Card[] = [];
    
    yCards.forEach((yCard: Y.Map<any>, cardId: string) => {
      const card: Card = {
        id: cardId,
        name: yCard.get('name'),
        mana_cost: yCard.get('mana_cost'),
        LM_quantity: yCard.get('LM_quantity')
      };
      
      // Add other properties
      yCard.forEach((value, key) => {
        if (!['id', 'name', 'mana_cost', 'LM_quantity'].includes(key)) {
          card[key] = value;
        }
      });
      
      cards.push(card);
    });
    
    decks.push({
      id: yDeck.get('id'),
      name: deckName,
      deck_cards: cards,
      created_at: yDeck.get('created_at'),
      updated_at: yDeck.get('updated_at')
    });
  });
  
  return decks;
}

/**
 * Export decks to Yjs binary format
 */
export function exportDecksAsYjs(decks: Deck[]): Uint8Array {
  const ydoc = decksToYDoc(decks);
  return Y.encodeStateAsUpdate(ydoc);
}

/**
 * Import decks from Yjs binary format
 */
export function importDecksFromYjs(data: Uint8Array): Deck[] {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, data);
  return yDocToDecks(ydoc);
}

/**
 * Merge two sets of decks using Yjs CRDT
 * This automatically handles conflicts and combines changes
 */
export function mergeDecks(localDecks: Deck[], remoteDecks: Deck[]): Deck[] {
  // Create local doc
  const localDoc = decksToYDoc(localDecks);
  
  // Create remote doc
  const remoteDoc = decksToYDoc(remoteDecks);
  
  // Get updates from remote
  const remoteUpdate = Y.encodeStateAsUpdate(remoteDoc);
  
  // Apply remote updates to local (this is where Yjs magic happens)
  Y.applyUpdate(localDoc, remoteUpdate);
  
  // Convert back to deck array
  return yDocToDecks(localDoc);
}

/**
 * Merge card quantities when the same card appears in both decks
 * This is a specialized merge for card quantities
 */
export function mergeCardQuantities(localDecks: Deck[], remoteDecks: Deck[]): Deck[] {
  const ydoc = decksToYDoc(localDecks);
  const yDecks = ydoc.getMap('decks');
  
  // Process each remote deck
  for (const remoteDeck of remoteDecks) {
    const existingYDeck = yDecks.get(remoteDeck.name) as Y.Map<any> | undefined;
    
    if (existingYDeck) {
      // Deck exists - merge cards
      const existingYCards = existingYDeck.get('cards') as Y.Map<Y.Map<any>>;
      
      for (const remoteCard of remoteDeck.deck_cards) {
        const existingYCard = existingYCards.get(remoteCard.id) as Y.Map<any> | undefined;
        
        if (existingYCard) {
          // Card exists - add quantities
          const currentQuantity = existingYCard.get('LM_quantity') as number;
          existingYCard.set('LM_quantity', currentQuantity + remoteCard.LM_quantity);
        } else {
          // New card - add it
          const yCard = new Y.Map();
          yCard.set('id', remoteCard.id);
          yCard.set('name', remoteCard.name);
          yCard.set('mana_cost', remoteCard.mana_cost || '');
          yCard.set('LM_quantity', remoteCard.LM_quantity);
          
          for (const [key, value] of Object.entries(remoteCard)) {
            if (!['id', 'name', 'mana_cost', 'LM_quantity'].includes(key)) {
              yCard.set(key, value);
            }
          }
          
          existingYCards.set(remoteCard.id, yCard);
        }
      }
      
      // Update timestamp
      existingYDeck.set('updated_at', Math.max(
        existingYDeck.get('updated_at'),
        remoteDeck.updated_at
      ));
    } else {
      // New deck - add it
      const yDeck = new Y.Map();
      yDeck.set('name', remoteDeck.name);
      yDeck.set('created_at', remoteDeck.created_at);
      yDeck.set('updated_at', remoteDeck.updated_at);
      
      const yCards = new Y.Map();
      for (const card of remoteDeck.deck_cards) {
        const yCard = new Y.Map();
        yCard.set('id', card.id);
        yCard.set('name', card.name);
        yCard.set('mana_cost', card.mana_cost || '');
        yCard.set('LM_quantity', card.LM_quantity);
        
        for (const [key, value] of Object.entries(card)) {
          if (!['id', 'name', 'mana_cost', 'LM_quantity'].includes(key)) {
            yCard.set(key, value);
          }
        }
        
        yCards.set(card.id, yCard);
      }
      
      yDeck.set('cards', yCards);
      yDecks.set(remoteDeck.name, yDeck);
    }
  }
  
  return yDocToDecks(ydoc);
}

/**
 * Create a compressed export with metadata
 */
export function exportWithMetadata(store: StoreInterface): Uint8Array {
  const ydoc = new Y.Doc();
  
  // Add metadata
  const yMeta = ydoc.getMap('metadata');
  yMeta.set('version', '1.0');
  yMeta.set('exported_at', Date.now());
  yMeta.set('app', 'LM Deck Tools');

  // Add collection
  const yCollection = ydoc.getMap('collection');
  for (const card of store.collection) {
    const yCard = new Y.Map();
    for (const [key, value] of Object.entries(card)) {
      yCard.set(key, value);
    }
    yCollection.set(card.id, yCard);
  }

  return Y.encodeStateAsUpdate(ydoc);
  
  // Add decks
  const yDecks = ydoc.getMap('decks');
  for (const deck of decks) {
    const yDeck = new Y.Map();
    yDeck.set('id', deck.id);
    yDeck.set('name', deck.name);
    yDeck.set('created_at', deck.created_at);
    yDeck.set('updated_at', deck.updated_at);
    
    const yCards = new Y.Map();
    for (const card of deck.deck_cards) {
      const yCard = new Y.Map();
      for (const [key, value] of Object.entries(card)) {
        yCard.set(key, value);
      }
      yCards.set(card.id, yCard);
    }
    
    yDeck.set('cards', yCards);
    yDecks.set(deck.name, yDeck);
  }
  
  return Y.encodeStateAsUpdate(ydoc);
}

/**
 * Import with metadata validation
 */
export function importWithMetadata(data: Uint8Array): {
  decks: Deck[];
  metadata: {
    version: string;
    exported_at: number;
    app: string;
    total_decks: number;
    total_cards: number;
  };
} {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, data);
  
  const yMeta = ydoc.getMap('metadata');
  const metadata = {
    version: yMeta.get('version') as string,
    exported_at: yMeta.get('exported_at') as number,
    app: yMeta.get('app') as string,
    total_decks: yMeta.get('total_decks') as number,
    total_cards: yMeta.get('total_cards') as number
  };
  
  const decks = yDocToDecks(ydoc);
  
  return { decks, metadata };
}

/**
 * Calculate diff between two deck collections
 */
export function calculateDiff(localDecks: Deck[], remoteDecks: Deck[]): {
  added: string[];
  removed: string[];
  modified: string[];
  cardChanges: { [deckName: string]: { added: number; removed: number; modified: number } };
} {
  const localNames = new Set(localDecks.map(d => d.name));
  const remoteNames = new Set(remoteDecks.map(d => d.name));
  
  const added = Array.from(remoteNames).filter(name => !localNames.has(name));
  const removed = Array.from(localNames).filter(name => !remoteNames.has(name));
  const common = Array.from(localNames).filter(name => remoteNames.has(name));
  
  const modified: string[] = [];
  const cardChanges: { [deckName: string]: { added: number; removed: number; modified: number } } = {};
  
  for (const deckName of common) {
    const localDeck = localDecks.find(d => d.name === deckName)!;
    const remoteDeck = remoteDecks.find(d => d.name === deckName)!;
    
    const localCardIds = new Set(localDeck.deck_cards.map(c => c.id));
    const remoteCardIds = new Set(remoteDeck.deck_cards.map(c => c.id));
    
    const addedCards = Array.from(remoteCardIds).filter(id => !localCardIds.has(id));
    const removedCards = Array.from(localCardIds).filter(id => !remoteCardIds.has(id));
    const commonCards = Array.from(localCardIds).filter(id => remoteCardIds.has(id));
    
    const modifiedCards = commonCards.filter(id => {
      const localCard = localDeck.deck_cards.find(c => c.id === id)!;
      const remoteCard = remoteDeck.deck_cards.find(c => c.id === id)!;
      return localCard.LM_quantity !== remoteCard.LM_quantity;
    });
    
    if (addedCards.length > 0 || removedCards.length > 0 || modifiedCards.length > 0) {
      modified.push(deckName);
      cardChanges[deckName] = {
        added: addedCards.length,
        removed: removedCards.length,
        modified: modifiedCards.length
      };
    }
  }
  
  return { added, removed, modified, cardChanges };
}
