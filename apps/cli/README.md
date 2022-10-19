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

    curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest" \
    | allmaps transform pixel-mask

You can pipe as multiple Georef Annotations to Allmaps CLI:

Manifest URLs:

- https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest
- https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest

Georef Annotations:

- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest
- https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest

Concatenate these two Georef Annotations with Bash and transform pixel masks to GeoJSON:

    cat <(curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:4t64k3596/manifest") \
    <(curl -L "https://annotations.allmaps.org/?url=https://collections.leventhalmap.org/search/commonwealth:6108xt43s/manifest") \
    | allmaps transform pixel-mask
