# Plugin tests

This directory contains a Svelte application with separate pages for each of the Allmaps plugins. This can be used to test the entire rendering pipeline of the plugins.

The main pipelines run as follows:

- MapLibre: [@allmaps/render](../../packages/render/) → [@allmaps/warpedmaplayer](../../packages/warpedmaplayer/) → [@allmaps/maplibre](../../packages/maplibre/)
- Leaflet: [@allmaps/render](../../packages/render/) → [@allmaps/leaflet](../../packages/leaflet/)
- OpenLayers: [@allmaps/render](../../packages/openlayers/) → [@allmaps/leaflet](../../packages/openlayers/)

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

Follow the [installation guidelines for the monorepo](../../) to install and build this and all packages it requires.

## Usage

Get a local server running the plugins by running the following command in this directory:

```bash
pnpm run dev
```

Run this in combination with a global `watch` script if you are going to make changes.
