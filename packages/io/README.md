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

### Print GCPs

GCPs can be printed to common [GCP file formats](#gcp-file-formats).

```js
import { parseAnnotation } from '@allmaps/annotation'
import { ProjectedGcpTransformer } from '@allmaps/project'

// Fetch an annotation
const annotation = await fetch(annoationUrl).then((response) => response.json())

// Create a georeferencedMap from the annotation
const georeferencedMaps = parseAnnotation(annotation)
const georeferencedMap = parseAnnotation(annotation)

// Print GCPs to QGIS format
const gcpString = generateGeoreferencedMapGcps(georeferencedMap, {
  gcpFileFormat: 'qgis'
})

// Log GCPs (or write to file)
console.log(gcpString)
```

GCPs are printed in "EPSG:4326" by default, but their projection can be specified via the options. Use "EPSG:3857", the default projection in [@allmaps/project](../../packages/project/) and [@allmaps/render](../../packages/render/), to obtain the same result when using printed GCPs in e.g. QGIS.

### Parse GCPs

GCPs can be parsed from common [GCP file formats](#gcp-file-formats).

```js
import { readFileSync } from 'fs'

// Read a GCP file
const gcpString = readFileSync('./gcps.points', { encoding: 'utf8', flag: 'r' })

// parse the GCPs and, if found in a QGIS file format, their projection
const { gcps, gcpProjection } = parseGcps(gcpString)
```

GCPs are expected in "EPSG:4326" by default, but their projection can be specified in a QGIS GCP file format or via the options.

## GCP file formats

The following GCP file formats are supported for reading and writing:

```ts
export type gcpFileFormat = 'gdal' | 'qgis' | 'arcgis-csv' | 'arcgis-tsv'
```

### GDAL-like files

GDAL doesn't allow loading GCP from files, but `gdal_translate` allows to specify GCPs using argument. The [documentation](https://gdal.org/en/stable/programs/gdal_translate.html#cmdoption-gdal_translate-gcp) about this tells us something about GCPs in GDAL:

`-gcp <pixel> <line> <easting> <northing> [<elevation>]`

If we follow the same logic, a GDAL GCP file would look like this:

```
3899 6412 9.9301538 53.5814021
6584 819 25.4101689 71.0981125
6491 4782 22.2380717 60.4764844
1409 5436 -3.2014645 55.959946
1765 1737 -18.1014216 64.3331759
```

Column order is `resourceX`, `resourceY`, `gcpProjectedGeoX`, `gcpProjectedGeoY`. Resource origin is in the upper left of the image, and resource y-axis is pointing down.

Since this (simple) format follows the same conventions as other Allmaps packages and as the [Georeference Annotation spec](https://iiif.io/api/extension/georef/), we'll use this format as a default.

### QGIS Georeferencer files

File format used in [QGIS Georeferencer](https://docs.qgis.org/3.40/en/docs/user_manual/managing_data_source/georeferencer.html). Such files typically have the `.points` file-extension.

```
#CRS: PROJCS["ETRS89-extended / LAEA Europe",GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],TOWGS84[0,0,0,0,0,0,0],AUTHORITY["EPSG","6258"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4258"]],PROJECTION["Lambert_Azimuthal_Equal_Area"],PARAMETER["latitude_of_center",52],PARAMETER["longitude_of_center",10],PARAMETER["false_easting",4321000],PARAMETER["false_northing",3210000],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AUTHORITY["EPSG","3035"]]
mapX,mapY,sourceX,sourceY,enable,dX,dY,residual
4316373.376414543,3385976.075841331,3899,6412,1,-0.0000000000039222,0.00000000030794922,0.0000000003079742
4880681.582355963,5391377.562290795,6584,819,1,-0.0000000000039222,0.00000000030794922,0.0000000003079742
4992046.052562315,4211073.756809569,6491,4782,1,-0.0000000000039222,0.00000000030794922,0.0000000003079742
3501317.073142613,3726222.5800730046,1409,5436,1,-0.0000000000039222,0.00000000030794922,0.0000000003079742
2997626.6441897955,4852265.50079984,1765,1737,1,-0.0000000000039222,0.00000000030794922,0.0000000003079742
```

Column order is `gcpProjectedGeoX`, `gcpProjectedGeoY`, `resourceX`, `resourceY`. Resource origin is in the upper left of the image, and resource y-axis is pointing up (with negative `resourceY` coordinates so as to assure equal handedness of the resource and projectedGeo axis).

The first line may specify a CRS in WKT format (proj4string not supported currently). When reading this format the CRS in this first line is parsed and returned via the `gcpProjection` and the GCPs are parsed using this CRS. When printing to this format the `gcpProjection` option's definition is printed as this CRS. Since only a WKT format is supported, avoid passing a projection whose definition is a proj4string.

### ESRI CSV files

File format used in ArcGIS. Such files typically have the `.csv` file-extension.

```
1,3899,6412,9.9301538,53.5814021
2,6584,819,25.4101689,71.0981125
3,6491,4782,22.2380717,60.4764844
4,1409,5436,-3.2014645,55.959946
5,1765,1737,-18.1014216,64.3331759
```

Column order is `id`, `resourceX`, `resourceY`, `gcpProjectedGeoX`, `gcpProjectedGeoY`. Resource origin is in the upper left of the image, and resource y-axis is pointing up (with negative `resourceY` coordinates so as to assure equal handedness of the resource and projectedGeo axis).

### ESRI TSV files

File format used in ArcGIS. Such files typically have the `.txt` file-extension.

```
3899	6412	9.9301538	53.5814021
6584	819	25.4101689	71.0981125
6491	4782	22.2380717	60.4764844
1409	5436	-3.2014645	55.959946
1765	1737	-18.1014216	64.3331759
```

Column order is `resourceX`, `resourceY`, `gcpProjectedGeoX`, `gcpProjectedGeoY`. Resource origin is in the upper left of the image, and resource y-axis is pointing up (with negative `resourceY` coordinates so as to assure equal handedness of the resource and projectedGeo axis).

## License

MIT

## API

### `GcpFileFormat`

###### Type

```ts
'qgis' | 'arcgis-csv' | 'arcgis-tsv' | 'gdal'
```

### `GcpFileFormatWithResourceYAxisUp`

###### Type

```ts
'qgis' | 'arcgis-csv' | 'arcgis-tsv'
```

### `GcpResourceOrigin`

###### Type

```ts
'top-left' | 'bottom-left'
```

### `GcpResourceYAxis`

###### Type

```ts
'up' | 'down'
```

### `generateCheckCommand(command, message)`

###### Parameters

* `command` (`string`)
* `message` (`string`)

###### Returns

`string`.

### `generateGeoreferencedMapGcps(map, options)`

Generate GCPs from Georeferenced Map to file string.

A projection can be specified files to print files,
and will be infered from the map's resourceCrs by default.
Its definition will be included in QGIS GCP files.
The resource height must specified when parsing GCPs with resource origin in bottom left,
and will be infered from the map by default.

###### Parameters

* `map` (`any`)
* `options?` (`  | Partial<{
        gcpFileFormat: GcpFileFormat
        gcpResourceYAxis: GcpResourceYAxis
        gcpResourceWidth: number
        gcpResourceHeight: number
        resourceWidth: number
        resourceHeight: number
        gcpResourceOrigin: GcpResourceOrigin
        gcpProjection: Projection
      }>
    | undefined`)

###### Returns

`string`.

### `generateGeoreferencedMapsGeotiffScripts(maps, options)`

###### Parameters

* `maps` (`Array<any>`)
* `options` (`{
    projectedTransformers?: Array<ProjectedGcpTransformer> | undefined
    imageFilenames?: {[key: string]: string} | undefined
    sourceDir?: string | undefined
    outputDir?: string | undefined
    jpgQuality?: number | undefined
  }`)

###### Returns

`Promise<Array<string>>`.

### `generateLeafletExample(annotationUrl, center, zoom)`

###### Parameters

* `annotationUrl` (`string`)
* `center` (`[number, number]`)
* `zoom` (`number`)

###### Returns

`string`.

### `generateMapLibreExample(annotationUrl, center, zoom)`

###### Parameters

* `annotationUrl` (`string`)
* `center` (`[number, number]`)
* `zoom` (`number`)

###### Returns

`string`.

### `generateOpenLayersExample(annotationUrl, center, zoom)`

###### Parameters

* `annotationUrl` (`string`)
* `center` (`[number, number]`)
* `zoom` (`number`)

###### Returns

`string`.

### `parseGcpProjectionFromGcpString(gcpString)`

###### Parameters

* `gcpString` (`string`)

###### Returns

`Projection | undefined`.

### `parseGcps(gcpString, options)`

Parse GCPs from file string.

A projection can be included in a QGIS GCP file and will be used when parsing and returned.
A projection can be specified to parse ArcGIS files.
The resource height must specified when parsing GCPs with resource origin in bottom left.

###### Parameters

* `gcpString` (`string`)
* `options?` (`  | Partial<{
        gcpFileFormat: GcpFileFormat
        gcpResourceYAxis: GcpResourceYAxis
        gcpResourceWidth: number
        gcpResourceHeight: number
        resourceWidth: number
        resourceHeight: number
        gcpResourceOrigin: GcpResourceOrigin
        gcpProjection: Projection
      }>
    | undefined`)

###### Returns

`{gcps: Gcp[]; gcpProjection?: Projection}`.

### `parseGdalCoordinateLines(lines)`

###### Parameters

* `lines` (`Array<string>`)

###### Returns

`Array<Array<number>>`.
