# Allmaps Tile Server

Allmaps Tile Server is a proxy server that turns [Georeference Annotations](https://iiif.io/api/extension/georef/) into [XYZ map tiles](https://en.wikipedia.org/wiki/Tiled_web_map).

Allmaps Tile Server runs on [Cloudflare Workers](https://workers.cloudflare.com/). Cloudflare Workers let you run tiny JavaScript programs on Cloudflare's global CDN. [Cloudflare is working on publishing the Workers system as open source](https://blog.cloudflare.com/workers-open-source-announcement/).

For more information, see https://observablehq.com/@allmaps/allmaps-tile-server.

![](screenshot.jpg)

## Development

Run locally with [Miniflare](https://miniflare.dev/):

    pnpm run dev

A local version of Allmaps Tile Server is now running on http://localhost:5504.

Some example URLs:

- http://localhost:5504/maps/a38b4ed7ea01a36a/16/33583/21671.png
- http://localhost:5504/maps/135dfd2d58dc26ec/6/30/19.png?transformation=thin-plate-spline
- http://localhost:5504/manifests/a0d6d3379cfd9f0a/15/16833/10770.png
- http://localhost:5504/manifests/a0d6d3379cfd9f0a/tiles.json
- http://localhost:5504/manifests/a0d6d3379cfd9f0a/{z}/{x}/{y}.png

Publish to Cloudflare Workers:

    wrangler publish

## API

### Supplying a Georeference Annotation

To generate XYZ map tiles, Allmaps Tile Server needs a Georeference Annotation. You can supply a Georeference Annotation in three ways:

1. [By using the URL of a Georeference Annotation](#by-using-the-url-of-a-georeference-annotation)
2. [By using the Allmaps ID of a georeferenced map](#by-using-the-allmaps-id-of-a-georeferenced-map)
3. [By supplying a complete URL-encoded Georeference Annotation](#by-supplying-a-complete-url-encoded-georeference-annotation)

The different ways of supplying a Georeference Annotation are explained in detail below.

#### By using the URL of a Georeference Annotation

We can download an example Georeference Annotation of a map of [Coney Island from the NYPL](https://digitalcollections.nypl.org/items/bdde3640-8624-0137-35d0-37ca81be9adc) from Allmaps API:

- https://annotations.allmaps.org/images/ea443ffaabb121e2

You can turn this Georeference Annotation into XYZ tiles like this:

- https://allmaps.xyz/{z}/{x}/{y}.png?url=https://annotations.allmaps.org/images/ea443ffaabb121e2

Allmaps Tile Server also supports [TileJSON](https://github.com/mapbox/tilejson-spec):

- https://allmaps.xyz/tiles.json?url=https://annotations.allmaps.org/images/ea443ffaabb121e2

_Note: Allmaps Tile Server does not depend on https://annotations.allmaps.org. You can use Georeference Annotations from any URL._

#### By using the Allmaps ID of a georeferenced map

If Allmaps has georeference data available about a certain IIIF resource and you know its Allmaps ID, you can also use this ID directly. If you don't know its Allmaps ID, you can use https://annotations.allmaps.org to search for the URL of a specific IIIF resource:

- https://annotations.allmaps.org/?url=https://iiif.nypl.org/iiif/2/58009096

You can find out the Allmaps ID of all the maps in a georeferenced image like this:

- https://api.allmaps.org/images/ea443ffaabb121e2/maps

This image contains one map, with ID `25b0d49e1b659498`. The XYZ tile URL of this map is:

- https://allmaps.xyz/maps/25b0d49e1b659498/{z}/{x}/{y}.png

And for TileJSON:

- https://allmaps.xyz/maps/25b0d49e1b659498/tiles.json

#### By supplying a complete URL-encoded Georeference Annotation

Instead of the URL of a Georeference Annotation, you can also supply the URL-encoded contents of the Georeference Annotation using the `annotation` URL parameter:

- [https://allmaps.xyz/{z}/{x}/{y}.png?annotation=%7B%22type%22%3A%22AnnotationPage…](https://allmaps.xyz/{z}/{x}/{y}.png?annotation=%7B%22type%22%3A%22AnnotationPage%22%2C%22%40context%22%3A%5B%22http%3A%2F%2Fwww.w3.org%2Fns%2Fanno.jsonld%22%5D%2C%22items%22%3A%5B%7B%22id%22%3A%229e8b16102ca3f159%22%2C%22type%22%3A%22Annotation%22%2C%22%40context%22%3A%5B%22http%3A%2F%2Fwww.w3.org%2Fns%2Fanno.jsonld%22%2C%22http%3A%2F%2Fgeojson.org%2Fgeojson-ld%2Fgeojson-context.jsonld%22%2C%22http%3A%2F%2Fiiif.io%2Fapi%2Fpresentation%2F3%2Fcontext.json%22%5D%2C%22motivation%22%3A%22georeferencing%22%2C%22target%22%3A%7B%22type%22%3A%22Image%22%2C%22source%22%3A%22https%3A%2F%2Fiiif.digitalcommonwealth.org%2Fiiif%2F2%2Fcommonwealth%3A9s161b03w%2Ffull%2Ffull%2F0%2Fdefault.jpg%22%2C%22service%22%3A%5B%7B%22%40id%22%3A%22https%3A%2F%2Fiiif.digitalcommonwealth.org%2Fiiif%2F2%2Fcommonwealth%3A9s161b03w%22%2C%22type%22%3A%22ImageService2%22%7D%5D%2C%22selector%22%3A%7B%22type%22%3A%22SvgSelector%22%2C%22value%22%3A%22%3Csvg%20width%3D%5C%222589%5C%22%20height%3D%5C%224088%5C%22%3E%3Cpolygon%20points%3D%5C%220%2C0%202589%2C0%202589%2C4088%200%2C4088%5C%22%20%2F%3E%3C%2Fsvg%3E%22%7D%7D%2C%22body%22%3A%7B%22type%22%3A%22FeatureCollection%22%2C%22purpose%22%3A%22gcp-georeferencing%22%2C%22transformation%22%3A%7B%22type%22%3A%22polynomial%22%2C%22order%22%3A0%7D%2C%22features%22%3A%5B%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B835.25%2C1667.5%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0643878699%2C42.3593524428%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B768.75%2C1725%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0650771976%2C42.3588351454%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B1782.25%2C1091.25%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0539218904%2C42.3643190737%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B1884.125%2C873.25%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0527578117%2C42.3662473526%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B1403.375%2C750.25%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0580404223%2C42.3672679489%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B1534.625%2C635.5%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0566295803%2C42.3682191695%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B1445.375%2C706%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0573966921%2C42.3677514879%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B918.75%2C1656.5%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0635577262%2C42.3594277577%5D%7D%7D%5D%7D%7D%5D%7D)

And for TileJSON:

- [https://allmaps.xyz/tiles.json?annotation=%7B%22type%22%3A%22AnnotationPage…](https://allmaps.xyz/tiles.json?annotation=%7B%22type%22%3A%22AnnotationPage%22%2C%22%40context%22%3A%5B%22http%3A%2F%2Fwww.w3.org%2Fns%2Fanno.jsonld%22%5D%2C%22items%22%3A%5B%7B%22id%22%3A%229e8b16102ca3f159%22%2C%22type%22%3A%22Annotation%22%2C%22%40context%22%3A%5B%22http%3A%2F%2Fwww.w3.org%2Fns%2Fanno.jsonld%22%2C%22http%3A%2F%2Fgeojson.org%2Fgeojson-ld%2Fgeojson-context.jsonld%22%2C%22http%3A%2F%2Fiiif.io%2Fapi%2Fpresentation%2F3%2Fcontext.json%22%5D%2C%22motivation%22%3A%22georeferencing%22%2C%22target%22%3A%7B%22type%22%3A%22Image%22%2C%22source%22%3A%22https%3A%2F%2Fiiif.digitalcommonwealth.org%2Fiiif%2F2%2Fcommonwealth%3A9s161b03w%2Ffull%2Ffull%2F0%2Fdefault.jpg%22%2C%22service%22%3A%5B%7B%22%40id%22%3A%22https%3A%2F%2Fiiif.digitalcommonwealth.org%2Fiiif%2F2%2Fcommonwealth%3A9s161b03w%22%2C%22type%22%3A%22ImageService2%22%7D%5D%2C%22selector%22%3A%7B%22type%22%3A%22SvgSelector%22%2C%22value%22%3A%22%3Csvg%20width%3D%5C%222589%5C%22%20height%3D%5C%224088%5C%22%3E%3Cpolygon%20points%3D%5C%220%2C0%202589%2C0%202589%2C4088%200%2C4088%5C%22%20%2F%3E%3C%2Fsvg%3E%22%7D%7D%2C%22body%22%3A%7B%22type%22%3A%22FeatureCollection%22%2C%22purpose%22%3A%22gcp-georeferencing%22%2C%22transformation%22%3A%7B%22type%22%3A%22polynomial%22%2C%22order%22%3A0%7D%2C%22features%22%3A%5B%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B835.25%2C1667.5%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0643878699%2C42.3593524428%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B768.75%2C1725%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0650771976%2C42.3588351454%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B1782.25%2C1091.25%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0539218904%2C42.3643190737%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B1884.125%2C873.25%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0527578117%2C42.3662473526%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B1403.375%2C750.25%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0580404223%2C42.3672679489%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B1534.625%2C635.5%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0566295803%2C42.3682191695%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B1445.375%2C706%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0573966921%2C42.3677514879%5D%7D%7D%2C%7B%22type%22%3A%22Feature%22%2C%22properties%22%3A%7B%22pixelCoords%22%3A%5B918.75%2C1656.5%5D%7D%2C%22geometry%22%3A%7B%22type%22%3A%22Point%22%2C%22coordinates%22%3A%5B-71.0635577262%2C42.3594277577%5D%7D%7D%5D%7D%7D%5D%7D)

### URL parameters

| Parameter             | Description         | Allowed values                          | Example                           |
| :-------------------- | :------------------ | :-------------------------------------- | :-------------------------------- |
| `transformation.type` | Transformation type | `"polynomial"` \| `"thin-plate-spline"` | `?transformation.type=polynomial` |
