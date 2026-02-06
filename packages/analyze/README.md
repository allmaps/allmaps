# @allmaps/analyze

This packages serves to analyze the *geometric* qualities of maps.

## How it works

This packages analyzes maps and returns information, warning and error items:

- **Info** are notable but not problematic informations on a warping.
- **Warnings** are possibly problematic findings, but don't invalidate the map.
- **Errors** are problematic findings that invalidate the map.

Analysis items like info, warnings and errors are objects with a unique code, a message and possible additional descriptive attributes. All supported analysis items are listed below.

An analyzer can also compute **Measures** like the RMSE of error-vectors and **Distortion** information like area scaling of a thin-plate spline transformation. They are equally described below.

While this packages serves to analyze the *geometric* qualities of maps. It does not check the *online availability* of the resource (image) of a map.

### Which maps can be analyzed?

This package can analyze ProtoGeoreferencedMaps, GeoreferencedMaps or WarpedMaps.

- A **ProtoGeoreferencedMap** is a type used in this package to describe a basic version of a GeoreferencedMap containing only (but not guaranteed) GCPs and a mask. Information on the resource image or context, present in a GeoreferencedMap may be omitted here.
- A **GeoreferencedMap** is Allmaps' internal map format describing parsed [Georeference Annotations](https://iiif.io/api/extension/georef/). The [@allmaps/annotation](../../packages/annotation/) package defines these schema's and provides functions to parse and generate them.
- A **WarpedMap** is an object used in the [@allmaps/render](../../packages/render/) package and describe how a Georeferenced Map is warped by a transformer, e.g. during rendering. Hence, these objects contain a lot of information that can be used to infer the quality and accuracy of a map's warping.
  - This packages also check if WarpedMap's can be triangulated. For context: a WebGL2Renderer renders a WebGL2WarpedMap, which is an extension a TriangulatedWarpedMap, which is an extension of a WarpedMap.

## Installation

This is an ESM-only module that works in browsers and Node.js.

Install using npm:

```sh
npm install @allmaps/analyze
```

## Usage

First, create an Analyzer instance from a ProtoGeoreferencedMap, GeoreferencedMap or WarpedMap.

```js
import { parseAnnotation } from '@allmaps/annotation'
import { Analyzer } from '@allmaps/analyze'

// Create an Analyzer for a Proto Georeferenced Map
const protoGeoreferencedMap = {
  "gcps": [
    { "resource": [336, 1742], "geo": [2.2860069, 48.860451] },
    { "resource": [294, 227], "geo": [2.2860069, 48.860451] }, // <- geo point repeated
    { "resource": [2252, 1108], "geo": [2.2945555, 48.8574745] },
    { "resource": [1892, 773], "geo": [2.2945164, 48.8590133] }
  ],
  "resourceMask": [
    [117, 120],
    [113, 1776],
    [4587, 1772],
    [4568, 101]
  ]
}
const analyzer = new Analyzer(protoGeoreferencedMap)

// Or create an Analyzer for a Georeferenced Map
const annotation = await fetch(annoationUrl).then((response) => response.json())
const georeferencedMaps = parseAnnotation(annotation)
const georeferencedMap = georeferencedMaps[0]
const analyzer = new Analyzer(georeferencedMap)

// Or create an Analyzer for a Warped Map
await renderer.addGeoreferenceAnnotation(annotation)
const warpedMap = renderer.warpedMapList.getWarpedMaps()[0]
const analyzer = new Analyzer(warpedMap)
```

Then analyze for info, warnings or errors, or compute measures or distortion.

```js
// Run an analysis to get all info, warnings and errors
const analysis = analyzer.analyze()
// analysis.warnings = {
//   {
//     mapId: 'https://annotations.allmaps.org/images/5748b8df80495d97',
//     code: 'gcpgeorepeatedpoint',
//     geoPoint: [ 2.2860069, 48.860451 ],
//     gcpIndex: 1,
//     message: 'GCP 1 with geo coordinates [2.2860069,48.860451] is repeated.'
//   },
//   ...
// }

// Or specifically get info, warnings and errors
const info = analyzer.getInfo()
const warnings = analyzer.getWarnings()
const errors = analyzer.getErrors()

// Or quickly check e.g. if there are any errors
const hasErrors = analyzer.hasErrors()

// Analyze measures and distortions
const measures = analyzer.getMeasures()
const distortions = analyzer.getDistortions()
```

## Info, Warnings, Errors

An analyzer can analyze the following info, warnings and errors:

| Type    | Code                                      | Topic                                                                                           | Included by default |
|---------|-------------------------------------------|-------------------------------------------------------------------------------------------------|---------------------|
| Info    | `maskequalsfullmask`                      | The mask contains the full image. transformation                                                | Yes                 |
| Warning | `maskmissing`                             | A mask is missing.                                                                              | Yes                 |
| Warning | `gcpoutsidemask`                          | A GCP is outside the mask.                                                                      | Yes                 |
| Warning | `maskpointoutsidefullmask`                | A mask point is outside the full mask.                                                          | Yes                 |
| Warning | `destinationrmsetoohigh`                  | The RMSE is higher then the set maximum times the map diameter.                                 | No                  |
| Warning | `destinationhelmertrmsetoohigh`           | The RMSE is higher then the set maximum times the map diameter for a helmert transformation.    | No                  |
| Warning | `polynomial1sheartoohigh`                 | The shear is higher then a set maximum for a polynomial transformation.                         | Yes                 |
| Warning | `destinationpolynomial1rmsetoohigh`       | The RMSE is higher then the set maximum times the map diameter for a polynomial transformation. | Yes                 |
| Warning | `log2sigmadistortiontoohigh`              | The area distortion (`log2sigma`) is higher then the set maximum or lower then the set minimum. | Yes                 |
| Warning | `twoomegadistortiontoohigh`               | The angular distortion (`twoOmega`) is higher then the set maximum.                             | Yes                 |
| Warning | `triangulationfoldsover`                  | The warped map folds over itself.                                                               | No                  |
| Error   | `constructinggeoreferencedmapfailed`      | A georeferenced map could not be constructed.                                                   | Yes                 |
| Error   | `constructingtriangulatedwarpedmapfailed` | A triangulated warped map could not be constructed.                                             | Yes                 |
| Error   | `constructingwarpedmapfailed`             | A warped map could not be constructed.                                                          | Yes                 |
| Error   | `gcpsmissing`                             | GCPs are missing.                                                                               | Yes                 |
| Error   | `gcpincompleteresource`                   | A GCP has incomplete source coordinates.                                                        | Yes                 |
| Error   | `gcpincompleteregeo`                      | A GCP has incomplete source coordinates.                                                        | Yes                 |
| Error   | `gcpsamountlessthen2`                     | There are less then 2 GCPs.                                                                     | No                  |
| Error   | `gcpsamountlessthen3`                     | There are less then 3 GCPs.                                                                     | Yes                 |
| Error   | `gcpresourcerepeatedpoint`                | GCP resource coordinates are repeated.                                                          | Yes                 |
| Error   | `gcpgeorepeatedpoint`                     | GCP geo coordinates are repeated.                                                               | Yes                 |
| Error   | `gcpsresourcenotlinearlyindependent`                | GCP resource coordinates are not linearly independent.                                                          | Yes                 |
| Error   | `gcpsgeonotlinearlyindependent`                     | GCP geo coordinates are not linearly independent.                                                               | Yes                 |
| Error   | `masknotring`                             | The mask is not a valid ring (an array of points).                                              | Yes                 |
| Error   | `maskrepeatedpoint`                       | Mask resource coordinates are repeated.                                                         | Yes                 |
| Error   | `maskselfintersection`                    | The mask self-intersects.                                                                       | Yes                 |

## Measures

An analyzer can also compute the following measures:

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

## Distortions

An analyzer can also compute the following distortion information:

*   About the current transformation type:
    *   `meanDistortions`: For each computed distortion measure, the mean distortion over all triangulation points.

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
