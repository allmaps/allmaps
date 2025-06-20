# @allmaps/cli

Command-line interface for [Allmaps](https://allmaps.org/).

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

### Input and output

Most CLI commands accept one or more files as input. You can supply these files in two ways:

- Supplied at the end of the command using their full or relative paths. In the CLI's help output, this is shown as `[files...]`.
- Using the standard input (stdin). You can pipe the contents of the input files to the Allmaps CLI.

Commands that require SVG input only accept one file, commands that require JSON or points input accept multiple files.

Output can be stored by redirecting stdout using: `allmaps <command> <options> [files ...] > outputFile.json`

If you're running MacOS, you can use [pbcopy](https://osxdaily.com/2007/03/05/manipulating-the-clipboard-from-the-command-line/) to copy the generated Georeference Annotation to your clipboard: `allmaps <command> <options> [files ...] | pbcopy`

### Parse and generate Georeference Annotations

Show help:

```bash
allmaps annotation --help
```

Generate Georeference Annotations from input files:

```bash
allmaps annotation generate [files...]
```

Parse input files and output them in parsed Georeference Annotations (the format used internally by Allmaps):

```bash
allmaps annotation parse [files...]
```

Convert the resource mask from the input files to SVG polygons:

```bash
allmaps annotation svg [files...]
```

Output the IDs of the IIIF Images in the input files:

```bash
allmaps annotation image-ids [files...]
```

For all the commands above, the input files can be either Georeference Annotations or parsed Georeference Annotations

### Transform resource coordinates to geospatial coordinates (and vice versa)

Show help:

```bash
allmaps transform --help
```

#### Transform coordinates

Transform coordinates from input files 'to geo' (or 'to resource') using a GCP Transformer and its transformation built from the GCPs and transformation type specified in a Georeference Annotation. It's also possible to supply the GCPs and transformation type separately.

Input files with coordinates are expected to contain one coordinate on each line, formatted as pairs of coordinates in decimal form separated by spaces:

E.g. `X_origin Y_origin`.

GCP-files are similar: `X_origin Y_origin X_destination Y_destination`

For this specific command, if no input files are supplied in the a prompt will show up in stdin, enabling you to enter coordinates one by one in the same format as above and read the transformed result.

This command was inspired by [gdaltransform](https://gdal.org/programs/gdaltransform.html).

**Examples:**

```bash
allmaps transform svg -a <filename> [files...]
```

For example, with a file `/path/to/coordinates.txt` that contains two coordinates:

```
100 100
200 200
```

You can use the command as follows:

```bash
allmaps transform coordinates -a /path/to/annotation.json /path/to/coordinates.txt
```

This will output:

```
4.35748950266836 52.00802521697614
4.357492297361325 52.008035790231254
```

You can also pipe the input and store the output:

```bash
cat /path/to/coordinates.txt | allmaps transform coordinates -a /path/to/annotation.json \
  > /path/to/transformed-coordinates.txt
```

Or transform using a specific set of GCPs and specified transformation type, instead of reading those from a Georeference Annotation:

With a file `/path/to/gcps.txt` that contains four GCPs:

```
3899 6412 9.9301538 53.5814021
6584 819 25.4101689 71.0981125
6491 4782 22.2380717 60.4764844
1409 5436 -3.2014645 55.959946
1765 1737 -18.1014216 64.3331759
```

This is done with the following command:

```bash
allmaps transform coordinates -g /path/to/gcps.txt -t thinPlateSpline /path/to/coordinates.txt
```

#### Transform SVG

Transform SVG to GeoJSON Geometry using a a GCP Transformer and its transformation built from the GCPs and transformation type specified in a Georeference Annotation. You can also supply the GCPs and transformation type separately.

**Examples:**

```bash
allmaps transform svg -a <filename> [files...]
```

```bash
allmaps transform svg -a /path/to/annotation.json /path/to/svg.svg
```

```bash
allmaps transform svg -g /path/to/gcps.txt -t thinPlateSpline /path/to/svg.svg
```

#### Transform GeoJSON

Transform GeoJSON Geometry to SVG using a GCP Transformer and its transformation built from the GCPs and transformation type specified in a Georeference Annotation or separately.

**Examples:**

```bash
allmaps transform geojson -a <filename> [files...]
```

```bash
allmaps transform geojson -a /path/to/annotation.json path/to/myGeoJSON.geosjon
```

```bash
allmaps transform geojson -g path/to/gcps.txt -t thinPlateSpline /path/to/myGeoJSON.geosjon
```

#### Transform Resource Mask

Transform SVG resource masks of input Georeference Annotations to GeoJSO Polygon using a GCP Transformer and its transformation built from the GCPs and transformation type specified in a Georeference Annotation itself.

This is a faster alternative for 'transform svg' where the resource mask from the Georeference Annotation specified in the arguments is also the input SVG.

**Examples:**

```bash
allmaps transform resource-mask [files...]
```

```bash
allmaps transform resource-mask path/to/myAnnotation.json path/to/myAnnotation2.json
```

All the commands above accept the following options for specifying the transformations:

| Option                                           | Description                                                                                                                                                                    | Default      |
| :----------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| `-i, --inverse`                                  | Compute toResource ("inverse") transformation                                                                                                                                    |              |
| `-g, --gcps <filename>`                          | Filename of GCPs. This overwrites the GCPs in the annotation argument if such is also used.                                                                                    |              |
| `-t, --transformation-type <transformationType>` | Transformation type. One of `helmert`, `polynomial`, `thinPlateSpline`, `projective`. This overwrites the transformation type in the annotation argument if such is also used. | `polynomial` |
| `-o, --polynomial-order <transformationOrder>`   | Order of polynomial transformation. Either 1, 2 or 3.'                                                                                                                         | `1`          |

All the commands above (except `point`) accept the following options for transforming lines or polygons in a more granular way (see [@allmaps/transform](../../apps/transform/) for more details):

| Option                            | Description                                                                                   | Default                                                 |
| :-------------------------------- | :-------------------------------------------------------------------------------------------- | :------------------------------------------------------ |
| `-d, --max-depth <number>`        | Maximum recursion depth when recursively adding midpoints (higher means more midpoints) depth | `0` (i.e. no midpoints by default!)                     |
| `-p, --min-offset-ratio <number>` | Minimum offset ratio when recursively adding midpoints (lower means more midpoints)           | `0`                                                     |
| `--geo-is-geographic`     | Use geographic distances and midpoints for lon-lat geo points                         | `false` (`true` for `svg` and `resource-mask` commands) |

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
allmaps manifest -d <id> [files...]
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

### Generate Bash scripts

#### Dezoomify

Generate a Bash script that uses [dezoomify-rs](https://dezoomify-rs.ophir.dev/) to download full-size IIIF images from their IIIF Image IDs:

```bash
allmaps script dezoomify "https://www.davidrumsey.com/luna/servlet/iiif/RUMSEY~8~1~344467~90112435"
```

You can use dezoomify-rs when the IIIF server does not allow downloading full-size images directly.

#### Create GeoTIFFs using GDAL

Generate a Bash script that uses [GDAL](https://gdal.org/index.html) to convert one or more downloaded full-size IIIF images to [Cloud Optimized GeoTIFFs](https://www.cogeo.org/) using a given Georeference Annotation:

```bash
curl "https://annotations.allmaps.org/images/0b9aef31f14cb5bf" | \
  allmaps script geotiff
```

> [!NOTE]
> The generated Bash script expects the full-size images to be available on the local file system. You can download these images manually or use the [`allmaps fetch full-image`](#fetch-iiif-images) command.

You can run the generated scripts by saving them to a file:

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

#### Specifying image filenames

By default, the Bash script generated with the `allmaps script geotiff` command computes the Allmaps IDs for all the IIIF Image IDs in the Georeference Annotation and looks for JPGs with the naming convention `<allmaps-id-from-image-id.jpg` in the current directory.

For example, the Georeference Annotation https://annotations.allmaps.org/images/0b9aef31f14cb5bf contains a single georeferenced map from the following IIIF Image:

| IIIF Image ID                                                          | Allmaps ID of IIIF Image ID | Expected filename      |
| :--------------------------------------------------------------------- | :-------------------------- | :--------------------- |
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
  allmaps script geotiff --image-filenames-file /path/to/image-filenames.json
```

The file `/path/to/image-filenames.json` should contain a JSON object with IIIF Image IDs as keys and local image filenames as values:

```json
{
  "https://iiif-server.lib.uchicago.edu/ark:61001/b2mx3j80nk1f/00000001": "/path/to/image1.jpg"
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
