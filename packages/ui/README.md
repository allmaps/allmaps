# @allmaps/ui

UI components and functions for Allmaps.

## New shared controls

The shadcn-svelte-based Select is available alongside the existing Allmaps Select:

```svelte
<script>
  import * as Select from '@allmaps/ui/select'

  const transformations = [
    { value: 'annotation', label: 'From annotation' },
    { value: 'thinPlateSpline', label: 'Thin plate spline' }
  ]
  let transformation = $state('annotation')
</script>

<label for="transformation" id="transformation-label">Transformation</label>
<Select.Root type="single" items={transformations} bind:value={transformation}>
  <Select.Trigger id="transformation" aria-labelledby="transformation-label">
    <Select.Value placeholder="Choose a transformation" />
  </Select.Trigger>
  <Select.Content>
    {#each transformations as option (option.value)}
      <Select.Item value={option.value} label={option.label} />
    {/each}
  </Select.Content>
</Select.Root>
```

The original `import { Select } from '@allmaps/ui'` is unchanged. The new entry
point follows shadcn-svelte's composable API, uses Bits UI for behavior and
Phosphor icons, and imports its own CSS. It does not require an app to scan the
package for Tailwind classes. See [the source and license](src/lib/components/ui/select/README.md).

### One Allmaps theme

`src/lib/css/ui.css` is the single source for the new controls' colors, fonts,
control heights, radius, focus ring and shadows. It defines semantic
`--allmaps-ui-*` variables and supports both `.dark` and Starlight's
`data-theme="dark"` on the document root. The Select entry point imports it
automatically. Other consumers can import `@allmaps/ui/css/ui.css` explicitly.
Font families use Geograph and DM Mono; import `@allmaps/ui/css/fonts.css` if the
app does not already load those fonts.

Override tokens on the document root, after importing the theme, so controls and
menus portaled to the document body share the same values:

```css
:root {
  --allmaps-ui-primary: #ff56ba;
  --allmaps-ui-ring: var(--allmaps-ui-primary);
  --allmaps-ui-radius: 0.375rem;
  --allmaps-ui-font-sans: 'Geograph', system-ui, sans-serif;
}
```

Add future shadcn-based components under `src/lib/components/ui/`, use the
shared `.allmaps-ui` typography class and theme tokens, and export each through
its own entry point. To use Tailwind 4's semantic shadcn utilities, import the
theme into the app's Tailwind stylesheet as well:

```css
@import 'tailwindcss';
@import '@allmaps/ui/css/ui.css';
```

Names such as `bg-popover`, `text-foreground`, `border-input`, `ring-ring` and
`rounded-md` then use the same Allmaps variables. Component CSS lives in the
`components` layer, allowing utility classes and app overrides to customize it.
Keep theme values out of individual components. There is no global reset or
change to the existing components' styles.

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

The component renders a `<div>` without links or click handlers. `url` controls
the page to capture and the optional URL bar. Wrap the component in your own
`<a>` to link anywhere you choose:

```svelte
<a href="https://allmaps.org/">
  <Screenshot
    url="https://viewer.allmaps.org/"
    slug="viewer"
    alt="Allmaps Viewer"
  />
</a>
```

Set `showUrl` (default `false`) to display an inert URL bar beside the browser
controls. Long addresses truncate with an ellipsis. Use `urlDisplay` to choose
the displayed address:

```svelte
<Screenshot
  url="https://editor.allmaps.org/georeference?map=example#settings"
  slug="editor"
  alt="Allmaps Editor"
  showUrl
  urlDisplay="route"
/>
```

| `urlDisplay`     | Displayed address                                              |
| ---------------- | -------------------------------------------------------------- |
| `full` (default) | `https://editor.allmaps.org/georeference?map=example#settings` |
| `hostname`       | `editor.allmaps.org`                                           |
| `route`          | `editor.allmaps.org/georeference`                              |

`route` includes the host (and port, if present) and pathname, omitting the
scheme, query parameters, and fragment. Display modes never change capture
settings or add interactivity; use a surrounding `<a>` for links. Cropped
screenshots keep their frameless appearance, even with `showUrl` enabled.

The default image URL is
`https://files.allmaps.org/screenshots/viewer/v1.webp`. The component renders a
normal image with SVG browser controls, intrinsic dimensions, and lazy loading.
Use `loading="eager"` for a prominent image above the fold. `src` overrides the
image URL for local previews or existing images, and `filesBaseUrl` selects
another file host. `class` styles the outer container. The frame exposes
`--screenshot-border`, `--screenshot-background`, and `--screenshot-color` CSS
custom properties. The URL bar also exposes `--screenshot-url-border` and
`--screenshot-url-background`.

Pass `widths` to generate responsive WebP candidates and `sizes` to describe the
image's rendered width:

```svelte
<Screenshot
  url="https://viewer.allmaps.org"
  slug="viewer"
  alt="Allmaps Viewer"
  widths={[480, 960, 1920]}
  sizes="auto, (min-width: 768px) 448px, 100vw"
/>
```

`widths` lists exact output pixel widths, not browser viewport sizes. The capture
tool resizes the same frame into `v1-480w.webp`, `v1-960w.webp`, and
`v1-1920w.webp`; it rejects widths larger than the original capture. Capture and
publish these files before deploying a page that references them. The original
`v1.webp` remains the `src` fallback. Without `widths`, the component keeps its
single-image behavior. Repeated registrations of one capture merge their widths.

The default `sizes` is `auto, 100vw` for lazy images and `100vw` for eager images.
Provide layout-specific sizes for older browsers and eager loading. An explicit
`src` disables generated candidates; pass `srcset` alongside it for bundled or
externally managed variants. `sizes` is only emitted when there is a `srcset`.

Use `displayWidth` for the expected desktop display width in CSS pixels. The
capture viewport is about 1.67 times as wide, so captured UI appears at about
60% of its original size when displayed at that width. With the default
`displayWidth` of 640 and `aspectRatio` of 16:10, the viewport is 1067 × 667
CSS pixels. The default pixel density is 2×. Use `viewport` to override the
width, height, or density for a specific capture. The `sizes` prop still
controls responsive image selection in the browser.

Other capture props are `version` (default 1), `waitForSelector`,
`waitForRender` (observe Allmaps tile loading and wait for stable pixels), and
`delay` (milliseconds, default 1000). Slugs use lowercase words separated by
hyphens. Increment `version` to publish a new image URL without replacing
images used by older pages.

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

## Shared map example helpers

`@allmaps/ui/examples/source` provides `exampleCode`, `exampleSource`, and
`exampleLibraries` for the docs and homepage. The registry loads each mapping
library, Allmaps plugin, and stylesheet on demand. It also exports the shared
settings, code, and runtime types.

The documentation example components and their usage notes live in
[`apps/docs`](../../apps/docs/README.md#interactive-map-examples).

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
