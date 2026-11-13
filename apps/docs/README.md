# @allmaps/docs

Allmaps documentation website, built with [Astro Starlight](https://starlight.astro.build/).

See https://docs.allmaps.org.

## Environment

The docs commands load the repository root's environment files before starting
Astro. `pnpm dev` and `pnpm start` load `.env.localhost` plus
`.env.localhost.local` when present. `pnpm build:dev` loads `.env.dev`, while
`pnpm build` and `pnpm build:production` load `.env.production`.
`pnpm check`, `pnpm preview`, and `pnpm astro` also use `.env.production`.

`PUBLIC_HOMEPAGE_BASE_URL` sets the destination for homepage, contact, and terms
links: `http://localhost:5511` locally, `https://dev.allmaps.org` in dev, and
`https://allmaps.org` in production.

`PUBLIC_REST_BASE_URL` and `PUBLIC_ANNOTATIONS_BASE_URL` set the OpenAPI sources
for the interactive API references. The Astro configuration reads these values
from `process.env` and appends `/openapi.json`. Environment variables set by the
shell or build service override values from the files. Use the named commands
above to select the environment; `--mode` alone does not change the file loaded
by Node.

`PUBLIC_STATS_WEBSITE_ID` enables visitor tracking with `stats.allmaps.org`.
Set it in Cloudflare's **Build Variables and Secrets**, then rebuild and deploy.
The Astro configuration reads it from the build process environment, including
the loaded environment file; a runtime Worker variable does not enable tracking.
When it is unset, no tracking script is included.

`PUBLIC_DOCS_BASE_URL` sets the canonical docs URL and social-image URL. The
`build:dev` and `build:production` commands set it explicitly for each deployment.

## Page URLs

Docs pages use URLs without trailing slashes, such as `/guides/discover-maps`.
Keep internal links and generated package links in this form, including links
with fragments such as `/guides/allmaps-viewer#share-a-map`.

Astro's `trailingSlash: 'never'` keeps Starlight navigation, canonical URLs,
search results, and sitemap URLs consistent. Keep the default directory build
format: Starlight generates `.html` links with the file format. Cloudflare's
`drop-trailing-slash` HTML handling serves directory index files at slashless
URLs and redirects existing links ending in `/` to their canonical form.

## Development deployment

The `docs-develop` Cloudflare Worker serves static files from `dist` at
https://dev.docs.allmaps.org. Deploy from a clean checkout of `develop`.

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter '@allmaps/docs^...'
pnpm --filter @allmaps/docs run build:dev
pnpm --filter @allmaps/docs run deploy:dev
```

Building the dependencies requires Rust/Cargo and `wasm-pack` for the image
renderer. The development build loads `.env.dev`, uses the development docs URL
for canonical links, and points editing links to `develop`.

Cloudflare Git builds can use the repository root, the two build commands above,
and `pnpm --filter @allmaps/docs run deploy:dev` as the deploy command. Configure
Node 24, the repository's pnpm version, and the Rust/WASM build tools.

## Production deployment

The `production` Wrangler environment deploys the `docs` Worker at
https://docs.allmaps.org. The default environment continues to deploy
`docs-develop` at https://dev.docs.allmaps.org.

Deploy from a clean checkout of `main`, using the same Node, pnpm, and Rust/WASM
build tools as the development deployment:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter '@allmaps/docs^...'
pnpm --filter @allmaps/docs run build:production
pnpm --filter @allmaps/docs run deploy:production
```

For Cloudflare Git builds, connect the `docs` Worker to `main`, use the repository
root, and use the two build commands above followed by the production deploy
command. Set `PUBLIC_STATS_WEBSITE_ID` in that Worker's build variables to enable
analytics. The production build loads `.env.production` and uses
`https://docs.allmaps.org` for canonical and social-image URLs.

The build mode and Wrangler environment are selected separately: always pair
`build:production` with `deploy:production`, and `build:dev` with `deploy:dev`.

## Social previews

`public/social/allmaps-docs.jpg` is the shared 1200 × 630 JPEG preview. Keep it
under 300 KB when replacing it. The illustration is based on connected plates
1, 2, and 7 of the [Lynn atlas](https://annotations.allmaps.org/manifests/23379602e8187445),
with illustrative green ground control point markers.

Starlight provides page titles, descriptions, canonical URLs, and the large-image
card type. `src/route-data.ts` adds the image metadata and Twitter card text,
removes the repeated homepage title, and prevents indexing of development sites.
Image URLs use the configured `PUBLIC_DOCS_BASE_URL`, like canonical URLs.

## Interactive map examples

Use `MapExample.astro` from `src/components/` to switch between MapLibre, Leaflet
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
  import MapLibreExample from './src/components/examples/MapLibreExample.svelte'
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

The Svelte components live in `src/components/examples/`. Their prop types,
annotation presets, loading helpers, and GeoTIFF script generation live in
`src/lib/examples/`, with tests in `test/`. Use the Astro wrappers in MDX to
include visibility-based hydration and the docs code theme.

The docs and homepage share source generation and lazy map runtimes through
`@allmaps/ui/examples/source`. Reusable code blocks and selects remain in
`@allmaps/ui`.

## License

MIT
