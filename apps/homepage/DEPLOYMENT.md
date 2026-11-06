# Homepage on Cloudflare

The prerendered homepage uses Cloudflare Workers Static Assets and the
monorepo's existing Wrangler installation. There are two targets:

| Target      | Worker             | Domain            | Output   |
| ----------- | ------------------ | ----------------- | -------- |
| Development | `homepage-develop` | `dev.allmaps.org` | `build/` |
| Production  | `homepage`         | `allmaps.org`     | `build/` |

Development is the staging site. No separate preview Worker is needed.
Both targets serve the custom `404.html` with a 404 response, normalize HTML
URLs without trailing slashes, and use the same legacy HTTP 308 redirects.

Only configuration has been prepared. Builds, deployments and domain changes
require a separate go-ahead. Render removal is handled separately by Bert.

## Prepare a clean checkout

Use merged `develop` for the development site and the production release branch
(`main`) for production once it includes the homepage changes. Use Node.js 24
or newer and the pnpm version pinned in the root `package.json`.
Do not build from a workspace containing the unfinished blog or docs changes.

From the monorepo root, install dependencies and build the homepage's packages:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter='@allmaps/homepage^...'
```

## Development

After build approval:

```sh
pnpm --filter @allmaps/homepage run build:dev
```

This loads `.env.dev` through Vite's `dev` mode, writes the prerendered site to
`build/`, and generates `build/_redirects` with `dev.docs.allmaps.org` links.

After deployment and domain-cutover approval:

```sh
pnpm --filter @allmaps/homepage run deploy:dev
```

This targets only `dev.allmaps.org`. Verify every page, image loading, legacy
redirects, unknown routes, mobile navigation and desktop/Retina layouts before
using the development site to approve the production release.

## Production

Build from the approved production release:

```sh
pnpm --filter @allmaps/homepage run build:production
```

This loads `.env.production`, writes the site to `build/`, and generates
redirects to `docs.allmaps.org`. The production homepage URL is
`https://allmaps.org`. Both environments use `build/`; each Cloudflare build job
starts from a clean checkout and runs the matching build command before deploying.

After verifying the release and approving the domain cutover:

```sh
pnpm --filter @allmaps/homepage run deploy:production
```

This selects Wrangler's `production` environment and targets only `allmaps.org`.
It does not attach `www.allmaps.org` or change the development Worker.

## Domain cutover and future automatic deployments

Cloudflare may require the existing DNS record to be replaced when attaching a
custom domain. Inspect and preserve that record before approving a cutover.
Keep the previous hosting until HTTPS, all pages, images, redirects and the 404
response work on the new hostname.

For automatic deployments, use the repository root as the working directory.
Pair the development branch with `build:dev` and `deploy:dev`; pair production
releases with `build:production` and `deploy:production`. Configure automation
only after each initial deployment and domain cutover have been verified.
