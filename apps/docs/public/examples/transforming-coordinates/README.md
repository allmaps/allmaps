# Transforming coordinates example data

- `broadway.geojson`: derived from the `broadway@2.json` attachment from
  [Using Allmaps to draw GeoJSON on a IIIF image](https://observablehq.com/@allmaps/using-allmaps-to-draw-geojson-on-a-iiif-image).
  The notebook extracted Manhattan's Broadway from
  [fillerwriter/nyc-streets](https://github.com/fillerwriter/nyc-streets).
  Its MultiLineString is split into a FeatureCollection of five LineString
  features, preserving all coordinates and properties.

The original photograph is [Manhattan Island, 1921](https://www.loc.gov/item/90680339/),
Library of Congress. Its IIIF Image Service is
<https://tile.loc.gov/image-services/iiif/service:gmd:gmd380:g3804:g3804n:ct003447>.
The full image dimensions are 30,387 × 8,460 pixels.

The guides load this
[versioned Georeference Annotation](https://annotations.allmaps.org/maps/48da96d9296515a6@cbd8273e25cd5aca)
from the Allmaps Annotations API.
Image tiles are requested from the Library of Congress.

`broadway.svg` contains all five LineString features and all 288 vertices in
`broadway.geojson`, transformed to image pixels and rounded to two decimals.
Its `viewBox` covers the full-resolution image: `0 0 30387 8460`.
`broadway-transformed.geojson` is the result of converting that SVG back into
geographic coordinates, producing a FeatureCollection of five LineString features.
