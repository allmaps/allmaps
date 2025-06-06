# @allmaps/attach

Attaching maps together:

1. **Link resource points** on different maps using 'attachments'.
2. Express this attaching using an attached transformation that considers all relevant map transformations jointly and **minimizes the distance in geo space** of the attachments' transformed resource points.
3. Solve the attached transformation and infer new GCPs from the attachments that **bring the maps closer together**.

## How it works

The `AttachedTransformation` class from this package allows to work with 'attached transformations': multiple transformation that are coupled by 'attachments' and can hence be solved jointly.

Just like the various transformation classes from [@allmaps/transform](../../packages/transform/), an attached transformation is expressed mathematically using a coefficient matrix. Solving this matrix allows us to obtain the weights that define the transformation, which in turn allows us to evaluate the transformation at new source points. For attached transformations, the coefficient matrix is a block matrix, built from the constituent transformations' coefficient matrices, with added rows that express how each attachment links two transformations by demanding that their corresponding destination points should (ideally) be equal. More details about the mathematical approach can be found [here](https://observablehq.com/d/0ff83cf201ebbf04).

To make it more practical to create and solve attached transformation when starting from Annotations or Georeferenced Maps, static functions are available to input and output to Georeferenced Maps. They read in Georeferenced Maps and a list of '**Resource Control Points**' (RCPs). These are points that are defined on a map's resource, but don't (yet) have geo coordinates. Using their `id`, they can be linked to other RCPs, where **two RCPs with matching `id`'s will create an 'attachment'** between the corresponding maps. When solving the attached transformation and evaluating the RCPs using the new found weights corresponding to the transformation of their corresponding map, we can compute their geo coordinates and hence infer new Ground Control Points. These new GCPs

Some details:

* An attachment is defined by two '**Source Control Points**' (SCPs). These are the RCPs, where the 'resource' coordinate has been translated to 'source', as custom in a transformation (taking into account `differentHandedness` for example).
* When there are more then two RCPs with a matching `id`, an attachment is created between the first and second, first and third, first and fourth etc.

## Installation

This is an ESM-only module that works in browsers and in Node.js.

Install with npm:

```sh
npm install @allmaps/attach
```

## Usage

### Quickstart

When starting from an **Annotation** or **Georeferenced Map**, the fastest way to deal with multiple maps that are 'attached together' is:

```js
import { parseAnnotation } from '@allmaps/annotation'
import { AttachedTransformation } from '@allmaps/attach'

// Fetch an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Create georeferencedMaps from the annotation
const georeferencedMaps = parseAnnotation(annotation)
const georeferencedMap0 = georeferencedMaps[0]
const georeferencedMap1 = georeferencedMaps[1]

georeferencedMap0.gcps.length // return 3: map with 3 GCPs
georeferencedMap1.gcps.length // return 3: map with 3 GCPs

// Define Resource Control Points
// Here two RCPs are have a matching 'id' and will create one attachment between mapO and map1
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

// Create a AttachedTransformation instance from the Georeferenced Maps and the RCPs
const attachedtransformation = AttachedTransformation.fromGeoreferencedMaps(
  [
    georeferencedMap0,
    georeferencedMap1
  ],
  rcps
)

// Use the .toGeoreferencedMaps() method to solve the attached transformation and infere new GCPs from the attachments
const resultingGeoreferencedMaps = attachedtransformation.toGeoreferencedMaps()
const resultingGeoreferencedMap0 = resultingGeoreferencedMaps[0]
const resultingGeoreferencedMap1 = resultingGeoreferencedMaps[1]

// Here one attachment created one new GCP on both of it's maps,
// with the original resource point and a new, identical geo point.
resultingGeoreferencedMap0.gcps.length // return 4: map with 3 + 1 = 4 GCPs
resultingGeoreferencedMap1.gcps.length // return 4: map with 3 + 1 = 4 GCPs
resultingGeoreferencedMap0.gcps[3] // { resource: [4779, 261] , geo: [4.941781094220815, 52.34760910486503] }
resultingGeoreferencedMap1.gcps[3] // { resource: [414, 3597] , geo: [4.941781094220815, 52.34760910486503] }

```

### Using AttachedTransformation directly

It is also possible to use the AttachedTransformation class directly. It has similar methods then the various `Transformation` classes from [@allmaps/transform](../../packages/transform/) to e.g. create a coefficient matrix, solve it and evaluate it.

### Attached transformation options

The following options are available for Attached transformations:

| Option                    | Description                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default                                            |
|:--------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------|:---------------------------------------------------|
| `averageOut`     | Average out the resulting geo coordinates for each `id`. For inexact transformations (like `'polynomial'`) the geo coordinates will in general not be equal. This forces them be equal. For exact transformation types (like `'thinPlateSpline'`) the geo coordinates will be (quasi) identical making this averaging not (strictly) necessary. Note: the averaging happens in projected geo coordinates. | `boolean`             | `true`

### Attached transformation From Georeferenced Map options

The following options are available for Attached transformations from Georeferenced Maps, in addition to the Attached transformation options:

| Option                    | Description                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default                                            |
|:--------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------|:---------------------------------------------------|
| `transformationType`     | TransformationType to use when building the attached transformation coefficient matrix. This overrules the map's TransformationType, unless `useMapTransformationTypes` is `true`. | `TransformationType`             | `'polynomial'`
| `useMapTransformationTypes`     | Let `transformationType` overrule the map's TransformationType. | `TransformationType`             | `false`
| `deepClone`     | Deep Clone the map and it's transformer and transformations before returning the results. This prevents from overriding object properties like GCPs on the input objects. | `boolean`             | `true`
| `evaluateAttachmentSourceControlPoints`     | For both Source Control Points of an attachment, evaluate them using the solved attached transformation and create a GCP on the corresponding map. | `boolean`             | `true`
| `evaluateSingleSourceControlPoints`     | For Source Control Points without a matching pair, evaluate them using the solved attached transformation and create a GCP on the corresponding map. | `boolean`             | `false`
| `evaluateGcps`     | For existing GCPs, re-evaluate them using the solved attached transformation. | `boolean`             | `false`
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

### `new AttachedTransformation(transformationsById, attachments, options)`

Create a Attached Transformation

###### Parameters

* `transformationsById` (`Map<string, BaseIndependentLinearWeightsTransformation>`)
* `attachments` (`Array<Attachment>`)
* `options?` (`Partial<AttachedTransformationOptions> | undefined`)

###### Returns

`AttachedTransformation`.

### `AttachedTransformation#ScpsById`

###### Type

```ts
Array<Array<Scp>>
```

### `AttachedTransformation#attachments`

###### Type

```ts
Array<Attachment>
```

### `AttachedTransformation#coefsArrayMatrices`

###### Type

```ts
[Array<Array<number>>, Array<Array<number>>]
```

### `AttachedTransformation#coefsArrayMatricesSize`

###### Type

```ts
[[number, number], [number, number]]
```

### `AttachedTransformation#coefsArrayMatrix`

###### Type

```ts
Array<Array<number>>
```

### `AttachedTransformation#coefsArrayMatrixSize`

###### Type

```ts
[number, number]
```

### `AttachedTransformation#destinationPointsArrays`

###### Type

```ts
[Array<number>, Array<number>]
```

### `AttachedTransformation#evaluateFunction(newSourcePoint, id)`

###### Parameters

* `newSourcePoint` (`[number, number]`)
* `id` (`string`)

###### Returns

`[number, number]`.

### `AttachedTransformation#getCoefsArrayMatrices()`

###### Parameters

There are no parameters.

###### Returns

`[Array<Array<number>>, Array<Array<number>>]`.

### `AttachedTransformation#getCoefsArrayMatrix()`

###### Parameters

There are no parameters.

###### Returns

`Array<Array<number>>`.

### `AttachedTransformation#getDestinationPointsArrays()`

###### Parameters

There are no parameters.

###### Returns

`[Array<number>, Array<number>]`.

### `AttachedTransformation#options?`

###### Type

```ts
TransformationTypeInputs & { georeferencedMapsById?: Map<string, GeoreferencedMap>; projectedGcpTransformersById?: Map<string, ProjectedGcpTransformer>; ... 7 more ...; removeExistingGcps: boolean; } & { ...; }
```

### `AttachedTransformation#processWeightsArrays()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `AttachedTransformation#solve()`

###### Parameters

There are no parameters.

###### Returns

`void`.

### `AttachedTransformation#toGeoreferencedMaps()`

Create Georeferenced Maps from this Attached Transformation.
This will solve the Attached Transformation,
evaluate all attachements (in all source control points),
infere GCPs from them,
and add them to the original Georeferenced Maps.

This only works if this AttachedTransformation has been created from Georeferenced Maps.

###### Parameters

There are no parameters.

###### Returns

`Array<{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: str...`.

### `AttachedTransformation#trailingCumulativeCoefsArrayMatrixSizeById`

###### Type

```ts
Map<string, [number, number]>
```

### `AttachedTransformation#transformationsById`

###### Type

```ts
Map<string, BaseIndependentLinearWeightsTransformation>
```

### `AttachedTransformation#weightsArrays?`

###### Type

```ts
[Array<number>, Array<number>]
```

### `AttachedTransformation#weightsArraysById?`

###### Type

```ts
Map<string, [Array<number>, Array<number>]>
```

### `AttachedTransformation.fromGeoreferencedMaps(georeferencedMaps, rcps, options)`

Create a AttachedTransformation from Georeferenced Maps

By default, a Projected GCP Transformer is created for each Georeferenced Map,
and from it a Thin Plate Spline transformation is created and passed to the AttachedTransformation.

Use the options to specify another transformation type for all maps,
or specifically set the option 'useMapTransformationTypes' to true to use the type defined in the Georeferenced Map.

###### Parameters

* `georeferencedMaps` (`Array<{ type: "GeoreferencedMap"; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; height?: number | undefined; width?: number | undefined; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: str...`)
  * Georeferenced Maps
* `rcps` (`Array<Rcp>`)
* `options?` (`Partial<{ internalProjection: Projection; projection: Projection; } & { differentHandedness: boolean; } & { maxDepth: number; minOffsetRatio: number; ... 6 more ...; preToResource: ProjectionFunction; } & MultiGeometryOptions & TransformationTypeInputs & { ...; }> | undefined`)
  * Options, including Projected GCP Transformer Options, and a transformation type to overrule the type defined in the Georeferenced Map

###### Returns

`AttachedTransformation`.
