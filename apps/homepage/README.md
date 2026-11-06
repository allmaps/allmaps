# @allmaps/homepage

Custom SvelteKit website for https://allmaps.org.

## Legacy URLs

The `(legacy)` route redirects the previous homepage and documentation URLs.
Its explicit prerender entries produce redirect HTML for static hosting, while
development responds with permanent HTTP redirects. Documentation destinations
use `PUBLIC_DOCS_BASE_URL`. Unknown URLs still return 404.

## Published images

Raster images live at `https://files.allmaps.org/images/`, uploaded through
[Allmaps Assets](https://assets.allmaps.org/). Git contains URLs, dimensions,
SHA-256 checksums and generation recipes; generated image files stay in the
ignored `.assets/` and `.screenshots/` directories. Normal development and builds
use the published images and do not generate or upload assets. The authored SVG
logo stays in Git.

The upload command uses the Assets checkout at `../static` by default. To use a
different checkout, set `ALLMAPS_ASSETS_CLI` to its `scripts/assets.ts` file.
Authenticate once with `node ../static/scripts/assets.ts login` from the
monorepo root. Uploads verify the public image bytes before updating the saved
manifest. Existing objects are reused only when their contents match; otherwise,
choose a new version. Old published objects are never deleted or overwritten.

`src/lib/data/image-assets.json` records the published assets, including preserved
source images. Screenshot URLs use `images/screenshots/{slug}/v{version}-{width}w.webp`.
Partner previews use `images/homepage/partners/{slug}/{width}w-{sha256-prefix}.webp`.
Curated example images use readable names and explicit versions under
`images/homepage/examples/`.

### Partner map previews

The partners page uses published WebP previews and prepared mask geometry.
Loading the page fetches organization data, but does not fetch annotations or
IIIF image metadata. Preview images load lazily.

After changing a selection in `src/lib/data/partners.ts`, run from this app:

```sh
pnpm partners:previews
pnpm images:upload .assets/partners.json
```

The generator downloads each annotation, `info.json`, and one preview image,
then creates responsive WebPs within the image service's size limits in
`.assets/partners/`. It preserves annotation mask coordinates and uses the
actual downloaded dimensions. Service dimensions take precedence when sizing
downloads; annotation dimensions are the fallback for incomplete metadata.
For a broken IIIF service, a selection can specify `previewImageUrl` pointing to
the same map's published preview (at most one megapixel). RaRa uses its public
DIGAR viewer preview this way.

Generating prepares a local upload plan without changing the published manifest.
After a successful upload, commit `src/lib/data/partner-previews.ts` and
`src/lib/data/image-assets.json` alongside the selection change. Titles,
attribution, rights links and Viewer links retain their existing sources.

### Screenshots

Use `Screenshot` from `@allmaps/ui` with explicit published `src` and `srcset`
(or `getScreenshotImage` for the responsive collection), plus capture metadata
such as `url`, `slug`, `version` and `alt`. Each instance supplies `sizes` for its
layout. The Vite collector records capture definitions during an explicitly
requested app build; development does not collect or capture screenshots.

See [the homepage capture recipes](scripts/screenshot-images.md) for capture,
responsive generation and publishing without building the app. The shared
[screenshot tool](../../tools/screenshots/README.md) documents browser setup and
capture settings. Its existing standalone publishing workflow retains its
legacy paths; the homepage upload plans publish under `/images/`.

For a manually prepared image, create an ignored JSON upload plan containing
`images: [{ name, filename, key }]`, with paths relative to this app and an
immutable key beneath `images/`. Run `pnpm images:upload path/to/plan.json`, then
use the returned URL recorded in `image-assets.json` in the component. Preserve
attribution alongside the image's existing content data.

## Map data preview

`MapDataPreview` displays bundled map outlines and control points from the Atlas
of Lynn, Massachusetts. To regenerate the data, run from the monorepo root:

```sh
pnpm --filter @allmaps/homepage run map-data:preview
```

The script downloads the pinned Georeference Annotations listed in
`scripts/generate-map-data-preview.ts` and writes projected SVG paths and control
point positions to `src/lib/data/map-data-preview.json`. Commit the generated JSON
alongside any changes to the script's map selections or projection. Development
and builds use the saved JSON without fetching these annotations.

## Mask grid heroes

Content pages set `hero.title` in their frontmatter. `MaskGridHero` displays three
rows of real map outlines, with 52px mobile tiles and 80px desktop tiles. The grid
is shifted around a single-line title aligned with the `copy-width` content.
Whole tiles are cleared with 16px breathing room; outer tiles crop at the field's
edges. CSS defines the geometry before measurement so the title stays in place
on first load. Outlines fade over 400ms with staggered delays up to three seconds.

Content pages select a single palette: `blue`
(the default), `darkblue`, `purple`, `orange`, `red`, `pink`, `green`, or `yellow`.

Each compact hero has its own 60-mask collection in `src/lib/hero/masks.json`; visitors
make no map requests. To refresh the collections, run `pnpm run hero:masks` in
this app. The script fetches maps using different `modifiedBefore` date cutoffs
and keeps source map IDs distinct between pages.
To refresh one collection while preserving the others, pass its page name:
`pnpm run hero:masks about`.
The script uses the partnership page's polynomial transformation and normalized
100×100 paths, preserving source map IDs. Commit the updated JSON with the change.

Navigation between hero pages slides the top and bottom rows left and the
middle row, including its title, right. Browser Back reverses the directions.
Content below the hero stays stationary: the old content fades out over 100ms,
and the new content fades in from 80–260ms during the 300ms hero slide. Content
snapshots retain their proportions across pages with different heights; the
header and footer do not fade.
Reduced motion skips both the fade and slides; unsupported browsers use normal
navigation. The landing page keeps its own layout.

The partnership page retains its larger grid: 10 rows on desktop, 8 on tablet,
and 12 on mobile. All rows use the same alternating slide directions, with the
first three matching the compact heroes and extra rows entering or exiting on
their own. Its heading, subtitle, and logos fade together. Its 150 bundled masks
are ready for the navigation snapshot and still fade in on first load. Refresh
them with `pnpm run hero:masks iiif-partnership`; print and reduced motion skip
the animations.
