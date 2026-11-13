# Text on Maps example data

The example uses David Rumsey Map Collection list number **5850.259**,
[San Francisco Sanborn Insurance Map, volume 5, pages 515–516 (1905)](https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~214142~5501497),
with a crop of Enterprise Brewing Co.

- `san-francisco.ocr.json` contains thirteen correctly recognized mapKurator
  detections from `5850259.geojson` in the
  [Machines Reading Maps dataset](https://searchworks.stanford.edu/view/rc349kh8402).
  The selected words are `BREWING`, `CELLAR`, `CELLARS`, `BEER`, `FERMENTING`,
  `LAGER`, `MILL`, `WATER`, `TANK`, `ICE`, `PUMP`, `FRONT`, and `BRICK`.
  Original text casing is preserved. The selected detections have approximate
  image-pixel centers at `[1783, 2280]`, `[1937, 2073]`, `[1966, 2384]`,
  `[1945, 2137]`, `[2262, 2517]`, `[1963, 2596]`, `[2232, 2108]`,
  `[2407, 2129]`, `[2059, 2031]`, `[2660, 2060]`, `[2723, 2145]`,
  `[2622, 1956]`, and `[2210, 1960]`, respectively. Each selected detection
  was checked against the original crop; incorrect neighboring detections
  are excluded.
  The conversion follows the
  [Text on Maps ETL](https://github.com/allmaps/text-on-maps-viz/blob/main/etl/src/ocr-annotations.ts):
  round the vertices and flip y to get the original image's downward pixel axis,
  then write them as Web Annotation SVG selectors. The redundant closing
  vertex is omitted in the SVG polygons.
- The guide uses a [versioned Georeference Annotation](https://annotations.allmaps.org/maps/ad38324ab9d18a27@7eef0e705892f244)
  from the Allmaps Annotations API. The sheet's existing fifteen control points,
  mask, and first-order polynomial transformation from the project's
  `maps.ndjson` were uploaded through the Allmaps Live API. Image dimensions
  were taken from the IIIF service's `info.json`. The versioned URL keeps the
  example fixed if the map is edited.
- `san-francisco.geojson` is the result of the guide's conversion, with the
  recognized text and source image ID.
- `san-francisco-crop.jpg` is an unwarped IIIF crop of the original map:
  [region `1680,1940,1200,760`, at full resolution](https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~214142~5501497/1680,1940,1200,760/full/0/default.jpg).
- `san-francisco-polygons.svg` displays the same thirteen selectors over that crop.
  Its `viewBox` frames the crop without changing the full-image coordinates.
