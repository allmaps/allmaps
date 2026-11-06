Responsive screenshots are published under `images/screenshots/` on
`files.allmaps.org`. `getScreenshotImage` constructs `srcset` from the saved
URLs and dimensions in `src/lib/data/image-assets.json`. Each instance supplies `sizes` for its layout, including the
`auto` hint for lazy images.

To refresh the captures without building the app, run from `apps/homepage`:

```sh
pnpm screenshots --manifest scripts/screenshot-captures.json --output .screenshots/responsive-captures
pnpm run screenshots:responsive
pnpm images:upload .assets/screenshots.json
```

The generator also reads the current showcase captures from
`.screenshots/captures`. Capture missing showcase originals with the screenshot
CLI before regenerating. Existing showcase originals retain their composition;
their responsive variants are prepared in `.assets/screenshots/` and published
through the Assets CLI. Commit the updated `src/lib/data/image-assets.json`,
not the local image files. Bump the capture version before changing an existing
image: uploading different bytes to the same URL is rejected.

To regenerate the high-density feature captures, run from this app:

```sh
pnpm screenshots --manifest scripts/retina-captures.json --output .assets/retina-captures
node scripts/generate-retina-images.ts
pnpm images:upload .assets/retina-images.json
```

These recipes keep the original CSS viewport and capture real 2× or 3× pixels.
Responsive variants never enlarge a source. Upload verification uses a separate
preflight URL so a CDN cannot cache an early 404 at the final public URL.

The Viewer tool screenshot uses the Liber Floridus map selected in
`scripts/screenshot-captures.json` (`tools-viewer-liber-floridus`). Its
1200 × 750 viewport is captured at 3× density. The previous Saigon capture is
retained on Assets, but is no longer displayed.

The CLI tool image is authored in `src/lib/images/cli-terminal.svg`, with a black
terminal background and the CLI help output. The responsive generator renders
it as WebP variants under `images/screenshots/tools-cli-terminal/v1-{width}w.webp`;
it does not need a browser capture. The old `tools-cli-help` capture remains on
Assets but is no longer displayed.

The shared Allmaps Here source is
`https://files.allmaps.org/images/screenshots/allmaps-here-data/v1.webp`, captured
at 2× density with browser geolocation set to Delft (52.01, 4.36). The public app
needs browser geolocation as well as the URL to show the intended location.

The annotations API screenshot uses the `allmaps-annotations-api` entry in
`scripts/screenshot-captures.json`. Capture it in Chrome through the same workflow:

```sh
pnpm screenshots --manifest scripts/screenshot-captures.json --output .screenshots/responsive-captures --slug allmaps-annotations-api --chrome
pnpm run screenshots:responsive
pnpm images:upload .assets/screenshots.json
```

Its 600 × 400 viewport keeps the JSON readable when displayed in a column. The
`Screenshot` component adds the URL bar with `showUrl`.

## Example map images

Example maps have a separate manual render step so their source pixels cover
both wide desktop panels and the taller crop used on phones. Edit the geographic
bounds and version in `scripts/example-map-images.json`, then run from this app:

```sh
node scripts/generate-example-map-images.ts
pnpm images:upload .assets/example-map-images/upload.json
```

Pass a slug to render just one map, for example
`node scripts/generate-example-map-images.ts lynn-city-atlas`.

This authoring command requires the monorepo's built `@allmaps/render` and
`@allmaps/render-wasm` packages. It renders original IIIF tiles to a native-size
PNG in the ignored `.assets/example-map-images/` directory, then encodes the
configured responsive WebPs without upscaling. Normal app builds do not run it.
Commit the recipe and `src/lib/data/image-assets.json`; keep the image files out
of Git. Bump the version before changing a published crop.

Rotterdam, Lynn and Manhattan also have focused 4:3 phone crops. A
`phoneCrop.region` is a native-pixel rectangle (`left`, `top`, `width`, `height`)
within the rendered original. A `<picture>` source selects its own responsive
sizes below 768px; desktop keeps the wider framing. Neither crop is upscaled.
The optional `rotation` is in degrees clockwise; Manhattan uses it to keep
Central Park horizontal, as in the original image.
The renderer limits concurrent IIIF requests, retries failures, and rejects a
render if source requests still fail. Inspect both crops before uploading.

The Amsterdam partnership brochure preview uses its source sheet without a
crop. Its slug and immutable version are in `src/lib/data/partnership-maps.ts`.
Generate and upload its 320–1920px variants manually:

```sh
node scripts/generate-partnership-images.ts
pnpm images:upload .assets/partnership/upload.json
```

This command respects the IIIF request limits and never enlarges the source.
The server load uses Assets for the image while retaining the annotation's mask.
