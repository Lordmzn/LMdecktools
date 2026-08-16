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

It needs three repo secrets:

| Secret | Value |
| --- | --- |
| `FTP_SERVER` | `ftp.lordmzn.it` |
| `FTP_USERNAME` | `lordmzn.it` |
| `FTP_PASSWORD` | set in the Tophost panel |

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
