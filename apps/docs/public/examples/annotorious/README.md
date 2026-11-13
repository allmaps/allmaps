# Annotorious example data

These fixtures come from the
[Allmaps & Annotorious notebook](https://observablehq.com/@allmaps/allmaps-and-annotorious)
by Bert Spaan. They accompany the **From Annotorious to GeoJSON** example in
the **Transforming OCR and other annotations** guide.

- `glendale.annotation.json`: a snapshot of the
  [versioned Georeference Annotation](https://annotations.allmaps.org/maps/654b26fa1850e5fc@26f09f0bcf3066b5)
  used by the guide. It preserves the notebook's map mask and uses 22 building
  corner control points with a thin-plate-spline transformation. The revised
  georeference aligns the mill complex with OpenStreetMap building footprints;
  historical and modern building shapes can still differ.
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

To regenerate `buildings.geojson`, run the guide's conversion code using the
versioned annotation URL above and `buildings.annotations.json`. Save the
resulting FeatureCollection without changing the drawing IDs or text.
