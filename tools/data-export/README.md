# @allmaps/data-export

Exports public Allmaps data dumps directly from the database.

This tool uses a streaming database cursor and reuses the same conversion
functions as the API:

- `fromDbRow()` from `@allmaps/api-shared`
- `generateFeature()` from `@allmaps/api-shared`
- `generateAnnotation()` from `@allmaps/annotation`

## Environment

- `DATABASE_URL`: Postgres connection string
- `DIRECT_DATABASE_URL`: direct Postgres connection string, preferred over
  `DATABASE_URL` when set
- `ANNOTATIONS_BASE_URL`: base URL for annotation/map links, defaults to
  `https://annotations.allmaps.org`
- `DATA_EXPORT_OUTPUT_DIR`: output directory, defaults to `./data`
- `DATA_EXPORT_BATCH_SIZE`: cursor batch size, defaults to `500`
- `DATA_EXPORT_R2_DESTINATION`: rclone destination, defaults to
  `r2:allmaps-files`

## Commands

```sh
pnpm --filter @allmaps/data-export run build
pnpm --filter @allmaps/data-export run export
pnpm --filter @allmaps/data-export run export dev
pnpm --filter @allmaps/data-export run export localhost
pnpm --filter @allmaps/data-export run export production
pnpm --filter @allmaps/data-export run pmtiles
```

## Render Docker

Configure the Render service with the monorepo root as the Docker build context,
so workspace dependencies are available locally during the image build:

- Root Directory: unset, or repository root
- Dockerfile Path: `tools/data-export/Dockerfile`
- Docker Context: `.`

Passing `dev`, `localhost`, or `production` loads the matching env file from the
repository root:

- `.env.dev` followed by `.env.dev.local`
- `.env.localhost` followed by `.env.localhost.local`
- `.env.production` followed by `.env.production.local`

Variables are merged in that order, with existing system environment variables
used as a fallback for variables not present in the env files.

The current scaffold writes:

- `maps.json`
- `maps.ndjson`
- `maps.geojson`
- `maps.geojsonl`
- `maps-flattened.geojson`
- `annotations.json`
- `domains-counted.json`
- `files.json`

For organizations with a `supporter` or `innovator` plan, the export also
writes organization-specific dumps to `DATA_EXPORT_OUTPUT_DIR/<organizationSlug>/`
with the same files except `domains-counted.json`.

The PMTiles command reads `maps-flattened.geojson` and writes:

- `maps.pmtiles`

`maps.pmtiles` contains one vector source layer per map area band. Area is in
square meters. The zoom ranges keep each band available for Explore's visual
fade window. City and local-scale maps are kept through z14 so they can be
overzoomed when Explore is zoomed further in:

| Source layer      |                                   Area | Tile zooms |
| ----------------- | -------------------------------------: | ---------: |
| `masks_global`    |                `>= 10,000,000,000,000` |        0-6 |
| `masks_continent` | `1,000,000,000,000-10,000,000,000,000` |        2-8 |
| `masks_country`   |     `10,000,000,000-1,000,000,000,000` |       4-10 |
| `masks_region`    |           `100,000,000-10,000,000,000` |       6-12 |
| `masks_city`      |                `1,000,000-100,000,000` |       8-14 |
| `masks_local`     |                          `< 1,000,000` |      10-14 |

Next implementation steps:

- upload completed files to R2
