# @allmaps/analyze

This module analyzes warpedMaps: it checks them for possible error and computes accuracy measures.

## Which map objects can be analyzed

A Warped Map is an object used in [@allmaps/render](../../packages/render/) to describe how a Georeferenced Map (a parsed [Georeference Annotations](https://iiif.io/api/extension/georef/)) is warped by a transformer, e.g. during rendering. Hence, these objects contain a lot of information that can be used to infer the quality and accuracy of a map's warping.

In a WebGL2Renderer a map is warped and triangulated, so the TriangulatedWarpedMaps is used, which extends WarpedMaps.

## How it works

This packages analyzes maps to return information, warning and error items. Three types of analysis items exist:

- **Info** are notable but not problematic informations on a warping.
- **Warnings** are possibly problematic findings, but don't invalidate the map.
- **Errors** are problematic findings that invalidate the map.

Analysis items like info, warnings and errors are objects with a unique code, a message and possible additional descriptive attributes.

An analyzer can analyze the following topics:

| Type    | Code                                      | Topic                                                                                           | Included by default |
|---------|-------------------------------------------|-------------------------------------------------------------------------------------------------|---------------------|
| Info    | `maskequalsfullmask`                      | The mask contains the full image. transformation                                                | Yes                 |
| Warning | `gcpoutsidemask`                          | A GCP is outside the mask.                                                                      | Yes                 |
| Warning | `maskpointoutsidefullmask`                | A mask point is outside the full mask.                                                          | Yes                 |
| Warning | `destinationrmsetoohigh`                  | The RMSE is higher then the set maximum times the map diameter.                                 | No                  |
| Warning | `destinationhelmertrmsetoohigh`           | The RMSE is higher then the set maximum times the map diameter for a helmert transformation.    | No                  |
| Warning | `polynomial1sheartoohigh`                 | The shear is higher then a set maximum for a polynomial transformation.                         | Yes                 |
| Warning | `destinationpolynomial1rmsetoohigh`       | The RMSE is higher then the set maximum times the map diameter for a polynomial transformation. | Yes                 |
| Warning | `log2sigmadistortiontoohigh`              | The area distortion (`log2sigma`) is higher then the set maximum or lower then the set minimum. | Yes                 |
| Warning | `twoomegadistortiontoohigh`               | The angular distortion (`twoOmega`) is higher then the set maximum.                             | Yes                 |
| Warning | `triangulationfoldsover`                  | The warped map folds over itself.                                                               | No                  |
| Error   | `constructingwarpedmapfailed`             | A warped map map could not be constructed.                                                      | Yes                 |
| Error   | `constructingtriangulatedwarpedmapfailed` | A triangulated warped map could not be constructed.                                             | Yes                 |
| Error   | `gcpincompleteresource`                   | A GCP has incomplete source coordinates.                                                        | Yes                 |
| Error   | `gcpincompleteregeo`                      | A GCP has incomplete source coordinates.                                                        | Yes                 |
| Error   | `gcpamountlessthen2`                      | There are less then 2 GCPs.                                                                     | No                  |
| Error   | `gcpamountlessthen3`                      | There are less then 3 GCPs.                                                                     | Yes                 |
| Error   | `gcpresourcerepeatedpoint`                | GCP resource coordinates are repeated.                                                          | Yes                 |
| Error   | `gcpgeorepeatedpoint`                     | GCP geo coordinates are repeated.                                                               | Yes                 |
| Error   | `masknotring`                             | The mask is not a valid ring (an array of points).                                              | Yes                 |
| Error   | `maskrepeatedpoint`                       | Mask resource coordinates are repeated.                                                         | Yes                 |
| Error   | `maskselfintersection`                    | The mask self-intersects.                                                                       | Yes                 |

An analyzer can also compute the following **Measures**:

*   About the current transformation type:
    *   `destinationRmse`: The root-mean-square error of GCPs in projected geo coordinates
    *   `destinationErrors`: for each GCP, the error in projected geo coordinates
    *   `resourceErrors`: for each GCP, the error in projected geo coordinates, scaled to resource space
    *   `resourceRelativeErrors`: for each GCP, the error in projected resource coordinates, relative to the resource mask BBox diameter.
*   About the Helmert transformation type:
    *   `destinationHelmertRmse`: The root-mean-square error of GCPs in projected geo coordinates
    *   `helmertParameters`: The Helmert parameters. See [@allmaps/transform](../../packages/transform/).
    *   `helmertScale`: The scale
    *   `helmertRotation`: The rotation
    *   `helmertTranslation`: The translation
*   About the polynomial transformation type:
    *   `destinationPolynomial1Rmse`: The root-mean-square error of GCPs in projected geo coordinates
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
import { Analyzer } from '@allmaps/analyze'

// Fetch an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Create an Analyzer for a Georeferenced Map
const georeferencedMaps = parseAnnotation(annotation)
const georeferencedMap = georeferencedMaps[0]
const analyzer = new Analyzer(warpedMap)

// Or create an Analyzer for a Warped Map, e.g. extracted from a Renderer
await renderer.addGeoreferenceAnnotation(annotation)
const warpedMap = renderer.warpedMapList.getWarpedMaps()[0]
const analyzer = new Analyzer(warpedMap)

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
