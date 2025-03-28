# @allmaps/analyze

This module analyzes warpedMaps: it checks them for possible error and computes accuracy measures.

A Warped Map is an object used in [@allmaps/render](../../packages/render/) to store information about a georeferencedMap (which in turn are parsed [Georeference Annotations](https://iiif.io/api/extension/georef/)) as it is warped by a transformer in order to be rendered. Hence, these objects have a lot of information that can e used to infer the quality and accuracy of a map's warping.

In a WebGL2Renderer a map is warped and triangulated, so the TriangulatedWarpedMaps is used, which extends WarpedMaps.

## How it works

This packages analyzes maps to return information, warning and error items. These items are objects with a code and message attribute, and possible additional information.

*   **Info** are notable but not problematic informations on a warping.
    *   Code `maskequalsfullmask`: The mask contains the full image.
*   **Warnings** are possibly problematic findings, but don't invalidate the map.
    *   Code `gcpoutsidemask`: A GCP is outside the mask.
    *   Code `maskpointoutsidefullmask`: A mask point is outside the full mask.
    *   Code `polynomialsheartoohigh`: A polynomial transformation shows a shear higher then a set maximum.
*   **Errors** are problematic findings that invalidate the map.
    *   Code `constructingwarpedmapfailed`: A warped map map could not be constructed.
    *   Code `constructingtriangulatedwarpedmapfailed`: A triangulated warped map could not be constructed.
    *   Code `gcpincompleteresource`: A GCP has incomplete source coordinates.
    *   Code `gcpincompleteregeo`: A GCP has incomplete source coordinates.
    *   Code `gcpamountlessthen2`: There are less then 2 GCPs.
    *   Code `gcpamountlessthen3`: There are less then 3 GCPs.
    *   Code `gcpresourcerepeatedpoint`: GCP resource coordinates are repeated.
    *   Code `gcpgeorepeatedpoint`: GCP geo coordinates are repeated.
    *   Code `masknotring`: The mask is not a valid ring (an array of points).
    *   Code `maskrepeatedpoint`: Mask resource coordinates are repeated.
    *   Code `maskselfintersection`: The mask self-intersects.

An analyzer can also compute the following **Measures**:

*   About the current transformation type:
    *   `rmse`: The root-mean-square error of GCPs in projected geo coordinates
    *   `destinationErrors`: for each GCP, the error in projected geo coordinates
    *   `resourceErrors`: for each GCP, the error in projected geo coordinates, scaled to resource space
    *   `resourceRelativeErrors`: for each GCP, the error in projected resource coordinates, relative to the resource mask BBox diameter.
*   About the Helmert transformation type:
    *   `helmertRmse`: The root-mean-square error of GCPs in projected geo coordinates
    *   `helmertParameters`: The Helmert parameters. See [@allmaps/transform](../../packages/transform/).
    *   `helmertScale`: The scale
    *   `helmertRotation`: The rotation
    *   `helmertTranslation`: The translation
*   About the polynomial transformation type:
    *   `polynomialRmse`: The root-mean-square error of GCPs in projected geo coordinates
    *   `polynomialParameters`: The polynomial parameters. See [@allmaps/transform](../../packages/transform/).
    *   `polynomialScale`: The scale
    *   `polynomialRotation`: The rotation
    *   `polynomialShear`: The shear
    *   `polynomialTranslation`: The translation

An analyzer can also compute the following **Distortion** information:

*   About the current transformation type:
    *   `meanDistortions`: For each computed distortion measure, the mean distortion over all triangulation points.

## Installation

This is an ESM-only module that works in browsers and Node.js.

Install using npm:

```sh
npm install @allmaps/analyze
```

## Usage

First, get a warpedMap, either by making it from an annotation, or by getting it from a renderer's warpedMapList. Then analyze it using this library.

```js
import { parseAnnotation } from '@allmaps/annotation'
import { TriangulatedWarpedMap } from '@allmaps/render'
import { Analyzer } from '@allmaps/analyze'

// Fetch an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Create a warpedMap from the annotation
const georeferencedMaps = parseAnnotation(annotation)
const georeferencedMap = georeferencedMaps[0]
const triangualtedWarpedMap = new TriangulatedWarpedMap(
  georeferencedMap.id,
  georeferencedMap
)

// Or add the annotation the a renderer and extract a warpedMap
// ... create a webGL2Renderer, see the render package
await renderer.addGeoreferenceAnnotation(annotation)
const triangulatedWarpedMap = renderer.warpedMapList.getWarpedMaps()[0]

// Create Analyzer for the warpedMap
const analyzer = new Analyzer(triangulatedWarpedMap)

// Analyze to get all info, warnings and errors
const info = analyzer.getInfo()
const warnings = analyzer.getWarnings()
const errors = analyzer.getErrors()

// Or quickly check e.g. if there are any errors
const hasErrors = analyzer.hasErrors()

// Analyze measures and distortions
const measures = analyzer.getMeasures()
const distortions = analyzer.getDistortions()
```

## License

MIT

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

*   [Analyzer](#analyzer)
    *   [Parameters](#parameters)
    *   [analyse](#analyse)
        *   [Parameters](#parameters-1)
    *   [getInfo](#getinfo)
        *   [Parameters](#parameters-2)
    *   [getWarnings](#getwarnings)
        *   [Parameters](#parameters-3)
    *   [getErrors](#geterrors)
        *   [Parameters](#parameters-4)
    *   [getMeasures](#getmeasures)
    *   [getDistortions](#getdistortions)

### Analyzer

Class for Analyzer.
This class describes how a georeferenced map is warped using a specific transformation.

#### Parameters

*   `georeferencedOrWarpedMap` &#x20;
*   `options` &#x20;

#### analyse

Analyse

Applying extra caution: wrapping the getters in a try catch

##### Parameters

*   `options`  Analysis options

Returns **any** Analysis with info, warnings and errors

#### getInfo

Get analysis informations

##### Parameters

*   `options`  Analysis options

Returns **any** Analysis items with info

#### getWarnings

Get analysis warnings

##### Parameters

*   `options`  Analysis options

Returns **any** Analysis items with warning

#### getErrors

Get analysis errors

##### Parameters

*   `options`  Analysis options

Returns **any** Analysis items with errors

#### getMeasures

Get analysis measures

Returns **any** Analysis measures

#### getDistortions

Get distortions.

Returns **any** Analysis distortions
