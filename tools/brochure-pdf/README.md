# @allmaps/brochure-pdf

Export the first three pages of the IIIF partnership brochure using installed
Google Chrome. Requires Node 24 or newer and Google Chrome.

Run from the monorepo root:

```sh
pnpm --filter @allmaps/brochure-pdf pdf
```

Optional positional arguments select the source URL and output file:

```sh
pnpm --filter @allmaps/brochure-pdf pdf http://localhost:5511/iiif-partnership /tmp/allmaps-brochure.pdf
```

The default source is `https://allmaps.org/iiif-partnership`. The tool adds the
`print` query parameter, waits for network activity to finish, and exports pages
1–3 with backgrounds and the webpage's CSS page size. Chrome's default PDF
settings omit margins, headers and footers.

Relative output paths are resolved from `tools/brochure-pdf` when run through
the command above. The default output is `allmaps-iiif-partnership.pdf` in that
directory. Parent directories are created as needed. For localhost, start the
homepage server yourself before exporting.
