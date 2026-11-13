# Annotorious example data

These fixtures come from the
[Allmaps & Annotorious notebook](https://observablehq.com/@allmaps/allmaps-and-annotorious)
by Bert Spaan. They accompany the **Annotating maps with Annotorious** guide.

- `glendale.annotation.json`: the notebook's three control points and map mask,
  converted to the current Georeference Annotation format. The duplicate
  closing mask vertex was removed. The first-order polynomial transformation
  matches the notebook's `new GcpTransformer(parsedMap.gcps, 'polynomial')`.
- `buildings.annotations.json`: the notebook's three polygon annotations,
  including their original IDs, text bodies, and fractional pixel coordinates.
  These are W3C Web Annotations for use with Annotorious' `W3CImageFormat` adapter.

The source map depicts the
[Glendale Elastic Fabrics Company in Easthampton, Massachusetts](https://www.digitalcommonwealth.org/search/commonwealth:2r36vc45n),
from the American Textile History Museum collection, published by Digital
Commonwealth. The IIIF Manifest is
<https://ark.digitalcommonwealth.org/ark:/50959/2r36vc45n/manifest>.
The image service is
<https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:2r36vc46x>,
with full-resolution dimensions of 4,862 × 6,063 pixels.

These are fixed copies, independent of later edits in Allmaps Editor. The image
itself is not included.

`building-outlines.svg` uses the same three selectors and frames the IIIF
image crop used by the guide. `buildings.geojson` is the guide's output,
with the original labels and annotation IDs.
