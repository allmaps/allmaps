# @allmaps/staple

Stapling maps together, and creating new GCPs from staples.

## How it works

The `StapledTransformation` class from this package allows to work with 'stapled transformations', in analogy with the various `Transformation` classes from [@allmaps/transform](../../packages/transform/). It equally expresses a transformation using a coefficient matrix, by forming a block matrix from the constituent transformations' coefficient matrices, and adding rows that express the staples. More details about the mathematical approach can be found [here](https://observablehq.com/d/0ff83cf201ebbf04).

To make it more practical to create and solve stapled transformation when starting from Annotations or Georeferenced Maps, static functions are available to input and output to Georeferenced Maps.

When processing Georeferenced Maps, staples are defined using **Resource Control Points** (RCPs). These are points that are defined on a map's resource, but don't (yet) have geo coordinates. Using their `id`, they can be linked to other RCPs, where **two RCPs with matching `id`'s will create a 'staple'** between the corresponding maps.

Some details:

- A staple is defined by two 'staple points'. There are the RCPs, where the 'resource' coordinate has been translated to 'source', as custom in a transformation (taking into account `differentHandedness` for example).
- When there are more then two RCPs with a matching `id`, a staple is created between the first and second, first and third, first and fourth etc.

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
import { ProjectedGcpTransformer } from '@allmaps/project'

// Fetch an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Create a georeferencedMap from the annotation
const georeferencedMaps = parseAnnotation(annotation)
const georeferencedMap0 = georeferencedMaps[0] // map with 3 GCPs
const georeferencedMap1 = georeferencedMaps[1] // map with 6 GCPs

// Define Resource Control Points
// Here two RCPs are have a matching 'id' and will create one staple and one new GCP
const rcps = [
  {
    type: 'rcp',
    id: 'center',
    mapId: georeferencedMap0.id,
    resource: [100, 200] // resource point on map0
  },
  {
    type: 'rcp',
    id: 'center', // same id
    mapId: georeferencedMap1.id, // different mapId
    resource: [350, 150] // resource point on map1
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

// Use the .toGeoreferencedMaps() method to solve the stapled transformation
// and infere new GCPs from the RCPs
const resultingGeoreferencedMaps = stapledtransformation.toGeoreferencedMaps()
const resultingGeoreferencedMap0 = resultingGeoreferencedMaps[0] // map now has 3 + 1 = 4 GCPs
const resultingGeoreferencedMap1 = resultingGeoreferencedMaps[1] // map now has 6 + 1 = 7 GCPs
```

### Using StapledTransformation directly

It is also possible to use the StapledTransformation class directly. It has similar methods then the various `Transformation` classes from [@allmaps/transform](../../packages/transform/) to e.g. create a coefficient matrix, solve it and evaluate it.

### Stapled Transformation options

The following options are available for Stapled Transformations:

| Option                    | Description                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default                                            |
|:--------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------|:---------------------------------------------------|
| `averageOut`     | Average out the resulting geo coordinates (averaging happens in projected geo coordinates). | `boolean`             | `true`

### Stapled Transformation From Georeferenced Map options

The following options are available for Stapled Transformations from Georeferenced Maps, in addition to the Stapled Transformation options:

| Option                    | Description                                                                                                                                                                                                                                                                                                                                                               | Type                  | Default                                            |
|:--------------------------|:--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:----------------------|:---------------------------------------------------|
| `transformationType`     | TransformationType to use when building the stapled coefficient matrix. This overrules the map's TransformationType, unless `useMapTransformationTypes` is `true`. | `TransformationType`             | `polynomial`
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
}```

## License

MIT

## API
