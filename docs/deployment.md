# Deployment

How LM Deck Tools gets from `pnpm run build` onto the public web (#25).

## Target

| | |
| --- | --- |
| URL | `https://decktools.lordmzn.it` |
| Host | Tophost (shared Apache, `.htaccess` with mod_rewrite + mod_headers) |
| Transport | FTP / FTPS |
| Build output | `build/` — ~1 MB across ~60 files, against 200 MB of quota |

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
# then upload build/ to the subdomain's document root, _app/ first.
```

Verify afterwards:

```bash
curl -sI https://decktools.lordmzn.it/collection/ | head -1          # 200
curl -sI https://decktools.lordmzn.it/it-it/card-lists/ | head -1    # 200
curl -sI https://decktools.lordmzn.it/nope/ | head -1                # 404, branded
curl -sI https://decktools.lordmzn.it/_app/immutable/entry/start.*.js \
  | grep -i cache-control                                            # immutable
curl -s https://decktools.lordmzn.it/sitemap.xml | head -3
```

## Automated deploy — blocked, by choice

Not wired up yet, and it should not be until two things are confirmed on the
Tophost control panel:

1. **FTPS (explicit TLS) is available.** Plain FTP sends the password in
   cleartext on every run. A CI pipeline that does this on every push to `master`
   is a standing credential leak, not a one-off risk.
2. **FTP is not IP-restricted.** GitHub Actions runners have rotating egress IPs.
   An allowlist on the account will make the job fail unpredictably.

Once both hold, add repo secrets `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`
and commit this as `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [master]
  workflow_dispatch:

concurrency:
  group: deploy
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - name: Upload to Tophost
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          protocol: ftps
          local-dir: ./build/
          server-dir: ./
```

The action keeps a manifest on the server and uploads only changed files, which
also means it does not guarantee the assets-before-HTML order described above.
For a site this small the exposure is a few seconds; if it ever bites, split it
into two upload steps.

Note this deploys whatever lands on `master`. CI (lint, type-check, unit, E2E)
runs on the same push but as a separate workflow — it does **not** gate this one.
Add a `needs:` on the CI job if that matters more than deploy latency.

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
