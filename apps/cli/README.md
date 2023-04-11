# @allmaps/cli

## Installation

With [pnpm](https://pnpm.io/):

    pnpm add -g @allmaps/cli

## Documentation

Run Allmaps CLI:

    allmaps

Show help:

    allmaps --help

### Commands

All CLI commands accept one or more files as input. You can supply these files in two ways:

- With their full or relative paths. In the CLI's help output, this is shown as `[files...]`.
- Using the standard input (stdin). You can pipe the contents of the input files to the Allmaps CLI. Commands that require SVG input only accept one file, commands that require JSON input accept multiple files.

#### Parse and generate Georeference Annotations

Show help:

    allmaps annotation --help

Generate Georeference Annotations from input files:

    allmaps annotation generate [files...]

Parse input files and output them in the format used internally by Allmaps:

    allmaps annotation parse [files...]

Convert the pixel mask from the input files to SVG polygons:

    allmaps annotation svg [files...]

For all the commands above, the input files can be either Georeference Annotations or parsed Georeference Annotations

#### Transform resource coordinates to geospatial coordinates (and vice versa)

Show help:

    allmaps transform --help

Transform SVG to GeoJSON using a Georeference Annotation:

    allmaps transform svg -a <filename> [files...]

Transform GeoJSON to SVG using a Georeference Annotation:

    allmaps transform geojson -a <filename> [files...]

The filename of the Georeference Annotation must be supplied with the `-a` or `--annotation` option.

Transform pixel masks to GeoJSON:

    allmaps transform pixel-mask [files...]

All the commands above accept the following options:

| Option                            | Description                                                     | Default
|:----------------------------------|:----------------------------------------------------------------|:--------
| `-p, --max-offset-ratio <number>` | Maximum offset ratio between original and transformed midpoints | 0
| `-d, --max-depth <number>`        | Maximum recursion depth                                         | 6

#### Parse and generate IIIF resources

Show help:

    allmaps iiif --help

Parse IIIF resources and output them in the format used internally by Allmaps:

    allmaps iiif parse [files...]

Generate IIIF Manifest from IIIF Image Services from one or more IIIF resources:

    allmaps manifest -d <id> [files...]

The ID of the IIIF Manifest can be supplied with the `-i` or `--id` option.

## Examples

### Turn masks of georeferenced maps into GeoJSON

Manifest URL:

- https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest

Use Allmaps API to find Georeference Annotations:

- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest

Fetch a Georeference Annotation with cURL, pipe to Allmaps CLI and transform pixel mask to GeoJSON:

```bash
curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest" \
| allmaps transform pixel-mask
```

You can pipe as multiple Georeference Annotations to Allmaps CLI:

Manifest URLs:

- https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest
- https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest

Georef Annotations:

- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest
- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest

Concatenate these two Georeference Annotations with Bash and transform pixel masks to GeoJSON:

```bash
cat \
<(curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest") \
<(curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest") \
| allmaps transform pixel-mask
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

If you're running MacOS, you can use [pbcopy](https://osxdaily.com/2007/03/05/manipulating-the-clipboard-from-the-command-line/) to copy the generated Georeference Annotation to your clipboard:

```bash
cat *.json | allmaps annotation generate | pbcopy
```
