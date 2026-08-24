# Deployment

How LM Deck Tools gets from `pnpm run build` onto the public web (#25).

## Target

| | |
| --- | --- |
| URL | `https://www.lordmzn.it/decktools/` |
| Host | Tophost (shared Apache, `.htaccess` with mod_rewrite + mod_headers) |
| Transport | FTPS, explicit TLS, port 21 — `ftp.lordmzn.it` |
| FTP user | `lordmzn.it` — **one account for the whole domain** |
| Upload target | `/htdocs/decktools/` |
| Build output | `build/` — ~1 MB across ~60 files, against 200 MB of quota |
| DNS | nothing to do — `www.lordmzn.it` already resolves |

The FTP account's home contains `/.htaccess`, `/cgi-bin/`, `/conf/` and
`/htdocs/`. Sites live under `/htdocs`; the **main website is `/htdocs` itself**,
and this app is a subfolder of it.

### Why a subfolder and not `decktools.lordmzn.it`

Tophost issues TLS certificates for the registered domain only. Verified against
their server: the certificate presented for `www.lordmzn.it` carries exactly one
SAN and no wildcard, and a TLS request for `decktools.lordmzn.it` is answered
with **another tenant's certificate** from the shared node. A browser gets a hard
name mismatch.

Plain HTTP is not a fallback, because three features are secure-context only and
vanish outside HTTPS:

| API | Module | What stops working |
| --- | --- | --- |
| `caches` | `src/lib/image-cache.ts` | the whole Scryfall image cache |
| `showSaveFilePicker` / `showOpenFilePicker` | `src/lib/linked-file.ts` | the linked-file feature |
| `navigator.clipboard` | DB modal, compare, card lists | every copy-to-clipboard export |

`caches` is simply `undefined` there, so it throws rather than degrades. Hence
the subfolder, which costs a base path but keeps the certificate.

`www` and not the apex: the certificate has no SAN for `lordmzn.it`, and the
apex has no A record at all — only `www` resolves.

The trade-off accepted: **`kit.paths.base` is a build-time constant.** A build
made here cannot be served from any other path, local preview included, and
`pnpm run dev` serves the app at `/decktools/` too.

## What makes the build servable without server config

Three things, all already in the repo:

- **`trailingSlash = 'always'`** in `src/routes/+layout.ts` (#45). The adapter
  emits `collection/index.html` instead of `collection.html`, so Apache's
  DirectoryIndex resolves `/collection/` with no rewrite rule, and bare
  `/collection` 301s to it for free. Before this, every URL except `/` 404'd.
- **`kit.prerender.origin`** in `svelte.config.js`. Prerendering has no request
  to read a host from, so `url.origin` defaults to the placeholder
  `http://sveltekit-prerender` — which was being rendered into the Paraglide
  alternate-language links on every page. It must stay in sync with `SITE_URL`
  in `src/lib/site.ts`.
- **`static/.htaccess`**, copied verbatim into `build/` (the adapter includes
  dotfiles). It sets cache headers, the error document, and compression. Nothing
  in it is load-bearing for routing — if the host ignored it entirely, every URL
  would still resolve.
- **`kit.paths.base`** and, less obviously, **`kit.paths.relative = false`**.
  SvelteKit defaults `relative` to `true`, which makes `base` a relative string
  like `../..`. Paraglide computes nothing itself — it resolves each link against
  the *locale-stripped* URL, which is one segment shallower than the localised
  one the relative base was measured from. The `../..` then overshoots the base,
  Paraglide reads the target as external and leaves it untranslated, and every
  Italian nav link lands on the English page. Absolute paths remove the ambiguity.

### The parent `.htaccess`

`/htdocs/.htaccess` belongs to the main site and Apache applies it here too:

```apache
ErrorDocument 403 /__tmp/topweb.shtml
AddHandler php7.1-script .php
RewriteEngine On
RewriteCond %{HTTP:X-Forwarded-Proto} !https
RewriteCond %{HTTPS} off
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301,NE]
```

Benign, and useful: no catch-all rewrite to fight, and it forces HTTPS so this
app does not have to. Two consequences encoded in `static/.htaccess`:

- **It declares no `RewriteEngine` of its own.** mod_rewrite does not merge
  per-directory configurations — a `RewriteEngine On` in the child *replaces* the
  parent's rules rather than extending them, silently dropping the HTTPS redirect.
- **`ErrorDocument` paths are document-root-relative, and the document root is
  the main site.** So it reads `/decktools/404.html`; a bare `/404.html` would
  serve the main site's error page.

## Manifest and service worker

`docs/durability-convergence-transport.md` D3 makes installation a **storage**
feature — on iOS it is the only way site data survives a week — so this is part
of the app, not PWA garnish. Shipped in #89:
`src/routes/manifest.webmanifest/+server.ts`, `src/service-worker.ts`, and
`src/lib/service-worker-client.ts`, which registers it.

Three things bite on this host specifically, and all three are now encoded:

- **Scope is the base path.** A service worker registered from `/decktools/`
  controls `/decktools/` and below. That is what we want, and it is also why it
  must be served from inside the app directory rather than the domain root — a
  worker at `/sw.js` would claim the whole of `lordmzn.it`, which is somebody
  else's site. The manifest's `scope` says the same thing for the install.
- **`.webmanifest` needs a MIME type.** Apache does not know
  `application/manifest+json` on its own; `AddType` for it is in
  `static/.htaccess`. Without it some browsers refuse the manifest and the
  install prompt silently never appears.
- **The worker script must not be cached.** It falls under the same rule as HTML
  below — same filename across deploys, different contents — and a service worker
  pinned by a stale `Cache-Control` is the classic way to strand users on an old
  build with no way to push a fix. There is a `<Files "service-worker.js">`
  override with `must-revalidate`, and **it must stay below the `\.(js|css|woff2?)$`
  block**: `service-worker.js` matches that pattern too, Apache applies these
  sections in source order, and `Header set` replaces rather than merges. Reverse
  them and the worker quietly goes back to a one-year `immutable`.
  `manifest.test.ts` asserts the order.

Registration is explicit rather than SvelteKit's automatic one
(`kit.serviceWorker.register` is `false`), because the automatic version also
fires on the dev server, where the precache lists are empty — a live fetch
handler caching nothing, inside a Playwright suite that runs on `pnpm dev`.

The Android `share_target` entry needs the worker's fetch handler, which is why
this issue built one; the manifest entry and the receiving route land with the
rest of the file transports in #91. The existing decision to cache card images
through `caches.open()` *without* a worker (`project-vision.md` §4.1) is
unaffected — the worker ignores cross-origin requests entirely, and its
`activate` sweep is prefix-scoped so it cannot delete `lm-decktools-images`.

`tests/e2e/pwa.spec.ts` is the only spec that runs against the production build
(a second `webServer` in `playwright.config.ts`, on port 4174), for the same
reason registration is manual: none of this exists in dev.

## App icons

`static/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` and
`apple-touch-icon.png` are rendered from `docs/app-icon.html`, the same headless
Chrome route as the OG image:

```sh
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu --force-device-scale-factor=1 --hide-scrollbars \
  --window-size=512,512 --screenshot=icon-512.png docs/app-icon.html
"$CHROME" --headless --disable-gpu --force-device-scale-factor=1 --hide-scrollbars \
  --window-size=512,512 --screenshot=icon-maskable-512.png "docs/app-icon.html?maskable"
sips -z 192 192 icon-512.png --out static/icon-192.png
sips -z 180 180 icon-512.png --out static/apple-touch-icon.png
mv icon-512.png icon-maskable-512.png static/
```

PNG rather than JPEG, against the OG image's choice: these are flat vector art
with hard edges, where JPEG's ringing shows and its size advantage does not.

Two variants because platforms crop differently. The `maskable` one draws the
glyph at 52% so it survives inside the guaranteed-safe circle of 80% diameter
that Android's arbitrary launcher masks respect; the plain one fills 72% and is
what iOS and desktop show as given. One file serving both looks shrunken
everywhere that does not crop. **iOS reads `apple-touch-icon` and ignores the
manifest's `icons` entirely** — dropping that tag costs the icon on the one
platform where installing is the whole point.

## Caching

The rule that matters: **`_app/immutable/*` is content-hashed, HTML is not.**
Hashed assets get a year and `immutable`; HTML gets `must-revalidate`, because
its filename stays the same across deploys while the assets it references change
names. Cache the HTML and a returning visitor pins an old build forever.

Consequence for uploads: **push `_app/` before the HTML.** A visitor who loads
new HTML pointing at assets that have not landed yet gets a broken page. The
reverse order is harmless — old HTML referencing already-uploaded new assets just
means the new files sit unused for a moment.

## Manual deploy

The first deploy should be manual, and any deploy can be. Validate the real host
before automating anything.

```bash
pnpm run build
# then upload the *contents* of build/ into /htdocs/decktools/, _app/ first.
```

No panel step creates this folder — it is an ordinary directory inside the main
site, so the first upload brings it into existence. One thing left to confirm
before the first automated run, since a push to `master` now triggers one:

- **FTP is not IP-restricted.** GitHub Actions runners have rotating egress IPs;
  an allowlist on the account makes the job fail unpredictably.

Verify afterwards:

```bash
curl -sI https://www.lordmzn.it/decktools/collection/ | head -1        # 200
curl -sI https://www.lordmzn.it/decktools/it-it/card-lists/ | head -1  # 200
curl -sI https://www.lordmzn.it/decktools/nope/ | head -1              # 404, branded
curl -s https://www.lordmzn.it/decktools/sitemap.xml | head -3
```

And the one thing no local test can prove — that the main site still works:

```bash
curl -sI https://www.lordmzn.it/ | head -1                             # 200
```

### Local verification of the real layout

`pnpm run preview` serves the app at its base path, but not *inside* a parent
site. To reproduce that:

```bash
pnpm run build
mkdir -p /tmp/htdocs && cp -R build /tmp/htdocs/decktools
python3 -m http.server 8899 --directory /tmp/htdocs
# then browse http://localhost:8899/decktools/
```

This is what catches base-path mistakes: a link that escapes to `/collection/`
instead of `/decktools/collection/` 404s here and would land on the main site in
production.

## Automated deploy

`.github/workflows/deploy.yml` builds and uploads on every push to `master`, and
on manual dispatch (which offers a `dry-run` checkbox that logs what would be
uploaded without touching the server — use it after any change to the target
path).

### Configuration surface

Everything the deploy reads, and where each value lives:

| Name | Kind | Where it is set | Value |
| --- | --- | --- | --- |
| `FTP_SERVER` | repo secret | GitHub → Settings → Secrets | `ftp.lordmzn.it` |
| `FTP_USERNAME` | repo secret | GitHub → Settings → Secrets | `lordmzn.it` |
| `FTP_PASSWORD` | repo secret | GitHub → Settings → Secrets | set in the Tophost panel |
| `SERVER_DIR` | plain `env:` | `.github/workflows/deploy.yml` | `/htdocs/decktools/` |

**`SERVER_DIR` is deliberately not a secret, and not a repo variable.** Three
reasons, the last one being the point:

1. It is a path, not a credential — disclosure harms nothing.
2. GitHub masks secret values in logs, so the guard step's `Deploying to …`
   line would print `***` and a misdirected deploy would be undiagnosable.
3. It is the single value standing between a merge and the main website.
   In the workflow file, changing it requires a pull request and shows up as a
   diff. As a secret or a variable it could be repointed at `/htdocs` silently,
   by anyone with repo admin, with no review and no history.

The three credentials are secrets for the opposite reason: they are useless to
review and harmful to disclose.

Note the FTP account is the same one `Lordmzn/personal-website` uses. Rotating
the password in the Tophost panel invalidates both; update the secret in each
repo that still needs it.

### Why the target directory is guarded

Tophost sells one FTP account per domain, so this credential can write anywhere
under `lordmzn.it` — the main website included. There is no way to scope it down
at the host, so the scoping lives in the workflow:

- `SERVER_DIR` is set once, explicitly, to `/htdocs/decktools/`, and a guard step
  fails the job unless it is at least one level below `/htdocs`. `/htdocs/` and
  `/` are rejected.
- **`dangerous-clean-slate` is never set.** The action keeps a
  `.ftp-deploy-sync-state.json` manifest on the server and deletes only files it
  previously uploaded; on a first run with no manifest it deletes nothing. That
  option bypasses all of it and wipes the target directory — it must stay out.

**`Lordmzn/personal-website` must be disabled.** It deploys the main site with
`FTP-Deploy-Action@2.0.0`, `ARGS: --delete` and **no** remote directory — a
deleting sync against the login root. Now that this app lives *inside* that
tree at `/htdocs/decktools/`, a successful run there would delete it. The
workflow has no recorded runs and its Node 12 toolchain no longer works on
current runners, so it is dormant today; that is a reason to disable it, not a
reason to leave it.

### Credentials

The password is not recoverable. GitHub secrets are write-only — encrypted at
rest and injected only into running jobs — and the Tophost panel resets rather
than reveals. There is a known trick for making a workflow print its own secret
to the run log; **do not use it here**, because `personal-website` is a public
repository and its logs are world-readable. Reset the password instead, and
update the secret in both repos if the other one is ever revived.

### Not covered here: the desktop build

`durability-convergence-transport.md` S1 adds a Tauri desktop app, and this
document describes shipping exactly one artifact to one static host. That gap is
the real cost of the anchor — not the Rust. A second pipeline means per-platform
builds, macOS signing and notarisation, Windows signing, and hosting the binaries
somewhere with stable URLs. Direct download from lordmzn.it keeps it store-free
and AGPL-clean (`project-vision.md` §5.4), but nothing about the current deploy
generalises to it. Write that section when the first binary exists, not before.

One thing to decide early because it is a §5.5 question: **if the desktop app
ever checks for updates, that is the project's first background network request
to a host of our own.** The app has none today, and §5.5's closing rule says
anything fetching in the background does not belong in that table at all.

### What it does not do

CI (lint, type-check, unit, E2E) runs on the same push as a **separate**
workflow and does not gate this one. A failing test therefore still deploys; a
failing `pnpm run build` does not, since the job stops there. If gating matters
more than deploy latency, switch the trigger to `workflow_run` on CI completion
with `conclusion == 'success'`.

The action uploads only changed files and does not guarantee the
assets-before-HTML order described above. For a site this small the exposure is a
few seconds; if it ever bites, split it into two upload steps.

## Privacy note

The app itself contacts only the hosts in `docs/project-vision.md` §5.5, and
serving it from Tophost does not change that list — the origin is where the files
come from, not somewhere the app sends anything.

What does change: like any web server, Tophost's Apache writes access logs
containing visitor IPs and requested paths. That is server-side infrastructure
logging outside the app's control, not data collection by LM Deck Tools, and no
analytics, cookies, or third-party scripts are added. Worth stating plainly
rather than letting "no server" imply "no server ever sees a request".

Choosing Tophost over a CDN-backed static host (GitHub Pages, Cloudflare Pages)
was deliberate on the same grounds. Those would have solved the certificate
problem and cost nothing, but both put a US company in the serving path, able to
join visitor IPs against a far larger identity graph and subject to the CLOUD
Act. Seeweb, Tophost's operator, is Italian and holds nothing else about the
visitor. The base path in this config is the price of that choice.

## robots.txt is inert here

Crawlers read `/robots.txt` at the **domain root** only, so the file that
deploys to `/decktools/robots.txt` is never fetched. It is kept as the record of
what the rules should be. To make them apply, add these to the main site's
`/htdocs/robots.txt`:

```
Disallow: /decktools/_app/
Sitemap: https://www.lordmzn.it/decktools/sitemap.xml
```

The sitemap itself works fine where it is — submit it directly in Search Console.

## Regenerating the social preview image

`static/og-image.jpg` is rendered from `docs/og-image.html`:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --window-size=1200,630 \
  --screenshot=og-image.png docs/og-image.html
sips -s format jpeg -s formatOptions 82 og-image.png --out static/og-image.jpg
```

JPEG rather than PNG: the film-grain texture makes the PNG ~500 KB, half the
weight of the entire site, against ~75 KB as a JPEG.
