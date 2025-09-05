# @allmaps/cli

Command-line interface for [Allmaps](https://allmaps.org/).

A developer tool to help you create, manipulate and use (files with) Georeferenced Annotations directly from the command line.

Here's the output of `allmaps --help` to give you an idea of what you can do with it:

```sh
Allmaps CLI

Usage: allmaps [options] [command]

Options:
  -h, --help                   display help for command

Commands:
  annotation                   parse and generate Georeference Annotations
  attach [options] [files...]  attach maps
  fetch                        fetche IIIF images
  iiif                         parse and generate IIIF resources
  id [urls...]                 generate Allmaps IDs from input URLs
  launch                       launch maps in Allmaps Viewer or other tools
  script                       generate Bash scripts
  transform                    transform resource coordinates to geospatial
                               coordinates and vice versa
  help [command]               display help for command

For more details about Allmaps, see https://allmaps.org
```

## Installation

Use npm to install Allmaps CLI globally:

```bash
npm install -g @allmaps/cli
```

## Usage

Run Allmaps CLI in your terminal:

```bash
allmaps
```

Without arguments this command displays the help page. Help is always accessible in the following way:

```bash
allmaps --help
```

```bash
allmaps <command> --help
```

### Development

In local development, run the compiled code using a JavaScript runtime like `node`. The equivalent of the `allmaps` command is then:

```bash
node ./dist/index.js
```

### Input and output

Most CLI commands accept one or more files as input. You can supply these files in two ways:

- Supplied at the end of the command using their full or relative paths. In the CLI's help output, this is shown as `[files...]`: `allmaps annotation generate path/to/my-georeferenced-map.json`
- Using the standard input (stdin). You can pipe the contents of the input files to the Allmaps CLI: `cat path/to/my-georeferenced-map.json | allmaps annotation generate`

Commands that require SVG input only accept one file, commands that require JSON or points input accept multiple files.

> [!NOTE]
> In Allmaps, maps can be defined in two ways:
> - As a **Georeference Annotation**: the official [spec](https://iiif.io/api/georef/extension/georef/) that is part of the IIIF Framework. Multiple maps can be defined in an **Annotation Page** (see [spec](https://iiif.io/api/presentation/3.0/#2-resource-type-overview)).
> - As a **Georeferenced Map**: the format Allmaps uses internally to describe a map (see [@allmaps/annotation](../../packages/annotation/)).
>
> In the CLI (and elsewhere in Allmaps) we often use 'Annotation' to denote either Georeference Annotation or an Annotation Page containing Georeference Annotations.
>
> For convenience, for all CLI commands where the input in one or more Georeference Annotations, the input can also be Georeferenced Maps, and vice versa!

Output can be stored by redirecting stdout using: `allmaps annotation generate path/to/my-georeferenced-map.json > my-georeferenced-annotation.json`

If you're running MacOS, you can use [pbcopy](https://osxdaily.com/2007/03/05/manipulating-the-clipboard-from-the-command-line/) to copy the generated Georeferenced Map to your clipboard: `allmaps annotation generate path/to/my-georeferenced-map.json | pbcopy`

## Commands

### Parse and generate Georeference Annotations

Show help:

```bash
allmaps annotation --help
```

Generate a single Georeference Annotation from json files containing Georeferenced Maps:

```bash
allmaps annotation generate [files...]
```

Parse and validate Georeference Annotations to Georeferenced Maps:

```bash
allmaps annotation parse [files...]
```

> [!NOTE]
> When generating or parsing, any georeferenced map property can be overwritten form the input, using e.g. `-t thinPlateSpline` to overwrite the input transformation type with a Thin Plate Spline.

> [!TIP]
> Since the `generate` and `parse` commands can take both Georeference Annotations and Georeferenced Maps as input, you can also use these commands to 'join' or 'merge' multiple maps together:
>
> For example: passing multiple Annotations (or Annotation Pages) to `allmaps generate` (instead of Georeferenced Maps as intended) will generate a Georeferenced Annotation Page containing all input maps!

Convert the resource mask from the input files to SVG polygons:

```bash
allmaps annotation svg [files...]
```

Output the IDs of the IIIF Images in the input files:

```bash
allmaps annotation image-ids [files...]
```

Output the GCPs from the input files. Options allow to set the GCP file format (see [@allmaps/io](../../packages/io/) for supported formats), projection, axis orientation and origin:

```bash
allmaps annotation gcps [files...]
```

> [!TIP]
> GCPs are printed in "EPSG:4326" by default, but their projection can be specified in a QGIS GCP file format or via the options. Use "EPSG:3857", the default projection in [@allmaps/project](../../packages/project/) and [@allmaps/render](../../packages/render/), to obtain the same result when using printed GCPs in e.g. QGIS.


### Parse and generate IIIF resources

Show help:

```bash
allmaps iiif --help
```

Parse IIIF resources and output them in the format used internally by Allmaps:

```bash
allmaps iiif parse [files...]
```

Generate IIIF Manifest from IIIF Image Services from one or more IIIF resources:

```bash
allmaps manifest --id <id> [files...]
```

The ID of the IIIF Manifest can be supplied with the `--id` option.

Output the IDs of the IIIF Images in the input files:

```bash
allmaps iiif image-ids [files...]
```

### Generate Allmaps IDs

Allmaps CLI can generate Allmaps IDs for input strings.

Show help:

```bash
allmaps id --help
```

Generate the Allmaps ID for a IIIF Manifest URL:

```bash
allmaps id https://digital.zlb.de/viewer/api/v1/records/34231682/manifest/
```

Using the same URL, but using standard input:

```bash
echo https://digital.zlb.de/viewer/api/v1/records/34231682/manifest/ | allmaps id
```

### Fetch IIIF images

Fetches the full-size image using a given IIIF Image ID:

```bash
allmaps fetch full-image "https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:7h14cx32p"
```

> [!NOTE]
> Not all IIIF image servers allow downloading full-sized images. This command does not yet take the image's `maxWidth`, `maxHeight` and `maxArea` properties into account.

### Transform resource coordinates to geospatial coordinates (and vice versa)

Show help:

```bash
allmaps transform --help
```

#### Transform coordinates

Transforms coordinates from input files 'toGeo' or 'toResource' using a Projected GCP Transformer and its transformation built from the GCPs, transformation type and internal projection specified in a Georeference Annotation (or parameters).

Input files with coordinates are expected to contain one coordinate on each line, formatted as pairs of coordinates in decimal form separated by spaces:

E.g. `X_origin Y_origin`.

GCP-files are similar: `X_origin Y_origin X_destination Y_destination`

For this specific command, if no input files are supplied in the a prompt will show up in stdin, enabling you to enter coordinates one by one in the same format as above and read the transformed result.

This command was inspired by [gdaltransform](https://gdal.org/programs/gdaltransform.html).

```bash
allmaps transform svg -a <filename> [files...]
```

For example, with a file `path/to/coordinates.txt` that contains two coordinates:

```
100 100
200 200
```

You can use the command as follows:

```bash
allmaps transform coordinates -a path/to/annotation.json path/to/coordinates.txt
```

This will output:

```
4.35748950266836 52.00802521697614
4.357492297361325 52.008035790231254
```

You can also pipe the input and store the output:

```bash
cat path/to/coordinates.txt | allmaps transform coordinates -a path/to/annotation.json \
  > path/to/transformed-coordinates.txt
```

It's possible to overwrite the transformation type (or any other property) of the Georeference Annotation using the options:

```bash
allmaps transform coordinates -a path/to/annotation.json -t thinPlateSpline path/to/coordinates.txt
```

It's even possible to omit a Georeference Annotation and fully specify the projected transformation using the options. GCPs can be specified using one of the supported GCP file formats (see [@allmaps/io](../../packages/io/)). With a file `path/to/gcps.txt` that contains four GCPs:

```bash
allmaps transform coordinates -g path/to/gcps.txt -t thinPlateSpline path/to/coordinates.txt
```

#### Transform SVG

Transform SVG to GeoJSON Geometry using a a Projected GCP Transformer and its transformation built from the GCPs, transformation type and internal projection specified in a Georeference Annotation. You can also supply the GCPs and transformation type separately.

```bash
allmaps transform svg -a <filename> [files...]
```

```bash
allmaps transform svg -a path/to/annotation.json path/to/svg.svg
```

```bash
allmaps transform svg -g path/to/gcps.txt -t thinPlateSpline path/to/svg.svg
```

#### Transform GeoJSON

Transform GeoJSON Geometry to SVG using a Projected GCP Transformer and its transformation built from the GCPs, transformation type and internal projection specified in a Georeference Annotation or separately.

```bash
allmaps transform geojson -a <filename> [files...]
```

```bash
allmaps transform geojson -a path/to/annotation.json path/to/my-geojson.geosjon
```

```bash
allmaps transform geojson -g path/to/gcps.txt -t thinPlateSpline path/to/my-geojson.geosjon
```

#### Transform Resource Mask

Transform SVG resource masks of input Georeference Annotations to GeoJSON Polygon using a Projected GCP Transformer and its transformation built from the GCPs, transformation type and internal projection specified in a Georeference Annotation itself.

This is a faster alternative for `transform svg` where the resource mask from the Georeference Annotation specified in the arguments is also the input SVG.

```bash
allmaps transform resource-mask [files...]
```

```bash
allmaps transform resource-mask path/to/my-annotation.json path/to/my-annotation2.json
```

#### Options

All the commands above take an annotation input using a parameter (except `resource-mask`, where annotations are passed via stdin).

| Option                        | Description                                                 | Default |
|:------------------------------|:------------------------------------------------------------|:--------|
| `-a, --annotation <filename>` | Filename of Georeference Annotation (or Georeferenced Map). |         |

All the commands above accept the following options for specifying the Projected GCP Transformer:

| Option                                           | Description                                                                                                                                                                                                 | Default       |
|:-------------------------------------------------|:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:--------------|
| `-g, --gcps <filename>`                          | Filename of GCP file. These GCPs take precedence over the GCPs from the Georeference Annotation (or Georeferenced Map). See dedicated GCP file options below.                                               |               |
| `-t, --transformation-type <transformationType>` | Transformation type. One of `helmert`, `polynomial`, `thinPlateSpline`, `linear`, `projective`. This takes precedence over the transformation type from the Georeference Annotation (or Georeferenced Map). | `polynomial`  |
| `-o, --polynomial-order <transformationOrder>`   | Order of polynomial transformation. Either 1, 2 or 3.'                                                                                                                                                      | `1`           |
| `--internal-projection-definition <proj4string>` | The geographic projection used internally in the transformation.'                                                                                                                                           | `'EPSG:3857'` |
| `--projection-definition <proj4string>`          | The geographic projection of the output.                                                                                                                                                                    | `'EPSG:4326'` |

Extra options are available to specify the GCP file:

| Option                           | Description                                                                                                                                                                                                                                                                                                                                          | Default                                                 |
|:---------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:--------------------------------------------------------|
| `--gcp-file-format <gcpFileFormat>`              | GCP file format. See [@allmaps/io](../../packages/io/) for the supported GCP file formats.                                                                                                                                                                                                                                         |     |
| `--gcp-resource-origin <gcpFileFormat>`              | Resource origin in the GCP file: "bottom-left" or "top-left".                                                                                                                                                                                                                                         | Default adapted to file format.    |
| `--gcp-resource-y-axis <gcpResourceYAxis>`              | Y axis orientation in the GCP file: "up" or "down".                                                                                                                                                                                                                                         | Default adapted to file format.    |
| `--gcp-resource-width <number>`              | Resource width in the GCP file. Can be different the resource width of the map, if the GCPs were created from the same image but on a different scale.                                                                                                                                                                                                                                         |     |
| `--gcp-resource-height <number>`              | Resource height in the GCP file. Can be different the resource height of the map, if the GCPs were created from the same image but on a different scale.                                                                                                                                                                                                                                         |     |
| `--gcp-projection-definition <proj4string>`              | The geographic projection used in the GCP file.                                                                                                                                                                                                                                         | `'EPSG:4326'` or read from QGIS file format.    |

Extra options are available to specify the Projected GCP Transformer even further, for example the way it transforms lines or polygons using midpoints (see [@allmaps/transform](../../packages/transform/) and [@allmaps/project](../../packages/project/) for more details):

| Option                           | Description                                                                                                                                                                                                                                                                                                                                          | Default                                                 |
|:---------------------------------|:-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|:--------------------------------------------------------|
| `-m, --max-depth <number>`       | Maximum recursion depth when recursively adding midpoints (higher means more midpoints).                                                                                                                                                                                                                                                             | `0` (i.e. no midpoints by default!)                     |
| `--min-offset-ratio <number>`    | Minimum offset ratio when recursively adding midpoints (lower means more midpoints).                                                                                                                                                                                                                                                                 | `0`                                                     |
| `--min-offset-distance <number>` | Minimum offset distance when recursively adding midpoints (lower means more midpoints)                                                                                                                                                                                                                                                               | `Infinity`                                              |
| `--min-line-distance <number>`   | Minimum line distance when recursively adding midpoints (lower means more midpoints).                                                                                                                                                                                                                                                                | `Infinity`                                              |
| `--geo-is-geographic`            | Use geographic distances and midpoints for lon-lat geo points                                                                                                                                                                                                                                                                                        | `false` (`true` for `svg` and `resource-mask` commands) |
| `--no-different-handedness`      | Don't flip one of the axes (internally) while computing the transformation parameters. Should be set if the handedness doesn't differ between the resource and geo coordinate spaces. Makes a difference for specific transformation types like the Helmert transform. (Flipping is internal and will not alter the axis orientation of the output.) |                                                         |

Additionally, the `coordinates` command has an option to specifically compute the inverse transformation of it's Projected GCP Transformer: 'toResource' instead of 'toGeo'.

| Option          | Description                                                                                                        | Default |
|:----------------|:-------------------------------------------------------------------------------------------------------------------|:--------|
| `-i, --inverse` | Use the Projected GCP Transformer's 'toResource' ("inverse") transformation instead of the 'toGeo' transformation. |         |

### Attach maps

Show help:

```bash
allmaps attach --help
```

Attach maps using Resource Control Points to infer new Ground Control Points that bring the maps together.

This takes Georeference Annotations (or Georeferenced Maps) as input, and for this input follows the steps described in [@allmaps/attach](../../packages/attach/):
- It reads the provided Resource Control Points
- When it finds pairs of Resource Control Points with identical `id`, it creates an 'Attachment' of a pair of Georeferenced Maps
- It creates and solves the attached transformation build from the respective map transformations
- It infers new Ground Control Points at the Resource Control Points using the resulting transformations

```bash
allmaps attach -r path/to/my-rcps.json path/to/my-annotation.json path/to/my-annotation2.json
```

#### Options

This commands takes RCPs as mandatory option and further more accepts the same options for specifying the attachment as used in the package:

| Option                            | Description                                                                                   | Default                                                 |
| :-------------------------------- | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------ |
`-r, --rcps <filename>` | Resource Control Points, used to infer the attachments' |
`--no-average-out` | "Don't average out the resulting geo coordinates for each id. For inexact transformations (like `polynomial`) the geo coordinates will in general not be equal. This forces them be equal. For exact transformation types (like 'thinPlateSpline') the geo coordinates will be (quasi) identical making this averaging not (strictly) necessary. Note: the averaging happens in projected geo coordinates." |
`--use-map-transformation-types`| "Let transformationType overrule the map's TransformationType."|
`--no-clone`| "Don't clone the map and it's transformer and transformations before returning the results. This prevents from overriding object properties like GCPs on the input objects."|
`--no-evaluate-attachment-scps`| 'For both Source Control Points of an attachment, don't evaluate them using the solved attached transformation to create a GCP on the corresponding map.'|
`--evaluate-single-scps`| 'For Source Control Points without a matching pair, evaluate them using the solved attached transformation and create a GCP on the corresponding map.'|
`--evaluate-gcps`| 'For existing GCPs, re-evaluate them using the solved attached transformation.'|
`--remove-existing-gcps`| 'Remove existing GCPs.'|


### Generate Bash scripts

#### Dezoomify

Generate a Bash script that uses [`dezoomify-rs`](https://dezoomify-rs.ophir.dev/) to download full-size IIIF images from their IIIF Image IDs:

```bash
allmaps script dezoomify "https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~344467~90112435"
```

You can use `dezoomify-rs` as an alternative to [`allmaps fetch full-image`](#fetch-iiif-images) when the IIIF server does not allow downloading full-size images directly.

You can find the IIIF Image IDs from an annotation first using [`allmaps annotation image-ids`](#parse-and-generate-georeference-annotations):

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps annotation image-ids | \
  allmaps script dezoomify
```

You can then run the generated scripts by saving them to a file:

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps annotation image-ids | \
  allmaps script dezoomify > dezoomify.sh

bash dezoomify.sh
```

Or by piping them to Bash:

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps annotation image-ids | \
  allmaps script dezoomify | \
  bash
```


#### Create GeoTIFFs using GDAL

Generate a Bash script that uses [GDAL](https://gdal.org/index.html) to convert one or more downloaded full-size IIIF images to [Cloud Optimized GeoTIFFs](https://www.cogeo.org/) using a given Georeference Annotation:

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps script geotiff
```

The generated Bash script expects the full-size images to be available on the local file system with the correct name (see below). You can download these images manually or use the [`allmaps fetch full-image`](#fetch-iiif-images) or [`allmaps script dezoomify`](#dezoomify) command, and pipe to Bash to execute the command:

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps annotation image-ids | \
  allmaps fetch full-image

curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps script geotiff | \
  bash
```

Or

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps annotation image-ids | \
  allmaps script dezoomify | \
  bash

curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps script geotiff | \
  bash
```

> [!NOTE]
> GeoTIFFs are generated in `'EPSG:3857'` by default due to the default value of `--projection-definition`. Hence, it has the same default projection value as the packages [@allmaps/transform](../../packages/transform/), [@allmaps/project](../../packages/project/) and [@allmaps/render](../../packages/render/), and doesn't follow the `'EPSG:4326'` default projection used in [`allmaps transform`](#transform-resource-coordinates-to-geospatial-coordinates-and-vice-versa).
>
> The default `--internal-projection-definition` is `'EPSG:3857'`.

You can use the parameters to specify another 'internal projection' (to take the map's (known or guessed) projection into account when transforming) or 'projection' (to generate GeoTIFFs in that projection). See [@allmaps/project](../../packages/project/) for more information about projections.

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps script geotiff --internal-projection-definition "+proj=lcc +lat_0=40 +lon_0=-96 +lat_1=20 +lat_2=60 +x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs +type=crs" | \
  bash
```


#### Specifying image filenames

By default, the Bash script generated with the `allmaps script geotiff` command computes the Allmaps IDs for all the IIIF Image IDs in the Georeference Annotation and looks for JPGs with the naming convention `<allmaps-id-from-image-id>.jpg` in the current directory.

For example, the Georeference Annotation https://annotations.allmaps.org/images/0b9aef31f14cb5bf contains a single georeferenced map from the following IIIF Image:

| IIIF Image ID                                                          | Allmaps ID of IIIF Image ID | Expected filename      |
|:-----------------------------------------------------------------------|:----------------------------|:-----------------------|
| `https://iiif-server.lib.uchicago.edu/ark:61001/b2mx3j80nk1f/00000001` | `0b9aef31f14cb5bf`          | `0b9aef31f14cb5bf.jpg` |

You can use Allmaps CLI to extract all IIIF Image IDs from a Georeference Annotation:

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps annotation image-ids
```

This will output:

```bash
https://iiif-server.lib.uchicago.edu/ark:61001/b2mx3j80nk1f/00000001
```

The `allmaps id` command generated the Allmaps ID from this IIIF Image ID:

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps annotation image-ids | \
  allmaps id
```

Output:

```bash
0b9aef31f14cb5bf
```

You can override the default behavior by supplying a JSON file that maps IIIF Image IDs to local image filenames:

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps script geotiff --image-filenames-file path/to/image-filenames.json
```

The file `path/to/image-filenames.json` should contain a JSON object with IIIF Image IDs as keys and local image filenames as values:

```json
{
  "https://iiif-server.lib.uchicago.edu/ark:61001/b2mx3j80nk1f/00000001": "path/to/image1.jpg"
}
```

## Examples

### Turn resource masks of georeferenced maps into GeoJSON

Manifest URL:

- https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest

Use Allmaps API to find Georeference Annotations:

- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest

Fetch a Georeference Annotation with cURL, pipe to Allmaps CLI and transform resource mask to GeoJSON:

```bash
curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest" \
| allmaps transform resource-mask
```

You can pipe as multiple Georeference Annotations to Allmaps CLI:

Manifest URLs:

- https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest
- https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest

Georeference Annotations:

- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest
- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest

Concatenate these two Georeference Annotations with Bash and transform resource masks to GeoJSON:

```bash
cat \
<(curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest") \
<(curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest") \
| allmaps transform resource-mask
```

### Combine multiple Georeference Annotations

Allmaps CLI can combine multiple Georeference Annotations and output them as a single AnnotationPage:

```bash
cat \
<(curl https://annotations.allmaps.org/manifests/f2aa771c7d0ae1e8) \
<(curl https://annotations.allmaps.org/images/813b0579711371e2) \
| allmaps annotation generate
```

If you have a directory containing multiple Georeference Annotations, you can run:

```bash
cat *.json | allmaps annotation generate
```

### Use GDAL to generate an XYZ tile layer from a Georeference Annotation

```bash
curl "https://annotations.allmaps.org/maps/096f57b5ff35b3eb" | \
  allmaps annotation image-ids | \
  allmaps fetch full-image

curl "https://annotations.allmaps.org/maps/096f57b5ff35b3eb" | \
  allmaps script geotiff | \
  bash

gdal2tiles.py --xyz 096f57b5ff35b3eb.vrt 096f57b5ff35b3eb
```

## License

MIT
