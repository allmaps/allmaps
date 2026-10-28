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

## Interactive map examples

Use `MapExample` from `@allmaps/ui/examples` to switch between MapLibre, Leaflet
and OpenLayers. It defaults to MapLibre; pass `library="Leaflet"` or
`library="OpenLayers"` to select another initial library. The annotation URL,
opacity, transformation and initial-view settings are preserved when switching,
and the source code and install command update for the selected library.
Switching disposes the old map and creates a new one. Each library, Allmaps
plugin and stylesheet loads only when selected and the map is near the viewport;
loaded modules are reused when switching back.

Use an interactive map and its JavaScript example together:

```svelte
<script>
  import { MapLibreExample } from '@allmaps/ui/examples/maplibre'
</script>

<MapLibreExample
  annotationUrl="https://annotations.allmaps.org/maps/1bfb1eb4198e7240@c83337fa4b8051c9"
  opacity={1}
  transformation="annotation"
  height={400}
/>
```

The read-only, highlighted source code reflects the map controls. Opacity and
transformation apply immediately. Choose a map from the examples dropdown to
load it immediately, or submit an annotation URL with Load or Enter.
Changing the transformation preserves the current view. Reset view fits the map
to its extent again.
The default transformation, `annotation`, preserves each map's transformation.
You can override it with `polynomial1`, `helmert` or `thinPlateSpline`, or choose
From annotation to restore it. Default opacity and transformation setters are
omitted from the copied code.
Copy code gives you a short, standalone example using the selected settings.
The map container markup and install command appear in separate highlighted HTML
and Bash blocks below the JavaScript. Each block has its own Copy code button.

Initial view offers three approaches, with **Fit after loading** as the default:

- **Fit after loading** adds the annotation, then fits the map to its extent.
- **Known bounds** uses fixed coordinates to position the map before loading the
  annotation. The example fills in these coordinates for the selected map. You
  can also supply a `bounds` prop as `[west, south, east, north]`.
- **WarpedMapList** loads the annotation into a list first, calculates its extent,
  and shares the list with the layer. The install command adds `@allmaps/render`.

Use `viewMode="fit"`, `viewMode="bounds"` or `viewMode="list"` to choose the
initial option. Switching it recreates the map and updates the source code.
IIIF HTTP and network failures appear with a retry option, and stalled image
requests time out.

The dropdown includes Saigon, Amsterdam, Vienna, and Britain and Ireland. Pass an
`examples` array of `{ label, annotationUrl }` objects to use your own list, or
`examples={[]}` to hide the dropdown.

Separate entry points also export `LeafletExample` from
`@allmaps/ui/examples/leaflet` and `OpenLayersExample` from
`@allmaps/ui/examples/openlayers`. Each component dynamically imports its own
mapping library when the map approaches the viewport. The components and copied
examples use a bundler such as Vite for CSS imports and the MapLibre worker.

In Astro MDX, import the component and add `client:visible`. The same components
work directly in Svelte apps. They use the site's Starlight theme variables when
available and otherwise have their own defaults.

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
