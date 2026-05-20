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

The PMTiles command reads `maps-flattened.geojson` and writes:

- `maps.pmtiles`

Next implementation steps:

- upload completed files to R2
