# @allmaps/staple

Stapling maps together:

1. **Link resource points** on different maps using 'staples'.
2. Express this stapling using a stapled transformation that considers all relevant map transformations jointly and **minimizes the distance in geo space** of the staples' transformed resource points.
3. Solve the stapled transformation and infer new GCPs from the staples that **bring the maps closer together**.

## How it works

The `StapledTransformation` class from this package allows to work with 'stapled transformations': multiple transformation that are coupled by 'staples' and can hence be solved jointly.

Just like the various transformation classes from [@allmaps/transform](../../packages/transform/), a stapled transformation is expressed mathematically using a coefficient matrix. Solving this matrix allows us to obtain the weights that define the transformation, which in turn allows us to evaluate the transformation at new source points. For stapled transformations, the coefficient matrix is a block matrix, built from the constituent transformations' coefficient matrices, with added rows that express how each staple links two transformations by demanding that their corresponding destination points should (ideally) be equal. More details about the mathematical approach can be found [here](https://observablehq.com/d/0ff83cf201ebbf04).

To make it more practical to create and solve stapled transformation when starting from Annotations or Georeferenced Maps, static functions are available to input and output to Georeferenced Maps. They read in Georeferenced Maps and a list of **Resource Control Points** (RCPs). These are points that are defined on a map's resource, but don't (yet) have geo coordinates. Using their `id`, they can be linked to other RCPs, where **two RCPs with matching `id`'s will create a 'staple'** between the corresponding maps. When solving the stapled transformation and evaluating the RCPs using the new found weights corresponding to the transformation of their corresponding map, we can compute their geo coordinates and hence infer new Ground Control Points. These new GCPs

Some details:

* A staple is defined by two 'staple points'. There are the RCPs, where the 'resource' coordinate has been translated to 'source', as custom in a transformation (taking into account `differentHandedness` for example).
* When there are more then two RCPs with a matching `id`, a staple is created between the first and second, first and third, first and fourth etc.

## Installation

This is an ESM-only module that works in browsers and in Node.js.

Install with npm:

```sh
npm install @allmaps/staple
```

## Usage

### Quickstart

When starting from an **Annotation** or **Georeferenced Map**, the fastest way to deal with multiple maps that are 'stapled together' is:

```js
import { parseAnnotation } from '@allmaps/annotation'
import { StapledTransformation } from '@allmaps/staple'

// Fetch an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Create georeferencedMaps from the annotation
const georeferencedMaps = parseAnnotation(annotation)
const georeferencedMap0 = georeferencedMaps[0]
const georeferencedMap1 = georeferencedMaps[1]

georeferencedMap0.gcps.length // return 3: map with 3 GCPs
georeferencedMap1.gcps.length // return 3: map with 3 GCPs

// Define Resource Control Points
// Here two RCPs are have a matching 'id' and will create one staple between mapO and map1
const rcps = [
  {
    type: 'rcp',
    id: 'center',
    mapId: georeferencedMap0.id,
    resource: [4779, 261] // resource point on map0
  },
  {
    type: 'rcp',
    id: 'center', // same id
    mapId: georeferencedMap1.id, // different mapId
    resource: [414, 3597] // resource point on map1
  }
]

// Create a StapledTransformation instance from the Georeferenced Maps and the RCPs
const stapledtransformation = StapledTransformation.fromGeoreferencedMaps(
  [
    georeferencedMap0,
    georeferencedMap1
  ],
  rcps
)

// Use the .toGeoreferencedMaps() method to solve the stapled transformation and infere new GCPs from the staples
const resultingGeoreferencedMaps = stapledtransformation.toGeoreferencedMaps()
const resultingGeoreferencedMap0 = resultingGeoreferencedMaps[0]
const resultingGeoreferencedMap1 = resultingGeoreferencedMaps[1]

// Here one staple created one new GCP on both of it's maps,
// with the original resource point and a new, identical geo point.
resultingGeoreferencedMap0.gcps.length // return 4: map with 3 + 1 = 4 GCPs
resultingGeoreferencedMap1.gcps.length // return 4: map with 3 + 1 = 4 GCPs
resultingGeoreferencedMap0.gcps[3] // { resource: [4779, 261] , geo: [4.941781094220815, 52.34760910486503] }
resultingGeoreferencedMap1.gcps[3] // { resource: [414, 3597] , geo: [4.941781094220815, 52.34760910486503] }

```

### Using StapledTransformation directly

It is also possible to use the StapledTransformation class directly. It has similar methods then the various `Transformation` classes from [@allmaps/transform](../../packages/transform/) to e.g. create a coefficient matrix, solve it and evaluate it.

### Stapled Transformation options

The following options are available for Stapled Transformations:

| Option                    | Description                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default                                            |
|:--------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------|:---------------------------------------------------|
| `averageOut`     | Average out the resulting geo coordinates for each `id`. For inexact transformations (like `'polynomial'`) the geo coordinates will in general not be equal. This forces them be equal. For exact transformation types (like `'thinPlateSpline'`) the geo coordinates will be (quasi) identical making this averaging not (strictly) necessary. Note: the averaging happens in projected geo coordinates. | `boolean`             | `true`

### Stapled Transformation From Georeferenced Map options

The following options are available for Stapled Transformations from Georeferenced Maps, in addition to the Stapled Transformation options:

| Option                    | Description                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default                                            |
|:--------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------|:---------------------------------------------------|
| `transformationType`     | TransformationType to use when building the stapled coefficient matrix. This overrules the map's TransformationType, unless `useMapTransformationTypes` is `true`. | `TransformationType`             | `'polynomial'`
| `useMapTransformationTypes`     | Let `transformationType` overrule the map's TransformationType. | `TransformationType`             | `false`
| `deepClone`     | Deep Clone the map and it's transformer and transformations before returning the results. This prevents from overriding object properties like GCPs on the input objects. | `boolean`             | `true`
| `evaluateStaplePoints`     | For both Staple Points of a Staple, evaluate them using the solved stapled transformation and create a GCP on the corresponding map. | `boolean`             | `true`
| `evaluateSingleStaplePoints`     | For a Staple Points without a matching pair, evaluate them using the solved stapled transformation and create a GCP on the corresponding map. | `boolean`             | `false`
| `evaluateGcps`     | For existing GCPs, re-evaluate them using the solved stapled transformation. | `boolean`             | `false`
| `removeExistingGcps`     | Remove existing GCPs. | `boolean`             | `false`

## Typing

RCPs are defined as follows:

```ts
export type Rcp = {
  type: 'rcp'
  id: string
  mapId: string
  resource: Point
}
```

## License

MIT

## API

### `new StapledTransformation(transformationsById, staples, options)`

Create a Stapled Transformation

###### Parameters

* `transformationsById` (`Map<string, BaseIndependentLinearWeightsTransformation>`)
* `staples` (`Array<Staple>`)
* `options?` (`Partial<StapledTransformationOptions> | undefined`)

###### Returns

`StapledTransformation`.

### `StapledTransformation#coefsArrayMatrices`

###### Type

```ts
[Array<Array<number>>, Array<Array<number>>]
```

### `StapledTransformation#coefsArrayMatricesSize`

###### Type

```ts
[[number, number], [number, number]]
```

### `StapledTransformation#coefsArrayMatrix`

###### Type

```ts
Array<Array<number>>
```

### `StapledTransformation#coefsArrayMatrixSize`

###### Type

```ts
[number, number]
```

### `StapledTransformation#destinationPointsArrays`

###### Type

```ts
[Array<number>, Array<number>]
```

### `StapledTransformation#evaluateFunction(newSourcePoint, id)`

###### Parameters

* `newSourcePoint` (`[number, number]`)
* `id` (`string`)

###### Returns

`[number, number]`.

### `StapledTransformation#getCoefsArrayMatrices()`

###### Parameters

There are no parameters.

###### Returns

`[Array<Array<number>>, Array<Array<number>>]`.

### `StapledTransformation#getCoefsArrayMatrix()`

###### Parameters

There are no parameters.

###### Returns

`Array<Array<number>>`.

### `StapledTransformation#getDestinationPointsArrays()`

###### Parameters

There are no parameters.

###### Returns

`[Array<number>, Array<number>]`.

### `StapledTransformation#options?`

###### Type

```ts
TransformationTypeInputs & { georeferencedMapsById?: Map<string, GeoreferencedMap>; projectedGcpTransformersById?: Map<string, ProjectedGcpTransformer>; ... 7 more ...; removeExistingGcps: boolean; } & { ...; }
```

### `StapledTransformation#processWeightsArrays()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `StapledTransformation#solve()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `StapledTransformation#staplePointsById`

###### Type

```ts
Array<Array<StaplePoint>>
```

### `StapledTransformation#staples`

###### Type

```ts
Array<Staple>
```

### `StapledTransformation#toGeoreferencedMaps()`

Create Georeferenced Maps from this Stapler.
This will solve the stapler, evaluate all staples and add the resulting coordinates as GCPs.

This only works of this Stapler has been created from Georeferenced Maps.

###### Parameters

There are no parameters.

###### Returns

`Array<{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: str...`.

### `StapledTransformation#trailingCumulativeCoefsArrayMatrixSizeById`

###### Type

```ts
Map<string, [number, number]>
```

### `StapledTransformation#transformationsById`

###### Type

```ts
Map<string, BaseIndependentLinearWeightsTransformation>
```

### `StapledTransformation#weightsArrays?`

###### Type

```ts
[Array<number>, Array<number>]
```

### `StapledTransformation#weightsArraysById?`

###### Type

```ts
Map<string, [Array<number>, Array<number>]>
```

### `StapledTransformation.fromGeoreferencedMaps(georeferencedMaps, rcps, options)`

Create a StapledTransformation from Georeferenced Maps

By default, a Projected GCP Transformer is created for each Georeferenced Map,
and from it a Thin Plate Spline transformation is created and passed to the StapledTransformation.

Use the options to specify another transformation type for all maps,
or specifically set the option 'useMapTransformationTypes' to true to use the type defined in the Georeferenced Map.

###### Parameters

* `georeferencedMaps` (`Array<{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: str...`)
  * Georeferenced Maps
* `rcps` (`Array<Rcp>`)
* `options?` (`Partial<{ internalProjection: Projection; projection: Projection; } & { differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; ... 6 more ...; preToResource: ProjectionFunction; } & MultiGeometryOptions & TransformationTypeInputs & { ...; }> | undefined`)
  * Options, including Projected GCP Transformer Options, and a transformation type to overrule the type defined in the Georeferenced Map

###### Returns

`StapledTransformation`.
