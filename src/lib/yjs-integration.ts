/**
 * Yjs integration for LM Deck Tools
 * Provides CRDT-based data synchronization and merging
 *
 * Install: npm install yjs
 */

import * as Y from 'yjs';
import type { StoreInterface } from './store.svelte';
import type { CardList, Card, CollectionCard } from './db';

/**
 * Convert card lists to a Yjs document
 */
export function cardListsToYDoc(cardLists: CardList[]): Y.Doc {
  const ydoc = new Y.Doc();
  const yCardLists = ydoc.getMap('card_lists');

  // Use list name as key for automatic merging
  for (const cardList of cardLists) {
    const yList = new Y.Map();
    yList.set('id', cardList.id);
    yList.set('name', cardList.name);
    yList.set('cardMatching', cardList.cardMatching);
    yList.set('languageMatching', cardList.languageMatching);
    yList.set('created_at', cardList.created_at);
    yList.set('updated_at', cardList.updated_at);

    // Store cards as a map keyed by card ID
    const yCards = new Y.Map();
    for (const card of cardList.cards) {
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

    yList.set('cards', yCards);
    yCardLists.set(cardList.name, yList);
  }

  return ydoc;
}

/**
 * Convert a Yjs document back to card list array
 */
export function yDocToCardLists(ydoc: Y.Doc): CardList[] {
  const yCardLists = ydoc.getMap('card_lists');
  const cardLists: CardList[] = [];

  yCardLists.forEach((yList: Y.Map<any>, listName: string) => {
    const yCards = yList.get('cards') as Y.Map<Y.Map<any>>;
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

    cardLists.push({
      id: yList.get('id'),
      name: listName,
      cards,
      cardMatching: yList.get('cardMatching') ?? 'generic',
      languageMatching: yList.get('languageMatching') ?? 'any',
      created_at: yList.get('created_at'),
      updated_at: yList.get('updated_at')
    });
  });

  return cardLists;
}

/**
 * Export card lists to Yjs binary format
 */
export function exportCardListsAsYjs(cardLists: CardList[]): Uint8Array {
  const ydoc = cardListsToYDoc(cardLists);
  return Y.encodeStateAsUpdate(ydoc);
}

/**
 * Import card lists from Yjs binary format
 */
export function importCardListsFromYjs(data: Uint8Array): CardList[] {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, data);
  return yDocToCardLists(ydoc);
}

/**
 * Merge two sets of card lists using Yjs CRDT
 * This automatically handles conflicts and combines changes
 */
export function mergeCardLists(localLists: CardList[], remoteLists: CardList[]): CardList[] {
  // Create local doc
  const localDoc = cardListsToYDoc(localLists);

  // Create remote doc
  const remoteDoc = cardListsToYDoc(remoteLists);

  // Get updates from remote
  const remoteUpdate = Y.encodeStateAsUpdate(remoteDoc);

  // Apply remote updates to local (this is where Yjs magic happens)
  Y.applyUpdate(localDoc, remoteUpdate);

  // Convert back to card list array
  return yDocToCardLists(localDoc);
}

/**
 * Merge card quantities when the same card appears in both lists
 * This is a specialized merge for card quantities
 */
export function mergeListCardQuantities(localLists: CardList[], remoteLists: CardList[]): CardList[] {
  const ydoc = cardListsToYDoc(localLists);
  const yCardLists = ydoc.getMap('card_lists');

  // Process each remote list
  for (const remoteList of remoteLists) {
    const existingYList = yCardLists.get(remoteList.name) as Y.Map<any> | undefined;

    if (existingYList) {
      // List exists - merge cards
      const existingYCards = existingYList.get('cards') as Y.Map<Y.Map<any>>;

      for (const remoteCard of remoteList.cards) {
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
      existingYList.set('updated_at', Math.max(
        existingYList.get('updated_at'),
        remoteList.updated_at
      ));
    } else {
      // New list - add it
      const yList = new Y.Map();
      yList.set('name', remoteList.name);
      yList.set('cardMatching', remoteList.cardMatching);
      yList.set('languageMatching', remoteList.languageMatching);
      yList.set('created_at', remoteList.created_at);
      yList.set('updated_at', remoteList.updated_at);

      const yCards = new Y.Map();
      for (const card of remoteList.cards) {
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

      yList.set('cards', yCards);
      yCardLists.set(remoteList.name, yList);
    }
  }

  return yDocToCardLists(ydoc);
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

  // Add card lists
  const yCardLists = ydoc.getMap('card_lists');
  for (const cardList of store.savedCardLists) {
    const yList = new Y.Map();
    yList.set('id', cardList.id);
    yList.set('name', cardList.name);
    yList.set('cardMatching', cardList.cardMatching);
    yList.set('languageMatching', cardList.languageMatching);
    yList.set('created_at', cardList.created_at);
    yList.set('updated_at', cardList.updated_at);

    const yCards = new Y.Map();
    for (const card of cardList.cards) {
      const yCard = new Y.Map();
      for (const [key, value] of Object.entries(card)) {
        yCard.set(key, value);
      }
      yCards.set(card.id, yCard);
    }

    yList.set('cards', yCards);
    yCardLists.set(cardList.name, yList);
  }

  return Y.encodeStateAsUpdate(ydoc);
}

/**
 * Import with metadata validation
 */
export function importWithMetadata(data: Uint8Array): {
  cardLists: CardList[];
  metadata: {
    version: string;
    exported_at: number;
    app: string;
    total_lists: number;
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
    total_lists: yMeta.get('total_lists') as number,
    total_cards: yMeta.get('total_cards') as number
  };

  const cardLists = yDocToCardLists(ydoc);

  return { cardLists, metadata };
}

/**
 * Calculate diff between two card list collections
 */
export function calculateDiff(localLists: CardList[], remoteLists: CardList[]): {
  added: string[];
  removed: string[];
  modified: string[];
  cardChanges: { [listName: string]: { added: number; removed: number; modified: number } };
} {
  const localNames = new Set(localLists.map(d => d.name));
  const remoteNames = new Set(remoteLists.map(d => d.name));

  const added = Array.from(remoteNames).filter(name => !localNames.has(name));
  const removed = Array.from(localNames).filter(name => !remoteNames.has(name));
  const common = Array.from(localNames).filter(name => remoteNames.has(name));

  const modified: string[] = [];
  const cardChanges: { [listName: string]: { added: number; removed: number; modified: number } } = {};

  for (const listName of common) {
    const localList = localLists.find(d => d.name === listName)!;
    const remoteList = remoteLists.find(d => d.name === listName)!;

    const localCardIds = new Set(localList.cards.map(c => c.id));
    const remoteCardIds = new Set(remoteList.cards.map(c => c.id));

    const addedCards = Array.from(remoteCardIds).filter(id => !localCardIds.has(id));
    const removedCards = Array.from(localCardIds).filter(id => !remoteCardIds.has(id));
    const commonCards = Array.from(localCardIds).filter(id => remoteCardIds.has(id));

    const modifiedCards = commonCards.filter(id => {
      const localCard = localList.cards.find(c => c.id === id)!;
      const remoteCard = remoteList.cards.find(c => c.id === id)!;
      return localCard.LM_quantity !== remoteCard.LM_quantity;
    });

    if (addedCards.length > 0 || removedCards.length > 0 || modifiedCards.length > 0) {
      modified.push(listName);
      cardChanges[listName] = {
        added: addedCards.length,
        removed: removedCards.length,
        modified: modifiedCards.length
      };
    }
  }

  return { added, removed, modified, cardChanges };
}
