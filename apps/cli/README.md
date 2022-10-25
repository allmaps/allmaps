# @allmaps/cli

## Installation

With [pnpm](https://pnpm.io/):

    pnpm add -g @allmaps/cli

Run Allmaps CLI:

    allmaps

## Examples

### Turn masks of georeferenced maps into GeoJSON

Manifest URL:

- https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest

Use Allmaps API to find Georef Annotation:

- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest

Fetch Georef Annotation with cURL, pipe to Allmaps CLI and transform pixel mask to GeoJSON:

```bash
curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest" \
| allmaps transform pixel-mask
```

You can pipe as multiple Georef Annotations to Allmaps CLI:

Manifest URLs:

- https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest
- https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest

Georef Annotations:

- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest
- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest

Concatenate these two Georef Annotations with Bash and transform pixel masks to GeoJSON:

```bash
cat \
<(curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest") \
<(curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest") \
| allmaps transform pixel-mask
```

### Combine multiple Georef Annotations

Allmaps CLI can combine multiple Georef Annotations and output them as a single AnnotationPage:

```bash
cat \
<(curl https://annotations.allmaps.org/manifests/f2aa771c7d0ae1e8) \
<(curl https://annotations.allmaps.org/images/813b0579711371e2) \
| allmaps annotation generate
```

If you have a directory containing multiple Georef Annotations, you can run:

```bash
cat *.json | allmaps annotation generate
```

If you're running MacOS, you can use [pbcopy](https://osxdaily.com/2007/03/05/manipulating-the-clipboard-from-the-command-line/) to copy the generated Georef Annotation to your clipboard:

```bash
cat *.json | allmaps annotation generate | pbcopy
```
