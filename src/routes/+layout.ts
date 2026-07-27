// Static SPA: prerender the HTML shell (all data lives client-side in IndexedDB).
export const prerender = true;

// Emit `collection/index.html` rather than `collection.html`, so plain static
// hosts (Apache, nginx, python -m http.server) resolve every route without
// rewrite rules. Bare `/collection` then 301s to `/collection/` for free.
export const trailingSlash = 'always';
