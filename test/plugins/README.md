# Plugin tests

This test contains a Svelte application with separate pages for each of the Allmaps webmap plugins. This can be used to test the entire rendering pipeline of the plugins.

The main pipelines run as follows:

- Maplibre: [@allmaps/render](../../packages/render/) → [@allmaps/warpedmaplayer](../../packages/warpedmaplayer/) → [@allmaps/maplibre](../../packages/maplibre/)
- Leaflet: [@allmaps/render](../../packages/render/) → [@allmaps/leaflet](../../packages/leaflet/)
- Openlayers: [@allmaps/render](../../packages/openlayers/) → [@allmaps/leaflet](../../packages/openlayers/)

With [@allmaps/render](../../packages/render/) relying of most other Allmaps packages, including:
- [@allmaps/id](../../packages/id/)
- [@allmaps/iiif-parser](../../packages/iiif-parser/)
- [@allmaps/project](../../packages/project/)
- [@allmaps/stdlib](../../packages/stdlib/)
- [@allmaps/tailwind](../../packages/tailwind/)
- [@allmaps/transform](../../packages/transform/)
- [@allmaps/triangulate](../../packages/triangulate/)
- [@allmaps/types](../../packages/types/)

## Installation

Install with pnpm:

```sh
pnpm install @allmaps/render
```

Build locally:

```sh
pnpm run build
```

## Usage

Get a local server running the plugins:

```bash
pnpm run dev
```

Run this in combination with a global `watch` script if you are going to make changes.
