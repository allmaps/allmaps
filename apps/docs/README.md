# @allmaps/docs

Allmaps documentation website, built with [Astro Starlight](https://starlight.astro.build/).

See https://docs.allmaps.org.

## Environment

The docs use the repository root's environment files. `pnpm dev` loads
`.env.localhost`; builds use `.env.production` by default or `.env.dev` with
`--mode dev`.

`PUBLIC_HOMEPAGE_BASE_URL` sets the destination for homepage, contact, and terms
links: `http://localhost:5511` locally, `https://dev.allmaps.org` in dev, and
`https://allmaps.org` in production.

`PUBLIC_STATS_WEBSITE_ID` enables visitor tracking with `stats.allmaps.org`.
Set it in Cloudflare's **Build Variables and Secrets**, then rebuild and deploy.
The Astro configuration reads it from the build process environment; a runtime
Worker variable or an entry in an `.env` file alone does not enable tracking.
When it is unset, no tracking script is included.

`PUBLIC_DOCS_BASE_URL` sets the canonical docs URL and social-image URL. The
`build:dev` and `build:production` commands set it explicitly for each deployment.

## Development deployment

The `docs-develop` Cloudflare Worker serves static files from `dist` at
https://dev.docs.allmaps.org. Deploy from a clean checkout of `develop`.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter '@allmaps/docs^...'
pnpm --filter @allmaps/docs run build:dev
pnpm --filter @allmaps/docs run deploy:dev
```

Building the dependencies requires Rust/Cargo and `wasm-pack` for the image
renderer. The development build loads `.env.dev`, uses the development docs URL
for canonical links, and points editing links to `develop`.

Cloudflare Git builds can use the repository root, the two build commands above,
and `pnpm --filter @allmaps/docs run deploy:dev` as the deploy command. Configure
Node 24, the repository's pnpm version, and the Rust/WASM build tools.

## Production deployment

The `production` Wrangler environment deploys the `docs` Worker at
https://docs.allmaps.org. The default environment continues to deploy
`docs-develop` at https://dev.docs.allmaps.org.

Deploy from a clean checkout of `main`, using the same Node, pnpm, and Rust/WASM
build tools as the development deployment:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter '@allmaps/docs^...'
pnpm --filter @allmaps/docs run build:production
pnpm --filter @allmaps/docs run deploy:production
```

For Cloudflare Git builds, connect the `docs` Worker to `main`, use the repository
root, and use the two build commands above followed by the production deploy
command. Set `PUBLIC_STATS_WEBSITE_ID` in that Worker's build variables to enable
analytics. The production build loads `.env.production` and uses
`https://docs.allmaps.org` for canonical and social-image URLs.

The build mode and Wrangler environment are selected separately: always pair
`build:production` with `deploy:production`, and `build:dev` with `deploy:dev`.

## Social previews

`public/social/allmaps-docs.jpg` is the shared 1200 × 630 JPEG preview. Keep it
under 300 KB when replacing it. The illustration is based on connected plates
1, 2, and 7 of the [Lynn atlas](https://annotations.allmaps.org/manifests/23379602e8187445),
with illustrative green ground control point markers.

Starlight provides page titles, descriptions, canonical URLs, and the large-image
card type. `src/route-data.ts` adds the image metadata and Twitter card text,
removes the repeated homepage title, and prevents indexing of development sites.
Image URLs use the configured `PUBLIC_DOCS_BASE_URL`, like canonical URLs.

## License

MIT
