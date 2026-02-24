# Project Plan: LM Deck Tools

This document outlines the product vision, strategy, and execution plan for LM Deck Tools, a Magic: The Gathering collection and deck list manager.

## 1. Initial Vision: The "Generic" MTG Tool

The initial concept for LM Deck Tools was a comprehensive, web-based platform for Magic: The Gathering players. This "blue sky" version would have included a wide array of features commonly found in established market players, such as:

- **Cloud-based User Accounts:** Users would sign up and have their collections and decks stored on a central server, accessible from any device.
- **Social Features:** Deck sharing, public profiles, following other creators, and commenting on or rating decks.
- **Advanced Deck Analytics:** In-depth analysis of mana curves, color distribution, deck price history, and automated suggestions.
- **Marketplace Integration:** Direct integration with online card retailers to price collections and purchase missing cards.
- **Automated Data Sync:** Real-time synchronization of data across multiple devices.

This vision, while ambitious, would require significant backend infrastructure, ongoing maintenance, and would raise important questions about data privacy and cost.

## 2. Strategic Pivot: Defining a Niche and Core Principles

To build a unique and viable product as a solo developer, a strategic decision was made to "prune" the initial vision and focus on a specific niche. This was driven by three core principles that would become the project's key differentiators:

**Principle 1: Zero Backend, Zero Cost.**
The project is committed to having no server-side backend. This immediately eliminates server hosting costs, database maintenance, and the complexities of backend development. It makes the project economically viable to maintain indefinitely.

**Principle 2: Absolute User Privacy.**
In a world where data is a commodity, LM Deck Tools takes a strong stance on privacy. With no backend, no user accounts, and no data tracking, all user information (card collections, lists) remains exclusively on the user's local machine. This is a powerful feature for users who are increasingly wary of how their data is used.

**Principle 3: User-Controlled, File-Based Data.**
Instead of locking user data in a proprietary cloud ecosystem, this project empowers users with direct ownership. The integration with Yjs allows the entire application state to be saved into a single `.yjs` file. This makes data tangible, portable, and easy to back up. Users can save their file, move it between computers, or store it wherever they choose, free from reliance on any external service.

## 3. The MVP: Executing on the Core Principles

The current, working version of LM Deck Tools is a direct result of executing on these principles. The features implemented, as detailed in the `user-stories.md` and `wireframes.md`, were carefully selected to deliver a complete and valuable experience within the defined constraints.

### How the Current Features Align with the Vision:

- **Database Management (`.yjs` files):** The features for creating, loading, and downloading the local database are the direct implementation of the **User-Controlled Data** principle. The "DB Selection Modal" is the gateway to this user-centric workflow.
- **No User Accounts:** The absence of a login or signup process is a deliberate design choice that directly enforces the **Absolute Privacy** and **Zero Backend** principles.
- **Scryfall API for Card Search:** By leveraging the excellent and free Scryfall API, the application provides comprehensive card data without needing to host and maintain a massive card database. This is a key part of the **Zero Cost** principle.
- **Collection & Card List Management:** These core features are implemented to work entirely client-side, proving that a rich user experience is possible without a backend. State management is handled locally, reinforcing the **Privacy** principle.
- **CSV and Text Export:** These features further empower the user by providing simple, universally compatible ways to get their data out of the app, reinforcing the **User-Controlled Data** principle.

## 4. Future Roadmap

The planned and experimental features below continue to align with the core principles.

### 4.1 Near-term

- **[planned] Import from `.yjs` or `.json` file:** This is the other half of the data ownership story, allowing users to restore backups or import data from other sources without needing a cloud sync.
- **[planned] Compare two card lists:** This is a valuable feature that can be built entirely on the client-side, adding utility without compromising the core principles.
- **[planned] Cache card images with the browser Cache API:** After their first load, Scryfall card images are stored in the browser's native Cache storage (`caches.open()`) and served locally on every subsequent visit. This reduces Scryfall API traffic, speeds up the UI, and keeps images available across sessions — all without a service worker, a server, or any extra dependency. Cache size is reported in the DB modal and the user can clear it on demand. Fully aligned with Zero Cost, Zero Backend, and Absolute Privacy.

### 4.2 File-Based Sync ("Bring Your Own Cloud")

The [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) (`showSaveFilePicker` / `createWritable`) enables a browser app to hold a persistent, writable handle to a file the user has explicitly chosen via the OS file picker. LM Deck Tools will use this to implement silent auto-save: every state change writes the current `.yjs` snapshot to the linked file without user intervention.

This approach aligns squarely with all three core principles:

- **Zero Backend:** The write goes directly from the browser to the local filesystem — no server is involved at any point.
- **Absolute Privacy:** The file never leaves the user's machine unless they choose to copy or sync it manually.
- **User-Controlled Data:** The user picks the file location. Placing that file inside a cloud-synced folder (Dropbox, iCloud Drive, OneDrive, Google Drive for Desktop) gives them cross-device access using infrastructure they already own and control — hence "Bring Your Own Cloud."

The one UX constraint this feature imposes: browsers require a user gesture to grant write access, and the permission is not stored across sessions. The app will request permission once per session (on the first post-load write attempt, or when the user explicitly clicks "Reconnect to File"), and will display a clear status panel in the DB modal showing the link state, the filename and path, the time of last successful save, and any error conditions.

Browser support caveat: the File System Access API is available in Chrome 86+, Edge 86+, and Safari 15.2+. Firefox does not support it as of mid-2025. The feature will degrade gracefully — users on unsupported browsers will not see the linking controls.

### 4.3 P2P QR Sync (experimental)

As a longer-term experiment, LM Deck Tools may support direct device-to-device sync via a QR code pairing flow built on `y-webrtc` (the Yjs WebRTC provider). One device generates a QR code encoding a room ID; the second device scans it, and a WebRTC data channel carries the Yjs CRDT updates between the two without routing data through any application server.

This feature remains strictly experimental for two reasons: (a) WebRTC still requires a short-lived signaling exchange (typically via a public STUN/TURN service) to establish the peer connection, which introduces a transient dependency on an external server; (b) merge semantics for concurrent edits — particularly quantity decrements and list deletions — need careful validation before the feature can be considered reliable. Development will not begin until the File-Based Sync feature is stable and the signaling dependency question is resolved in a way that does not compromise the Absolute Privacy principle.

By deliberately choosing a focused, backend-less architecture, LM Deck Tools carves out a unique identity in a crowded market. It is not just another deck builder; it is a statement on privacy, data ownership, and sustainable solo development.

## 5. Business Strategy

### 5.1 Monetization: Low-Overhead Sustainability

The Zero Backend principle rules out any business model that depends on fixed infrastructure costs. All revenue streams must be passive and merit-based.

**Affiliate Marketing**
Integrate with the TCGplayer Affiliate Program by surfacing "Buy Missing Cards" links on deck lists and the missing-cards view. The app already knows which cards a user needs to complete a list; a contextual affiliate link turns that insight into commission revenue with zero extra friction. This is the same model used by Moxfield and other established competitors.

**Community Support (Patreon / Donations)**
WotC's Fan Content Policy generally prohibits charging for access to fan tools that use their IP. A Patreon or donation model sidesteps this by letting users become patrons who fund ongoing development rather than paying for content. This also strengthens the community relationship and keeps the tool in the "hobby project" category from a legal standpoint.

**Privacy-First Advertising**
If display advertising is added (e.g., Google AdSense), ads must be non-intrusive and must not introduce any third-party tracking that conflicts with the Absolute Privacy principle. Passive, contextual ad revenue is a standard route for niche tools and does not constitute "commercial activity" under most fan-content interpretations.

### 5.2 Strategic Positioning: "Privacy as a Product"

The project's competitive moat is not feature parity with Moxfield or Archidekt — it is the combination of privacy and data ownership that no backend-dependent tool can match.

- **The Privacy Niche.** Target users who are wary of data tracking and high-value collectors who do not want their inventory exposed to third-party servers. The value proposition ("your collection never leaves your machine") is simple to communicate and difficult for cloud-based competitors to copy.
- **UX-Driven Retention.** Complexity is a churn driver. Following established UX conventions — clean interfaces, familiar interaction patterns, progressive disclosure of advanced features — lowers the learning curve and keeps casual users engaged alongside power users.
- **Data Portability as a Feature.** Actively market the `.yjs` export and CSV export as user empowerment, not just backup mechanisms. "Take your data anywhere, no lock-in" is a credible differentiator in a category where most apps hold data hostage.

### 5.3 User Acquisition: Organic and Community-Driven

Without a marketing budget, growth must come from the MTG community itself.

- **Community Presence.** Establish and maintain active presence on Reddit (`r/magicTCG`, `r/mtgfinance`, `r/EDH`) and MTG Discord servers. These are the primary channels where players discover tools. Authentic participation — helping users, sharing updates, responding to feedback — builds word-of-mouth referrals.
- **Influencer Outreach.** Partner with MTG content creators (YouTube, Twitch, TikTok) to showcase the tool's unique privacy angle. A single feature highlight by a relevant creator can deliver significant organic installs. Target creators who already discuss collection management or budget brewing, where the missing-cards feature is most relevant.
- **Search Visibility.** Optimize the app's landing page and any store listings with targeted keywords ("MTG collection tracker", "offline deck builder", "private MTG tool") to capture organic search traffic from players already looking for alternatives to cloud-based tools.

### 5.4 Legal and IP Compliance

Long-term viability requires staying clearly within WotC's Fan Content Policy.

- **Non-Commercial Framing.** Offering the core tool for free keeps the project in the "fan content" category. Monetization via affiliates, donations, and passive ads is generally compatible with this status — direct paywalls on content are not.
- **Utility Over Assets.** Use the Scryfall API for all card data and imagery rather than hosting card art locally. This avoids the risk of IP claims related to reproducing branded visual assets at scale, and removes any need to maintain a card database.
- **No Unauthorized Set Data.** Do not scrape or redistribute WotC-owned data (rulings, set contents, legality lists) outside of what Scryfall's API already provides under its own terms of service.
