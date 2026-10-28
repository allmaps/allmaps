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

## License

MIT
