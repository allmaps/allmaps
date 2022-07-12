# Allmaps Tile Server

Tiny proxy server that turns Georeference Annotations into [XYZ map tiles](https://en.wikipedia.org/wiki/Tiled_web_map).

Allmaps Tile Server runs on [Cloudflare Workers](https://workers.cloudflare.com/). Cloudflare Workers let you run tiny JavaScript programs on Cloudflare's global CDN. [Cloudflare is working on publishing the Workers system as open source](https://blog.cloudflare.com/workers-open-source-announcement/).

For more information, see https://observablehq.com/@bertspaan/allmaps-tile-server.

![](screenshot.jpg)

## Development

Run locally with [Miniflare](https://miniflare.dev/):

    pnpm run dev

Publish to Cloudflare Workers:

    wrangler publish

## API

Example Georeference Annotation of a map of [Coney Island from the NYPL](https://digitalcollections.nypl.org/items/bdde3640-8624-0137-35d0-37ca81be9adc):

- https://annotations.allmaps.org/images/ea443ffaabb121e2

You can turn this Georeference Annotation into XYZ tiles like this:

- https://allmaps.xyz/{z}/{x}/{y}.png?url=https://annotations.allmaps.org/images/ea443ffaabb121e2

Allmaps Tile Server also supports [TileJSON](https://github.com/mapbox/tilejson-spec):

- https://allmaps.xyz/tiles.json?url=https://annotations.allmaps.org/images/ea443ffaabb121e2

If Allmaps has georeference data available about a certain IIIF image and you know its Allmaps ID, you can also use this ID directly.

You can find out the Allmaps ID of all the georeferenced image like this:

- https://api.allmaps.org/images/ea443ffaabb121e2/maps

This image contains one map, with ID `25b0d49e1b659498`. The XYZ tile URL of this map is:

- https://allmaps.xyz/maps/25b0d49e1b659498/{z}/{x}/{y}.png

And for TileJSON:

- https://allmaps.xyz/maps/25b0d49e1b659498/tiles.json
