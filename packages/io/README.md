# @allmaps/io

Import properties and export derivatives of [Georeference Annotations](https://iiif.io/api/extension/georef/).

For parsing and generating full Georeference Annotations, see [@allmaps/annotation](../../packages/annotation/)

## Installation

This is an ESM-only module that works in browsers and in Node.js.

Install with npm:

```sh
npm install @allmaps/io
```

## Usage

This package contains functions for importing specific properties of Georeference Annotation, or creating derivatives from them. These are used in apps like [@allmaps/cli](../../apps/cli/) and [@allmaps/editor](../../apps/editor/).

### GeoTIFF scripts

Generate a Bash script that uses [GDAL](https://gdal.org/index.html) to convert one or more downloaded full-size IIIF images to [Cloud Optimized GeoTIFFs](https://www.cogeo.org/) using a given Georeferenced Map:

```js
import { parseAnnotation } from '@allmaps/annotation'
import { ProjectedGcpTransformer } from '@allmaps/project'

// Fetch an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Create georeferencedMaps from the annotation
const georeferencedMaps = parseAnnotation(annotation)

// Create the script
const geotiffScripts = await getGeoreferencedMapsGeotiffScripts(maps)

// Log scripts (or write to file)
console.log(geotiffScripts.join('\n'))
```

The generated Bash script expects the full-size images to be available on the local file system with the correct name. You can download these images manually or using the [@allmaps/cli](../../apps/cli/)'s `allmaps fetch full-image` or `allmaps script dezoomify` command.

### Parse GCPs

GCPs can be parsed from common [GCP file formats](#gcp-file-formats).

```js
import { readFileSync} from 'fs'

// Read a GCP file
const gcpString = readFileSync('./gcps.points', { encoding: 'utf8', flag: 'r' });

// parse the GCPs and possible internal projection
const { gcps, internalProjection } = parseGcps(gcpString)
```

An internal projection can be included in a QGIS GCP file and will be used when parsing and returned. An internal projection can be specified to parse ArcGIS files. The resource height must specified to parse ArcGIS files.

## GCP file formats

The following GCP file formats are supported for reading and writing:

```ts
export type gcpFileType = 'gdal' | 'qgis' | 'arcgis-csv' | 'arcgis-tsv'
```

### GDAL-like files

Such files could have any name or file-extension.

```js
3899 6412 9.9301538 53.5814021
6584 819 25.4101689 71.0981125
6491 4782 22.2380717 60.4764844
1409 5436 -3.2014645 55.959946
1765 1737 -18.1014216 64.3331759
```

Column order is `resourceX`, `resourceY`, `internalProjectedGeoX`, `internalProjectedGeoY`. Resource origin is in the upper left of the image, and resource y-axis is pointing down (so the handedness is flipped).

### QGIS Georeferencer files

File format used in [QGIS Georeferencer](https://docs.qgis.org/3.40/en/docs/user_manual/managing_data_source/georeferencer.html). Such files typically have the `.points` file-extension.

```txt
#CRS: PROJCS["ETRS89-extended / LAEA Europe",GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6258"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4258"]],PROJECTION["Lambert_Azimuthal_Equal_Area"],PARAMETER["latitude_of_center",52],PARAMETER["longitude_of_center",10],PARAMETER["false_easting",4321000],PARAMETER["false_northing",3210000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AUTHORITY["EPSG","3035"]]
mapX,mapY,sourceX,sourceY,enable,dX,dY,residual
4316373.376414543,3385976.075841331,3899,-1161,1,-0.0000000000039222,0.00000000030794922,0.0000000003079742
4880681.582355963,5391377.562290795,6584,-6754,1,-0.0000000000039222,0.00000000030794922,0.0000000003079742
4992046.052562315,4211073.756809569,6491,-2791,1,-0.0000000000039222,0.00000000030794922,0.0000000003079742
3501317.073142613,3726222.5800730046,1409,-2137,1,-0.0000000000039222,0.00000000030794922,0.0000000003079742
2997626.6441897955,4852265.50079984,1765,-5836,1,-0.0000000000039222,0.00000000030794922,0.0000000003079742
```

Column order is `internalProjectedGeoX`, `internalProjectedGeoY`, `resourceX`, `resourceY`. Resource origin is in the upper left of the image, and resource y-axis is pointing up (with negative `resourceY` coordinates so as to assure equal handedness of the resource and projectedGeo axis). The first line may specify a CRS in WKT format, in which case projected coordinates are read in this CRS and this CRS is passed as an `internalProjection`.

### ESRI CSV files

File format used in ArcGIS and [MapAnalyst](https://mapanalyst.org/man/points.html). Such files typically have the `.csv` file-extension.

```
1,3899,1161,9.9301538,53.5814021
2,6584,6754,25.4101689,71.0981125
3,6491,2791,22.2380717,60.4764844
4,1409,2137,-3.2014645,55.959946
5,1765,5836,-18.1014216,64.3331759
```

Column order is `id`, `resourceX`, `resourceY`, `internalProjectedGeoX`, `internalProjectedGeoY`. Resource origin is in the lower left of the image, and resource y-axis is pointing up (so as to assure equal handedness of the resource and projectedGeo axis). For such files the resource height is required in order to compute the `resourceY` coordinate w.r.t. an origin in the upper left, as is the case in Allmaps.

### ESRI TSV files

File format used in ArcGIS. Such files typically have the `.txt` file-extension.

```
3899	1161	9.9301538	53.5814021
6584	6754	25.4101689	71.0981125
6491	2791	22.2380717	60.4764844
1409	2137	-3.2014645	55.959946
1765	5836	-18.1014216	64.3331759
```

Column order is `resourceX`, `resourceY`, `internalProjectedGeoX`, `internalProjectedGeoY`. Resource origin is in the lower left of the image, and resource y-axis is pointing up (so as to assure equal handedness of the resource and projectedGeo axis). For such files the resource height is required in order to compute the `resourceY` coordinate w.r.t. an origin in the upper left, as is the case in Allmaps.

## License

MIT

## API

### `GcpFileType`

###### Type

```ts
'qgis' | 'arcgis-csv' | 'arcgis-tsv' | 'gdal'
```

### `checkCommand(command, message)`

###### Parameters

* `command` (`string`)
* `message` (`string`)

###### Returns

`string`.

### `gcpFileTypes`

###### Type

```ts
Array<string>
```

### `getGdalPreamble(options)`

###### Parameters

* `options` (`{outputDir?: string | undefined}`)

###### Returns

`string`.

### `getGdalbuildvrtScript(basenames, options)`

###### Parameters

* `basenames` (`Array<string>`)
* `options` (`{outputDir?: string | undefined}`)

###### Returns

`string`.

### `getGeoreferencedMapGdalwarpScripts(map, options)`

###### Parameters

* `map` (`{ type: "GeoreferencedMap"; gcps: { resource: [number, number]; geo: [number, number]; }[]; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ type: st...`)
* `options` (`{
    projectedTransformer?: ProjectedGcpTransformer | undefined
    imageFilenames?: {[key: string]: string} | undefined
    sourceDir?: string | undefined
    outputDir?: string | undefined
    jpgQuality?: number | undefined
  }`)

###### Returns

`Promise<{
  basename: string
  checkScript: string
  gdalWarpScript: string
}>`.

### `getGeoreferencedMapsGeotiffScripts(maps, options)`

###### Parameters

* `maps` (`Array<{ type: "GeoreferencedMap"; gcps: { resource: [number, number]; geo: [number, number]; }[]; resource: { type: "ImageService1" | "ImageService2" | "ImageService3" | "Canvas"; id: string; partOf?: ({ type: string; id: string; label?: Record<string, (string | number | boolean)[]> | undefined; } & { partOf?: ({ ty...`)
* `options` (`{
    projectedTransformers?: Array<ProjectedGcpTransformer> | undefined
    imageFilenames?: {[key: string]: string} | undefined
    sourceDir?: string | undefined
    outputDir?: string | undefined
    jpgQuality?: number | undefined
  }`)

###### Returns

`Promise<Array<string>>`.

### `parseArcGisCsvGcpLines(lines, options)`

###### Parameters

* `lines` (`Array<string>`)
* `options?` (`Partial<{resourceHeight: number}> | undefined`)

###### Returns

`Array<Gcp>`.

### `parseArcGisTsvGcpLines(lines, options)`

###### Parameters

* `lines` (`Array<string>`)
* `options?` (`Partial<{resourceHeight: number}> | undefined`)

###### Returns

`Array<Gcp>`.

### `parseGcpString(gcpString, options)`

###### Parameters

* `gcpString` (`string`)
* `options?` (`Partial<{resourceHeight: number}> | undefined`)

###### Returns

`Array<Gcp>`.

### `parseGcps(gcpString, options)`

Parse GCPs from file string.

An internal projection can be included in a QGIS GCP file and will be used when parsing and returned.
An internal projection can be specified to parse ArcGIS files.
The resource height must specified to parse ArcGIS files.

###### Parameters

* `gcpString` (`string`)
* `options?` (`  | Partial<{resourceHeight: number; internalProjection: Projection}>
    | undefined`)

###### Returns

`{gcps: Gcp[]; internalProjection?: Projection}`.

### `parseGdalCoordinateLines(lines)`

###### Parameters

* `lines` (`Array<string>`)

###### Returns

`Array<Array<number>>`.

### `parseGdalGcpLines(lines)`

###### Parameters

* `lines` (`Array<string>`)

###### Returns

`Array<Gcp>`.

### `parseInternalProjectionDefinitionFromGcpString(gcpString)`

###### Parameters

* `gcpString` (`string`)

###### Returns

`string | undefined`.

### `parseInternalProjectionDefinitionFromLine(line)`

###### Parameters

* `line` (`string`)

###### Returns

`string | undefined`.

### `parseInternalProjectionFromGcpString(gcpString)`

###### Parameters

* `gcpString` (`string`)

###### Returns

`Projection | undefined`.

### `parseQgisGcpLines(lines)`

###### Parameters

* `lines` (`Array<string>`)

###### Returns

`Array<Gcp>`.

### `printArcGisCsvGcpLines(gcp, options)`

###### Parameters

* `gcp` (`Array<Gcp>`)
* `options?` (`Partial<{resourceHeight: number}> | undefined`)

###### Returns

`Array<string>`.

### `printArcGisTsvGcpLines(gcp, options)`

###### Parameters

* `gcp` (`Array<Gcp>`)
* `options?` (`Partial<{resourceHeight: number}> | undefined`)

###### Returns

`Array<string>`.

### `printGcps(gcps, options)`

Print GCPs to file string.

An internal projection can be specified files to print files.
It's definition will be included in QGIS GCP files.
The resource height must specified to parse ArcGIS files.

###### Parameters

* `gcps` (`Array<Gcp>`)
* `options?` (`  | Partial<{
        resourceHeight: number
        internalProjection: Projection
        gcpFileType: GcpFileType
      }>
    | undefined`)

###### Returns

`string`.

### `printGdalGcpLines(gcp)`

###### Parameters

* `gcp` (`Array<Gcp>`)

###### Returns

`Array<string>`.

### `printQgisGcpLines(gcp)`

###### Parameters

* `gcp` (`Array<Gcp>`)

###### Returns

`Array<string>`.

### `printQgisHeader(options)`

###### Parameters

* `options?` (`Partial<{internalProjection: Projection}> | undefined`)

###### Returns

`Array<string>`.
