# @allmaps/schemas

The [JSON index](https://schemas.allmaps.org/) links to the versioned map schemas and JSON-LD contexts. Its paths resolve on both the development and production hosts.

| Document                                                             | Purpose                                                                                        |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [Map v1 schema](https://schemas.allmaps.org/map/1/schema.json)       | Validate a legacy map with `image`, `pixelMask`, and image/world control points.               |
| [Map v2 schema](https://schemas.allmaps.org/map/2/schema.json)       | Validate a Georeferenced Map with `resource`, `resourceMask`, and resource/geo control points. |
| [Map v2 context](https://schemas.allmaps.org/map/2/context.json)     | Interpret a Georeferenced Map as JSON-LD.                                                      |
| [Lists v1 context](https://schemas.allmaps.org/lists/1/context.json) | Interpret an exported Web Annotation collection and its five Allmaps list properties.          |

The JSON Schemas use Draft 2020-12. Each validates one serialized map. Map collections can use the corresponding schema as their array item schema. Additional properties allow API and editor metadata. The annotation parser also accepts and normalizes some legacy inputs.

## Build and test

From the repository root, run:

```sh
pnpm exec turbo run build --filter @allmaps/schemas
pnpm --filter @allmaps/schemas test
```

Vite generates both JSON Schemas from the annotation package’s Zod definitions. Map v2 also carries JSON-LD annotations in `src/map-v2.ts`. Vite uses those to generate its context, copies the authored lists context and Cloudflare routing files, and indexes the emitted documents in `dist/site/index.json`. Wrangler serves `dist/site/`. The JavaScript package entry and its TypeScript declarations live in `dist/`.

Run `pnpm --filter @allmaps/schemas watch` to regenerate the documents as you edit the annotation definitions or the static files.

The offline expansion tests use a fixture from the [W3C Web Annotation context](https://www.w3.org/ns/anno.jsonld).

## Publish

After building and testing, deploy the generated site with Wrangler:

```sh
pnpm --filter @allmaps/schemas run deploy:development
pnpm --filter @allmaps/schemas run deploy:production
```

Verify the root index and its links at `dev.schemas.allmaps.org` before publishing to `schemas.allmaps.org`. Contexts use `application/ld+json` and validation schemas use `application/schema+json`. Publish new incompatible formats at a new version path and keep previously published versions available.

## License

MIT
