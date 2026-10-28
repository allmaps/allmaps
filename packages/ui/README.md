# @allmaps/ui

UI components and functions for Allmaps.

## Screenshot

Display a saved WebP screenshot in a simplified browser window:

```svelte
<script>
  import { Screenshot } from '@allmaps/ui'
</script>

<Screenshot
  url="https://viewer.allmaps.org/"
  slug="viewer"
  alt="Allmaps Viewer"
/>
```

The component renders a `<div>`, without a link. `url` only controls the page
to capture. Wrap the component in your own `<a>` to link anywhere you choose:

```svelte
<a href="https://allmaps.org/">
  <Screenshot
    url="https://viewer.allmaps.org/"
    slug="viewer"
    alt="Allmaps Viewer"
  />
</a>
```

The default image URL is
`https://files.allmaps.org/screenshots/viewer/v1.webp`. The component renders a
normal image with SVG browser controls, intrinsic dimensions, and lazy loading.
Use `loading="eager"` for a prominent image above the fold. `src` overrides the
image URL for local previews or existing images, and `filesBaseUrl` selects
another file host. `class` styles the outer container. The frame exposes
`--screenshot-border`, `--screenshot-background`, and `--screenshot-color` CSS
custom properties.

Optional capture props are `version` (default 1), `viewport` (1440 × 900 at 2×
density), `waitForSelector`, `waitForRender` (observe Allmaps tile loading and
wait for stable pixels), and `delay` (milliseconds, default 1000). Slugs use
lowercase words separated by hyphens. Increment `version` to publish a new image
URL without replacing images used by older pages.

The component works without a collector and never captures or uploads images
from a visitor's browser. With the optional Vite plugin, instances register
their resolved capture settings during prerendering. In dev, the plugin previews
local captures automatically and falls back to the published URL when missing. See
[the screenshot tool](../../tools/screenshots/README.md) for collection, local
capture, and publishing through the Assets CLI.

### SVG highlights

Pass captured `geometry` and a `highlights` array of target names to draw SVG
outlines over the clean image. The overlay is included in server-rendered HTML
and scales with the image, independently of the capture's device pixel ratio.
Use `highlightPadding` (default 4) and the `--screenshot-highlight-color` and
`--screenshot-highlight-width` CSS variables to style it. Different instances can
highlight different targets from one capture without recapturing the image.

The capture props `steps` and `targets` prepare the page and record named element
bounds. Geometry is a separate versioned JSON asset, supplied by your server
loader or imported alongside the image. The screenshot tool provides
`loadScreenshotGeometry` to validate local image/metadata pairs. See its
[preparation and highlight documentation](../../tools/screenshots/README.md#preparing-a-page-and-capturing-highlight-targets)
for the complete workflow and examples.

## Latest maps

Import the latest georeferenced maps component through its dedicated entry point:

```svelte
<script lang="ts">
  import { Latest } from '@allmaps/ui/latest'
</script>

<Latest count={12} showProperties={false} showUrls={false} />
```

| Prop             | Default | Description                                           |
| ---------------- | ------- | ----------------------------------------------------- |
| `count`          | `100`   | Number of maps requested when the component mounts.   |
| `showHeader`     | `false` | Show the heading and map/error counts.                |
| `showProperties` | `true`  | Show control point count, mask point count, and area. |
| `showUrls`       | `true`  | Show links to the editor, viewer, and annotation.     |

The component fetches maps from `https://api.allmaps.org/maps` in the browser.
It owns its loading state and per-map error presentation. Consuming apps provide
routing and global styles. Use the Allmaps Tailwind theme and scan all UI output,
including the nested Latest components:

```ts
import { theme } from '@allmaps/tailwind'

export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@allmaps/ui/dist/**/*.{html,js,svelte,ts}'
  ],
  theme
}
```

From the repository root, `pnpm --filter @allmaps/ui run prepack` packages the
library without building its demo app. `pnpm --filter @allmaps/ui run watch`
updates the package while developing a consumer. The [Latest app](../../apps/latest)
and homepage both consume `@allmaps/ui/latest`.

## License

MIT; see [LICENSE.md](LICENSE.md).
