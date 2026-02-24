autolog localhost problems:

Svelte’s "vibe" is all about simplicity, but navigation errors can be sneaky because SvelteKit handles a lot of the heavy lifting behind the scenes. To catch these automatically on your dev branch, you need to hook into the SvelteKit Error Handling lifecycle.

Here is how to set up an automated "trap" for navigation and rendering errors.

1. The Global Collector (hooks.js)
   SvelteKit provides a specific hook called handleError. This is the most efficient way to collect errors because it catches both server-side crashes and client-side navigation failures.

In your src/hooks.client.js (for browser errors) or src/hooks.server.js (for SSR errors):

```JavaScript
/** @type {import('@sveltejs/kit').HandleClientError} */
export function handleError({ error, event }) {
    const errorId = crypto.randomUUID();

    // The "Vibe Check" Log
    console.error(`🚨 Nav Error [${errorId}] at ${event.url.pathname}:`, error);

    // Automation: Send this to a local logging endpoint or
    // simply save it to a 'logs.json' if you have a dev server running
    return {
        message: 'Whoops! Navigation hit a snag.',
        errorId
    };
}
```

UX indication of on progress Import file in deck list.
Button "Add all to collection" from the CardList view.
Add single card to the collection from the cardlist view.
Modify quantity of added card in list.
There's no way to change name of a card list -> the title should be modifiable.
Add single cards from search to a card list fails with "Failed to add card". Nothing in console.

To even enter the conversation, your app must match these:

a. The "Shift+Enter" Workflow: Moxfield’s speed comes from a "keyboard-first" design. You can add a card, set its quantity, and tag it without ever touching your mouse.

b. Social & Primers: It acts as a blog for deckbuilders. A "Primer" on Moxfield is essentially the Wikipedia page for a specific deck's strategy.

c. "Strict Assignment" & Inventory Perfection.
Currently, most apps struggle to track exactly which physical copy of a card is in which deck.

The Feature: A system that says: "You own 3 copies of Rhystic Study. They are in Decks A, B, and C. If you try to add it to Deck D, it flags that you need to buy/proxy another copy." Moxfield is working on this, but it’s a complex data problem users are desperate for.
