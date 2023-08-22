# @allmaps/cli

This module enables you to use the allmaps functionallity in your terminal!

## Installation

Use [pnpm](https://pnpm.io/) or [npm](https://www.npmjs.com/) to install this CLI tool globally in your system:

```sh
pnpm add -g @allmaps/cli
```

or

```sh
nnpm install -g @allmaps/cli
```

## Usage

### General Usage and Help

Run Allmaps CLI in your terminal using:

```sh
allmaps
```

Without arguments this command displays the help page. Help is always accessible in the following way:

```sh
allmaps --help
```

```sh
allmaps <command> --help
```

### Input and Output

All CLI commands accept one or more files as input. You can supply these files in two ways:

- Supplied at the end of the command using their full or relative paths. In the CLI's help output, this is shown as `[files...]`.
- Using the standard input (stdin). You can pipe the contents of the input files to the Allmaps CLI.

Commands that require SVG input only accept one file, commands that require JSON or positions input accept multiple files.

Output can be stored by redirecting stdout using: `allmaps <command> <options> [files ...] > outputFile.json`

If you're running MacOS, you can use [pbcopy](https://osxdaily.com/2007/03/05/manipulating-the-clipboard-from-the-command-line/) to copy the generated Georeference Annotation to your clipboard: `allmaps <command> <options> [files ...] | pbcopy`

### Parse and generate Georeference Annotations

Show help:

```sh
allmaps annotation --help
```

Generate Georeference Annotations from input files:

```sh
allmaps annotation generate [files...]
```

Parse input files and output them in the format used internally by Allmaps:

```sh
allmaps annotation parse [files...]
```

Convert the resource mask from the input files to SVG polygons:

```sh
allmaps annotation svg [files...]
```

For all the commands above, the input files can be either Georeference Annotations or parsed Georeference Annotations

### Transform resource coordinates to geospatial coordinates (and vice versa)

Show help:

```sh
allmaps transform --help
```

#### Transform Position

Transform positions from input files forward (or backward) using a transformation built from the GCPs and transformation type specified in a Georeference Annotation or separately.

Position-files are expected to contain one position on each line, formatted as pairs of coordinates in decimal form separated by spaces. E.g. `X_origin Y_origin`
GCP-files are similar: `X_origin Y_origin X_destination Y_destination`

For this specific command, if no input-files are supplied in the a promt will show up in stdin, enabling you to enter positions one by one in the same format as above and read the transformed result.

This command (and position format) was inspired by gdaltransform.

**Examples:**

```sh
allmaps transform svg -a <filename> [files...]
```

For example, with

```
// positionFile.txt
100 100
200 200
```

You can use the command as follows

```sh
allmaps transform position -a path/to/myAnnotation.json path/to/positionsFile.txt
```

Returns, e.g.

```sh
4.35748950266836 52.00802521697614
4.357492297361325 52.008035790231254
```

You can also pipe the input and store the output:

```sh
cat path/to/positionFile.txt | allmaps transform position -a path/to/myAnnotation.json > path/to/outputPositionsFile.txt
```

Or transform using a specific set of GCPs and specified transformation type, instead of reading those from an annotation

With

```sh
// gcpFile.txt
3899 6412 9.9301538 53.5814021
6584 819 25.4101689 71.0981125
6491 4782 22.2380717 60.4764844
1409 5436 -3.2014645 55.959946
1765 1737 -18.1014216 64.3331759```
```

This is done via

```sh
allmaps transform position -g path/to/gcpFile.json -t thinPlateSpline path/to/positionsFile.txt
```

#### Transform SVG

Transform SVG to GeoJSON using a transformation built from the GCPs and transformation type specified in a Georeference Annotation or separately.

**Examples:**

```sh
allmaps transform svg -a <filename> [files...]
```

```sh
allmaps transform svg -a path/to/myAnnotation.json path/to/mySVG.svg
```

```sh
allmaps transform svg -g path/to/gcpFile.json -t thinPlateSpline path/to/mySVG.svg
```


#### Transform GeoJSON

Transform GeoJSON to SVG using a transformation built from the GCPs and transformation type specified in a Georeference Annotation or separately.

**Examples:**

```sh
allmaps transform geojson -a <filename> [files...]
```

```sh
allmaps transform geojson -a path/to/myAnnotation.json path/to/myGeoJSON.geosjon
```

```sh
allmaps transform geojson -g path/to/gcpFile.json -t thinPlateSpline path/to/myGeoJSON.geosjon
```

#### Transform Resource Mask

Transform SVG resource masks of input Georeference Annotations to GeoJSON using a transformation built from the GCPs and transformation type specified in a Georeference Annotation itself.

This is a faster alternative for 'transform svg' where the resource mask from the Georeference Annotation specified in the arguments is also the input SVG.

**Examples:**

```sh
allmaps transform resource-mask [files...]
```

```sh
allmaps transform resource-mask path/to/myAnnotation.json path/to/myAnnotation2.json
```

All the commands above (except `resource-mask`) accept the following options for specifying the transformations:

| Option                                            | Description                                                                                                                                                                    | Default      |
| :------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| `-i, --inverse`                                   | Compute backward ("inverse") transformation                                                                                                                                    |              |
| `-g, --gcps <filename>`                           | Filename of GCPs. This overwrites the GCPs in the annotation argument if such is also used.                                                                                    |              |
| `-t, --transformationType <transformationType>`   | Transformation Type. One of `helmert`, `polynomial`, `thinPlateSpline`, `projective`. This overwrites the transformation type in the annotation argument if such is also used. | `polynomial` |
| `-o, --transformationOrder <transformationOrder>` | Order of polynomial transformation. One of `1`, `2` or `3`.                                                                                                                    | `1`          |

All the commands above (except `position`) accept the following options for transforming lines or polygons:

| Option                            | Description                                                     | Default |
| :-------------------------------- | :-------------------------------------------------------------- | :------ |
| `-p, --max-offset-ratio <number>` | Maximum offset ratio between original and transformed midpoints | `0`     |
| `-d, --max-depth <number>`        | Maximum recursion depth                                         | `6`     |

### Parse and generate IIIF resources

Show help:

```sh
allmaps iiif --help
```
Parse IIIF resources and output them in the format used internally by Allmaps:

```sh
allmaps iiif parse [files...]
```

Generate IIIF Manifest from IIIF Image Services from one or more IIIF resources:

```sh
allmaps manifest -d <id> [files...]
```

The ID of the IIIF Manifest can be supplied with the `-i` or `--id` option.

## Examples

### Turn masks of georeferenced maps into GeoJSON

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

Georef Annotations:

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
