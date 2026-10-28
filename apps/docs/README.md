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

## License

MIT
