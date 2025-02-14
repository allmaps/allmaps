# @allmaps/analyze

This module analyzes warpedMaps: it checks them for possible error and computes accuracy measures.

A Warped Map is an object used in [@allmaps/render](../../packages/render/) to store information about a georeferencedMap (which in turn are parsed [Georeference Annotation's](https://iiif.io/api/extension/georef/)) as it is warped by a transformer in order to be rendered. Hence, these objects have a lot of information that can e used to infer the quality and accuracy of a map's warping.

In a WebGL2Renderer a map is warped and triangulated, so the TriangulatedWarpedMaps is used, which extends WarpedMaps.

## How it works

This packages analyzes maps to return information, warning and error items. These items are objects with a code and text attribute, and possible additional information.

*   **Infos** are notable but not problematic informations on a warping.
    *   Code `maskequalsfullmask`: The mask contains the full image.
*   **Warnings** are possibly problematic findings, but don't invalidate the map.
    *   Code `gcpincompleteresource`: A GCP has incomplete source coordinates.
    *   Code `gcpincompleteregeo`: A GCP has incomplete source coordinates.
    *   Code `gcpoutsidemask`: A GCP is outside the mask.
    *   Code `maskpointoutsidefullmask`: A mask point is outside the full mask.
    *   Code `triangulationfoldsover`: The map folds over itself, for the selected transformation type.
    *   Code `polynomialsheartoohigh`: A polynomial transformation shows a shear higher then a set maximum.
*   **Errors** are problematic findings that invalidate the map.
    *   Code `gcpamounttoolow`: There are less then 3 GCPs.
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

// Analyze to get all infos, warnings and errors
const infos = analyzer.getInfos()
const warnings = analyzer.getWarnings()
const errors = analyzer.getErrors()

// Or quickly check e.g. if there are any errors
const hasErrors = analyzer.hasErrors()

// Analyze measures and distortions
const measures = analyzer.getMeasures()
const distortions = analyzer.getDistortions()
```

## API

<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

#### Table of Contents

*   [Analyzer](#analyzer)
    *   [Parameters](#parameters)
    *   [hasInfos](#hasinfos)
    *   [hasWarnings](#haswarnings)
    *   [hasErrors](#haserrors)
    *   [getInfos](#getinfos)
    *   [getWarnings](#getwarnings)
    *   [getErrors](#geterrors)
    *   [getMeasures](#getmeasures)
    *   [getDistortions](#getdistortions)
    *   [fromWarpedMap](#fromwarpedmap)
        *   [Parameters](#parameters-1)

### Analyzer

Class for Analyzer.
This class describes how a georeferenced map is warped using a specific transformation.

#### Parameters

*   `warpedMap`  A Warped Map
*   `mapId`  ID of the map

#### hasInfos

Check if analysis has infos.

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**&#x20;

#### hasWarnings

Check if analysis has warnings.

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**&#x20;

#### hasErrors

Check if analysis has errors.

Returns **[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)**&#x20;

#### getInfos

Get analysis informations.

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<AnalysisItem>**&#x20;

#### getWarnings

Get zis warnings.

Returns **[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)\<AnalysisItem>**&#x20;

#### getErrors

Get analysis errors.

#### getMeasures

Get analysis measures.

#### getDistortions

Get distortions.

Returns **Distortions**&#x20;

#### fromWarpedMap

Creates an instance of Analyzer from a Warped Map.

##### Parameters

*   `warpedMap`  A Warped Map
