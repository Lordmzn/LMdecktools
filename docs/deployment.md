# Deployment

How LM Deck Tools gets from `pnpm run build` onto the public web (#25).

## Target

| | |
| --- | --- |
| URL | `https://decktools.lordmzn.it` |
| Host | Tophost (shared Apache, `.htaccess` with mod_rewrite + mod_headers) |
| Transport | FTPS, explicit TLS, port 21 — `ftp.lordmzn.it` |
| FTP user | `lordmzn.it` — **one account for the whole domain** |
| Document root | `/htdocs/decktools/` |
| Build output | `build/` — ~1 MB across ~60 files, against 200 MB of quota |

The FTP account's home contains `/.htaccess`, `/cgi-bin/`, `/conf/` and
`/htdocs/`. Sites live under `/htdocs`; the **main website is `/htdocs` itself**,
and this app is a subfolder of it.

A **subdomain**, not `lordmzn.it/decktools`. A subfolder would force
`kit.paths.base = '/decktools'`, and that is a build-time constant: the same
artifact would stop working anywhere else, local preview included. Serving from
a domain root keeps the build portable and the config empty.

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

Two things to confirm in the panel before the first automated run, since a push
to `master` now triggers one:

- **The subdomain's document root is really `/htdocs/decktools/`.** Whatever
  folder the panel creates for `decktools.lordmzn.it` is what `SERVER_DIR` in
  the workflow must say. A mismatch does not damage the main site — the guard
  and the manifest see to that — but it silently deploys to a folder nothing
  serves.
- **FTP is not IP-restricted.** GitHub Actions runners have rotating egress IPs;
  an allowlist on the account makes the job fail unpredictably.

Also worth checking once the subdomain exists: whether `/htdocs/.htaccess` from
the main site applies to it. If the subdomain's document root sits *below*
`/htdocs`, Apache may merge the parent's rules — a catch-all rewrite there would
break routing here in a way that reproduces on neither `preview` nor a local
static server.

Verify afterwards:

```bash
curl -sI https://decktools.lordmzn.it/collection/ | head -1          # 200
curl -sI https://decktools.lordmzn.it/it-it/card-lists/ | head -1    # 200
curl -sI https://decktools.lordmzn.it/nope/ | head -1                # 404, branded
curl -sI https://decktools.lordmzn.it/_app/immutable/entry/start.*.js \
  | grep -i cache-control                                            # immutable
curl -s https://decktools.lordmzn.it/sitemap.xml | head -3
```

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

Related: `Lordmzn/personal-website` deploys the main site with
`FTP-Deploy-Action@2.0.0` and `ARGS: --delete` and **no** remote directory, i.e.
a deleting sync against the login root. It has no recorded runs and its Node 12
toolchain no longer works, so it is dormant rather than dangerous — but it is
worth disabling outright rather than leaving it one dependency-bump away from
running again.

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

## Local verification

To reproduce what a plain static host does, without Apache:

```bash
pnpm run build
python3 -m http.server 8899 --directory build
```

`.htaccess` is ignored by that server, so cache headers and the branded 404 will
not appear — routing and page content will.

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
