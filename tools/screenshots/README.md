# @allmaps/screenshots

Collect screenshot definitions from `@allmaps/ui` components during SvelteKit or
Astro prerendering, capture them in a local browser, and optionally publish WebP images
through the Allmaps Assets CLI. Node 24 or newer is required.

## Markup and build integration

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

Add `@allmaps/screenshots` as a workspace development dependency, then add the
collector in the app's Vite config (already configured in `apps/homepage`):

This workspace tool imports its shared capture types and helpers through
`@allmaps/ui/screenshots`. Build/package `@allmaps/ui` before running the tool,
and refresh its output after changing the shared screenshot API. To package the
UI library without an app build, run `pnpm --filter @allmaps/ui exec svelte-package`.

The tool itself runs directly from TypeScript source. Enable
`compilerOptions.allowImportingTsExtensions` in the consuming app's TypeScript
config when type-checking its Vite config.

```ts
import { screenshots } from '@allmaps/screenshots/vite'

// Alongside sveltekit() and the app's existing plugins:
screenshots()
```

An app build writes `.screenshots/manifest.json`, outside the public build output.
The component registers its resolved props during prerendering, so imported
values, wrappers, and loops work. Only instances rendered on prerendered routes
are collected. Client-only components and pages skipped by prerendering are not.
Dev mode previews existing local captures; ordinary production requests display
published images. Neither collects new definitions.

The component imports `@allmaps/ui/screenshots/integration`, a dedicated module
for registration and image URLs. Its default implementation works without a
plugin. The plugin replaces that exact import, independently of the component's
filename or location, and enables registration only in the server build.
Each build uses a fresh temporary directory shared with the prerender worker.
After SvelteKit finishes prerendering, the plugin deduplicates definitions and
writes the manifest. Conflicting definitions for the same slug and version fail
the build. Nested client builds cannot replace the server's registry. A failed
build invalidates the previous manifest, and Turbo caches successful manifests
alongside the app build output.

## Local capture

Install the managed browser once:

```sh
pnpm --filter @allmaps/screenshots exec playwright install chromium
```

After building the homepage, run these commands from the monorepo root:

```sh
pnpm screenshots
pnpm screenshots --slug viewer --refresh
pnpm screenshots --chrome --headed
```

The root command uses the homepage manifest and capture directory. You can also run
`pnpm --filter @allmaps/homepage screenshots`. For another app, run
`node ../../tools/screenshots/src/cli.ts` from that app's directory or pass an
explicit `--manifest` and `--output` to the tool.

Captures are saved under `.screenshots/captures/screenshots/{slug}/v{version}.webp`
in the app. PNG bytes from Playwright are converted in memory with Sharp; PNG
files are never saved. The default capture is 1440 × 900 CSS pixels at 2× density,
with light colors, reduced motion, an English locale, and UTC timezone.

Local captures are reused when their definitions match. Use `--refresh` when
the page has changed at the same URL. Failed captures preserve the last local
image and are not uploaded; failures are reported in `captures/results.json`
and cause a nonzero exit status.

During `pnpm run dev`, the plugin serves local WebPs automatically, falling back
to the component's published URL when a capture is missing. Run the capture
command and refresh the page to see new images without uploading them. Production
builds still use `files.allmaps.org` (or the component's `filesBaseUrl`). An explicit
`src` takes precedence in both modes. If you customize the capture CLI's `--output`,
set the plugin's `captures` option to the same directory, relative to the app root.

## Publishing with Assets

Use the Assets CLI's existing login flow:

```sh
export ALLMAPS_ASSETS_CLI=/path/to/assets/scripts/assets.ts
node "$ALLMAPS_ASSETS_CLI" login
pnpm screenshots --upload
```

`--assets-cli /path/to/assets/scripts/assets.ts` also works. The tool invokes
`upload file` with the exact object key and `image/webp` content type. It waits
for a completed job and records the CLI's authoritative public URL. The CLI
inherits its usual `ALLMAPS_ASSETS_BASE_URL` and session configuration. No R2
credentials or Cloudflare browser service is needed.

The default component URL is:

```text
https://files.allmaps.org/screenshots/viewer/v1.webp
```

For a replacement screenshot, increment the component's `version`, rebuild,
capture, and upload before publishing the app. This gives the replacement a new
URL and leaves older pages' images intact. Uploads never overwrite by default;
`--upload --overwrite` explicitly allows replacing an existing key, but does not
purge any CDN/browser caches. Successful uploads are remembered locally by image
hash and Assets origin so retries can skip previously published captures.

## Capture readiness

`waitForRender` injects a small observer before the captured application's scripts
run. It observes `@allmaps/render` events through the browser's native
`EventTarget.dispatchEvent`, forwarding every event unchanged. No application
markup, globals, or network URL recognition is required. The observer exists only
in the isolated capture context and is recreated after navigation.

It tracks `REQUESTEDTILESLOADING` and `ALLREQUESTEDTILESLOADED` separately for each
tile cache. A capture requires observed loading and at least one loaded tile
event; an app that has not initialized cannot pass merely because nothing is
pending. `TILEFETCHERROR` and `IMAGEINFOFETCHERROR` fail the capture, including
errors dispatched just after a cache reaches zero pending requests. Cleared or
destroyed caches are recognized through their public `finished` state.

Once all observed caches have finished and render events have been quiet for one
second, the tool waits for a further second of unchanged screenshot pixels.
One capture loop checks render state and target bounds before and after each
image, with one shared deadline. New loading, changed bounds or render activity
invalidates the candidate image. This covers
painting and transitions, but cannot guarantee future work or basemap completion:
non-Allmaps basemaps and worker/iframe-only event sources are not tracked. Use
`waitForSelector` for additional application-specific readiness where needed.

`waitForRender` is opt-in for pages that use Allmaps render events. It times out on
pages that emit none, rather than accepting a blank image. `waitForSelector` waits
for a visible element, and `delay` adds a settling period before the final checks
(1000 milliseconds by default). The CLI's `--timeout` bounds the render-readiness
wait (30000 milliseconds by default).

```svelte
<Screenshot
  url={example.url}
  slug="viewer-rotterdam"
  version={2}
  alt="A historical map of Rotterdam in Allmaps Viewer"
  viewport={{ width: 1440, height: 900, deviceScaleFactor: 2 }}
  waitForRender
  delay={500}
/>
```

### Window shadow

Add `shadow` for a soft, macOS-style shadow around the screenshot frame:

```svelte
<Screenshot {...definition} shadow alt="Editor settings" />
```

The default retains the subtle frame shadow. Set `shadow={false}` to use that
appearance, or customize the stronger shadow with `--screenshot-shadow`. The
shadow is rendered by CSS, so it does not change the captured image, crop,
geometry, or cache signature. Leave space around the component for the shadow.
This also works in Astro through a Svelte wrapper.

## Preparing a page and capturing highlight targets

`steps` runs browser interactions after navigation, before `waitForSelector`,
fonts, the settling delay and final render readiness. Supported actions are `click`,
`hover`, `fill` (with `value`), `select` (with an option `value`), `press` (with
`key`), and `waitFor` (`state: 'visible'` or `'hidden'`, default `'visible'`).
Steps run in order and use Playwright's waiting behavior. Failures identify the
screenshot and step. Interactions act on the real app; use fixtures for edits to
shared map data.

Declare named `targets` using CSS selectors. Each must identify exactly one
visible element fully inside the final viewport. Scroll with preparation steps
if necessary; measuring targets never scrolls or changes focus. Missing,
ambiguous, hidden, and offscreen targets fail the capture.

```svelte
<Screenshot
  url={editorUrl}
  slug="editor-settings"
  alt="Editor with its display settings open"
  steps={[
    { action: 'click', selector: '[data-tour="editor-map-settings"]' },
    { action: 'waitFor', selector: '[data-tour="editor-map-settings-popover"]' }
  ]}
  targets={{
    settings: '[data-tour="editor-map-settings"]',
    panel: '[data-tour="editor-map-settings-popover"]'
  }}
/>
```

Captures with targets or a crop produce two public assets:

- `screenshots/editor-settings/v1.webp`: the clean image.
- `screenshots/editor-settings/v1.geometry.json`: schema version, slug, capture
  version, SHA-256 of the WebP, viewport dimensions, optional crop rectangle, and
  named target rectangles.

Target rectangles use output-image-relative CSS pixels, independent of device
pixel ratio. Cropping subtracts the crop origin from each target. The runner
compares crop bounds, target bounds and scroll position before and after taking
the image and retries if they moved. Geometry contains no selectors or preparation steps. Private
`.webp.json` cache signatures and `.upload.json` receipts are never served.
Local preview serves public geometry, and `--upload` publishes both assets with
separate receipts so interrupted uploads can resume. Publish both before deploying
pages that use them; use a new version when replacing a capture.

### Capture a rectangle or an element with padding

Keep `viewport` set to the browser layout you want, and use `crop` to select the
portion saved to the image:

```svelte
<Screenshot
  url="https://editor.allmaps.org"
  slug="editor-detail"
  crop={{ x: 100, y: 80, width: 640, height: 480 }}
  alt="A detail of the editor"
/>

<Screenshot
  {...settingsDefinition}
  crop={{ selector: '[data-tour="editor-map-settings-popover"]', padding: 24 }}
  {geometry}
  highlights={['settings']}
  alt="Editor display settings"
/>
```

Cropped screenshots omit the window toolbar and its three buttons. The image
keeps rounded corners, highlights, and the optional shadow. Full-viewport
screenshots retain the window toolbar.

Both forms use viewport CSS pixels after preparation steps. The rectangle or
selected element must be fully visible within that viewport. An element selector
must match exactly one element. Padding defaults to zero and is clamped at the
viewport edges; crop edges round outward to whole CSS pixels. Named highlight
targets must fit entirely inside the crop. Custom highlight snippets receive
coordinates relative to the cropped image and need no additional translation.

Cropped captures always save geometry, even without highlights. Pass it to
`Screenshot` so the image dimensions and SVG viewBox match the capture. During
initial collection, an element crop without geometry uses the image's intrinsic
size; a rectangle crop already has known dimensions. This works identically in
Svelte and Astro's Svelte wrappers.

### Render SVG highlights without browser JavaScript

Load the geometry in a server/build context, then pass it into `Screenshot`:

```ts
import { loadScreenshotGeometry } from '@allmaps/screenshots/geometry'

const geometry = await loadScreenshotGeometry(
  { slug: 'editor-settings', version: 1 },
  { directory: '.screenshots/captures' }
)
```

The loader verifies the metadata against the local image hash. Paths are relative
to the process working directory. You can also import the generated geometry JSON
alongside a copied image, or fetch published geometry in your framework's server
loader. Validate imported JSON with `validateScreenshotGeometry` from
`@allmaps/ui/screenshots` before passing it into the component. Always keep that metadata paired with the same version of the image.

```svelte
<Screenshot
  url={editorUrl}
  slug="editor-settings"
  alt="Editor settings, with the settings panel highlighted"
  {geometry}
  highlights={['panel']}
/>
```

Keep the same `steps`, `targets` and other capture props when registering multiple
instances of the same slug/version; only presentation props may differ. Reuse a
shared definition with `{...definition}` to avoid duplicating capture settings.
The shortened rendering example above omits those shared props for clarity.

`highlights` selects target names; the default is no outlines. `highlightPadding`
defaults to 4 CSS pixels in capture coordinates. Style outlines with
`--screenshot-highlight-color` and `--screenshot-highlight-width` on a parent.
The SVG scales with the image, excludes the browser toolbar, and does not
intercept pointer events. Strokes retain their display width when scaled.
Highlights are decorative: describe their meaning in `alt` or surrounding prose.
Styles and highlight selection never change the capture signature.

### Custom highlight snippets

Pass an optional `highlight` Svelte snippet to draw custom SVG for each selected
name. It receives `{ name, bounds }`, where `bounds` contains the raw captured
`x`, `y`, `width` and `height` in CSS pixels. The component owns the SVG viewBox,
positioning and scaling. The snippet owns its shapes, padding and styles.

For example, define a reusable `CustomScreenshot.svelte` wrapper:

```svelte
<script lang="ts">
  import { Screenshot } from '@allmaps/ui'
  import type { ComponentProps } from 'svelte'

  let props: ComponentProps<typeof Screenshot> = $props()
</script>

<Screenshot {...props}>
  {#snippet highlight({ name, bounds })}
    <rect
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      rx="8"
      class="fill-blue-500/10 stroke-blue-600 stroke-2"
      vector-effect="non-scaling-stroke"
    />
    <text
      x={bounds.x + 8}
      y={bounds.y + 20}
      class="fill-blue-700 text-sm font-bold"
    >
      {name}
    </text>
  {/snippet}
</Screenshot>
```

Keep Tailwind classes in files scanned by the consuming app. The default outline
styles only apply to the fallback rectangle, so they do not override custom SVG.
Without a snippet, the existing rounded outline, color/width variables and
`highlightPadding` still apply. With a snippet, bounds are not padded; add any
padding in your SVG expressions. `highlights` still selects the targets, and an
empty list renders no overlay. Custom SVG remains decorative under the parent's
`aria-hidden`; explain its meaning in the screenshot's `alt` or nearby text.

In Astro or MDX, import the Svelte wrapper and pass the usual screenshot props,
`geometry` and `highlights`. Author the snippet inside the `.svelte` wrapper,
not in Astro/MDX syntax. No `client:*` directive is needed. The collector sees
the same capture definition; the snippet is never included in the manifest and
changing it does not require recapturing the image.

The component requires geometry when highlights are requested and rejects unknown
target names or mismatched slug/version/viewport data. With an explicit `src`,
provide the matching metadata yourself. No geometry is fetched in visitors'
browsers, and Astro does not need a `client:*` directive to render the overlay.
Both SvelteKit and Astro collect the same capture definitions.

For the first capture, collect the definition without `geometry` or `highlights`.
After capture, load its metadata and enable highlights, then render the site again.
Keep geometry available in the build environment (or copy the image and JSON to
tracked assets). Do not make the first collection depend on a file not yet captured.

## Using the component in Astro

The display component already works with Astro's Svelte integration. Import
`Screenshot` in MDX or an Astro wrapper and pass the shared capture definition,
image URL and matching geometry. Do not add a `client:*` directive: both the image
and SVG highlights render into the initial HTML. Keep the viewport in CSS pixels
from the capture definition/geometry, not the density-scaled image dimensions.

For Astro 7, add the integration to `astro.config.js`:

```js
import { screenshots } from '@allmaps/screenshots/astro'

export default defineConfig({
  integrations: [svelte(), screenshots()]
})
```

The options match the SvelteKit plugin: `manifest` and `captures` are paths
relative to the app root, defaulting to `.screenshots/manifest.json` and
`.screenshots/captures`. Add `@allmaps/screenshots` as a workspace development
dependency. Keep the existing Svelte/MDX integrations and site configuration.

The adapter replaces `@allmaps/ui/screenshots/integration` only with a collecting
implementation in Astro's `prerender` build environment. Definitions are written
by prerender workers into a shared temporary directory; `astro:build:done`
deduplicates them and writes the manifest after page generation. Vite finishing
an individual bundle does not dispose the collection. Client and production
server bundles use the inert implementation. Dev previews local captures with a
published-image fallback and does not collect. Only rendered, prerendered
instances are collected; client-only and on-demand pages are excluded.

A new build removes the previous manifest before collecting. Conflicting
definitions fail the build. The temporary directory is removed on completion or
bundling failure; process exit also cleans up after page-render failures. A
subsequent build in the same process starts with a fresh collection.

After building the docs, capture from the `apps/docs` directory:

```sh
node ../../tools/screenshots/src/cli.ts
node ../../tools/screenshots/src/cli.ts --slug editor-settings --refresh
node ../../tools/screenshots/src/cli.ts --upload
```

These commands use the docs app's manifest and capture directory. Capture needs
the configured source URLs to be reachable; the adapter never starts app servers.
Upload still requires the Assets CLI configuration described above.

The authoring workflow is: declare the URL, preparation steps and named
targets; collect definitions; capture the image and geometry; then load the
geometry and choose highlights in the guide. On the first collection, omit
highlights and avoid requiring geometry that has not been generated yet. Capture
and publishing remain explicit commands. For multiple views of the same image,
reuse one definition and vary only the highlighted target names.

## Verification

```sh
pnpm --filter @allmaps/screenshots types
pnpm --filter @allmaps/screenshots test
ALLMAPS_SCREENSHOT_BROWSER_TEST=1 pnpm --filter @allmaps/screenshots test
```

The opt-in browser tests capture local HTTP fixtures, including multiple tile
caches, delayed canvas painting, render failures, navigation, event forwarding,
and missing render events. They do not upload or contact external websites.
