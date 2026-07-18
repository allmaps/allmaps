# Test IIIF Server

Small SvelteKit-powered IIIF fixture server for local tests.

```sh
pnpm --filter @allmaps/test-iiif-server dev
```

Vite serves the fixture endpoints on port `5506`, using the `iiif` entry in
`ports.json`.

Every endpoint is available under either `/cors` or `/no-cors`. The `/cors`
variant sends permissive CORS headers, while `/no-cors` omits them.

## Railway deployment

This app uses `@sveltejs/adapter-node` and can be deployed on Railway with the
root `railway.toml` config-as-code file.

When creating the Railway service from this monorepo, use `/railway.toml` as the
service config file if Railway does not pick it up automatically. The config
uses Railpack and runs:

```sh
pnpm turbo run build --filter=@allmaps/test-iiif-server...
pnpm --filter @allmaps/test-iiif-server start
```

Railway provides the `PORT` environment variable, which the SvelteKit node
adapter reads automatically.

Useful endpoints:

```text
GET /cors
GET /cors/iiif/2/:level/:imageId
GET /cors/iiif/3/:level/:imageId
GET /cors/iiif/2/:level/:imageId/info.json
GET /cors/iiif/3/:level/:imageId/info.json
GET /cors/iiif/:version/:level/:imageId/too-many-requests-after-20s/info.json
GET /cors/iiif/:version/:level/:imageId/too-many-requests-after-20s/:region/:size/:rotation/:quality.:format
GET /cors/errors/iiif/:version/:level/:imageId/missing-dimensions/info.json
GET /cors/errors/iiif/:version/:level/:imageId/bad-tiles/info.json
GET /cors/iiif/:version/:level/:imageId/:region/:size/:rotation/:quality.:format
GET /cors/annotations/images/:imageId.json
GET /cors/annotations/images/:version/:level/:imageId.json
GET /cors/annotations/combined/iiif{2|3}-level{0|1|2}.json
GET /cors/annotations/combined/image-500-iiif3-level2.json
GET /cors/annotations/combined/mixed-image-500-iiif3-level2.json
GET /cors/annotations/combined/service-500-iiif3-level2.json
GET /cors/annotations/combined/mixed-service-500-iiif3-level2.json
GET /cors/annotations/combined/http-{401|403|404|429|500|503}.json
GET /cors/annotations/combined/slow-iiif3-level2.json
GET /cors/annotations/combined/mixed-slow-iiif3-level2.json
GET /cors/annotations/combined/too-many-requests-after-20s-iiif3-level2.json
GET /cors/annotations/combined/mixed-too-many-requests-after-20s-iiif3-level2.json
GET /cors/annotations/combined/mixed-partof-hierarchy-iiif3-level2.json
GET /cors/annotations/combined/mixed-iiif2-level0-level2.json
GET /cors/annotations/combined/mixed-iiif3-level0-level2.json
GET /cors/annotations/combined/mixed-iiif2-level0-iiif3-level2.json
GET /cors/annotations/combined/mixed-iiif2-level2-iiif3-level0.json
GET /cors/errors/annotations/images/:imageId/missing-target.json
GET /cors/errors/annotations/images/:imageId/bad-resource-size.json
GET /cors/errors/annotations/images/:version/:level/:imageId/:variant.json
GET /cors/manifests/2/:imageId.json
GET /cors/manifests/2/:level/:imageId.json
GET /cors/manifests/2/:imageId.json/canvas/1
GET /cors/manifests/2/:level/:imageId.json/canvas/1
GET /cors/manifests/3/:imageId.json
GET /cors/manifests/3/:version/:level/:imageId.json
GET /cors/manifests/3/:imageId.json/canvas/1
GET /cors/manifests/3/:version/:level/:imageId.json/canvas/1
GET /cors/manifests/3/:imageId/embedded-annotation.json
GET /cors/manifests/3/:imageId/linked-annotation.json
GET /cors/manifests/3/:version/:level/:imageId/embedded-annotation.json
GET /cors/manifests/3/:version/:level/:imageId/linked-annotation.json
GET /cors/annotations/manifests/3/:imageId/linked-annotation.json
GET /cors/annotations/manifests/3/:version/:level/:imageId/linked-annotation.json
GET /cors/manifests/3/:imageId/navplace-midpoint.json
GET /cors/manifests/3/:imageId/navplace-bbox.json
GET /cors/manifests/3/:version/:level/:imageId/navplace-midpoint.json
GET /cors/manifests/3/:version/:level/:imageId/navplace-bbox.json
GET /cors/manifests/2/:imageId/missing-service.json
GET /cors/manifests/2/:level/:imageId/missing-service.json
GET /cors/manifests/3/:imageId/bad-service-type.json
GET /cors/manifests/3/:imageId/embedded-annotation-missing-target.json
GET /cors/manifests/3/:imageId/linked-annotation-missing-target.json
GET /cors/manifests/3/:imageId/embedded-annotation-one-gcp.json
GET /cors/manifests/3/:imageId/linked-annotation-one-gcp.json
GET /cors/manifests/3/:imageId/embedded-annotation-mixed-errors.json
GET /cors/manifests/3/:imageId/linked-annotation-mixed-errors.json
GET /cors/manifests/3/:version/:level/:imageId/:variant.json
GET /cors/manifests/3/combined/embedded-annotations.json
GET /cors/manifests/3/combined/linked-annotations.json
GET /cors/manifests/3/combined/image-services-iiif{2|3}-level{0|1|2}-embedded-annotations.json
GET /cors/manifests/3/combined/image-services-iiif{2|3}-level{0|1|2}-linked-annotations.json
GET /cors/manifests/3/combined/manifest-embedded-annotations.json
GET /cors/manifests/3/combined/partial-manifest-embedded-annotations.json
GET /cors/manifests/3/combined/partial-embedded-annotations.json
GET /cors/manifests/3/combined/partial-linked-annotations.json
GET /cors/manifests/3/combined/all-embedded-annotations-mixed-errors.json
GET /cors/manifests/3/combined/mixed-embedded-annotation-errors.json
GET /cors/manifests/3/combined/mixed-linked-annotation-errors.json
GET /cors/manifests/3/combined/browser-only-iiif3-level2.json
GET /cors/manifests/3/combined/too-many-requests-after-20s-iiif3-level2.json
GET /cors/manifests/3/combined/mixed-too-many-requests-after-20s-iiif3-level2.json
GET /cors/manifests/3/combined/image-services-iiif2-level0-level2.json
GET /cors/manifests/3/combined/image-services-iiif3-level0-level2.json
GET /cors/manifests/3/combined/image-services-iiif2-level0-iiif3-level2.json
GET /cors/manifests/3/combined/image-services-iiif2-level2-iiif3-level0.json
GET /cors/manifests/3/combined/:variant.json/canvas/:canvasIndex
GET /cors/annotations/manifests/3/combined/:variant/canvas/:canvasIndex.json
```

The image endpoint supports IIIF Image API 2.1 and 3.0 `level0`, `level1`, and
`level2` URLs. Level 0 omits the `sizes` array and serves only JPEG `full/full`
or `full/max` full-image requests plus JPEG tile requests declared by the
`tiles` array in `info.json`. Higher levels support `full`, pixel, and
percentage regions; `full`, `max`, `w,`, `,h`, `w,h`, `!w,h`, and `pct:n`
sizes; rotation `0`; qualities `default` and `color`; and output formats `jpg`,
`jpeg`, `png`, and `webp`.

The root catalog lists only `level0` and `level2` resources to keep the fixture
overview compact; `level1` routes remain available for direct requests.

The `/errors` endpoints return deliberately invalid resources for client error
handling tests. The root page groups these under “Resources with errors” in
both the CORS and no-CORS columns.

The IIIF 3 manifest variants include one manifest with the georeference
annotation embedded on the canvas, one manifest with the georeference
annotation linked from the canvas, incorrect embedded and linked annotation
manifests, and two `navPlace` manifests using either the midpoint or bounding
box of the transformed geographic mask.

The combined IIIF 3 manifests include variants where all canvases have embedded
or linked annotations, only some canvases have embedded or linked annotations,
embedded or linked annotations mix correct and incorrect annotations, or
painting annotations mix level 0 image services with higher-level services.

## Importing fixtures

Import an Allmaps georeference annotation into
`static/iiif/images/:imageId`:

```sh
pnpm --filter @allmaps/test-iiif-server import -- https://annotations.allmaps.org/images/3cb37d72bcca2b80
```

The importer:

- reads a local annotation file or remote annotation URL;
- takes the georeference annotations from the page;
- downloads the source IIIF image at 2500px wide, or wider when needed to keep
  the imported image at least 1000px high, capped by WebP's maximum dimension;
- converts it to `default.webp`;
- scales the saved annotation to the resized image dimensions;
- rewrites annotation image, manifest, and canvas URLs to the local fixture
  server;
- saves the original manifest as `original-manifest.json` when it can find a
  manifest through the annotation target source;
- writes `fixture.json`, which is how the server discovers imported fixtures.

Optional overrides:

```sh
pnpm --filter @allmaps/test-iiif-server import -- ./annotation.json --id my-map --label "My map"
```

## Fixture provenance

### `4f4a289db37a73f2`

- Label: Atlas van de gemeente Amsterdam : bevattende de grondteekening van alle gebouwen met de tegenwoordige nommering, en onderscheiding van gemeente-eigendommen, publieke en bijzondere gebouwen, woon- en pakhuizen : in 101 kaarten / naar officiële bronnen bewerkt; [schaal 1:1.250] - N.39 Buurt Z 1ste blad
- Manifest label: Atlas van de gemeente Amsterdam : bevattende de grondteekening van alle gebouwen met de tegenwoordige nommering, en onderscheiding van gemeente-eigendommen, publieke en bijzondere gebouwen, woon- en pakhuizen : in 101 kaarten / naar officiële bronnen bewerkt; [schaal 1:1.250]
- Image label: N.39 Buurt Z 1ste blad
- Institution: Universiteitsbibliotheek VU
- Institution homepage: <https://researchworks.oclc.org/iiif-explorer/search?q=collection.id%3Ahttps%3A%2F%2Fresearchworks.oclc.org%2Fdigital%2Fdataset%2F21033_krt>
- Original IIIF Image API service: <https://cdm21033.contentdm.oclc.org/iiif/2/krt:5352>
- Original IIIF `info.json`: <https://cdm21033.contentdm.oclc.org/iiif/2/krt:5352/info.json>
- Original image request: <https://cdm21033.contentdm.oclc.org/iiif/2/krt:5352/full/2500,/0/default.jpg>
- Original IIIF manifest: <https://cdm21033.contentdm.oclc.org/iiif/krt:5415/manifest.json>
- Original Allmaps image annotation page: <https://annotations.allmaps.org/images/4f4a289db37a73f2>
- Imported Allmaps annotation: <https://annotations.allmaps.org/maps/176f66a6e5793f18>
- Original Allmaps map annotations: <https://annotations.allmaps.org/maps/176f66a6e5793f18>
- Saved dimensions: 2500 x 2007; original dimensions: 3056 x 2454
- Saved source manifest fixture: `static/iiif/images/4f4a289db37a73f2/original-manifest.json`

### `5005dbd7e344f975`

- Label: Atlas der Neederlanden - Oudeland van Diependorst door Heyman van Dyck, uitgave 1701
- Manifest label: Atlas der Neederlanden
- Image label: Oudeland van Diependorst door Heyman van Dyck, uitgave 1701
- Institution: 4TU.ResearchData
- Institution homepage: <https://data.4tu.nl/>
- Original IIIF Image API service: <https://data.4tu.nl/iiif/v3/589aae3e-5e5a-4610-b190-8891c22c19d6>
- Original IIIF `info.json`: <https://data.4tu.nl/iiif/v3/589aae3e-5e5a-4610-b190-8891c22c19d6/info.json>
- Original image request: <https://data.4tu.nl/iiif/v3/589aae3e-5e5a-4610-b190-8891c22c19d6/full/2500,/0/default.jpg>
- Original IIIF manifest: <https://sammeltassen.nl/iiif-manifests/uva/atlas-der-neederlanden.json>
- Original Allmaps image annotation page: <https://annotations.allmaps.org/images/5005dbd7e344f975>
- Imported Allmaps annotation: <https://annotations.allmaps.org/maps/0450bef8668f4982>
- Original Allmaps map annotations: <https://annotations.allmaps.org/maps/0450bef8668f4982>
- Saved dimensions: 2500 x 1808; original dimensions: 8237 x 5957
- Saved source manifest fixture: `static/iiif/images/5005dbd7e344f975/original-manifest.json`

### `670dbd9ccc9a453a`

- Label: Van Vogelenzang Tot Scheveningen. - recto
- Manifest label: Van Vogelenzang Tot Scheveningen.
- Image label: recto
- Institution: Yale University Library
- Institution homepage: <https://collections.library.yale.edu/catalog?f%5Bgenre_ssim%5D%5B%5D=Maps>
- Original IIIF Image API service: <https://collections.library.yale.edu/iiif/2/15828022>
- Original IIIF `info.json`: <https://collections.library.yale.edu/iiif/2/15828022/info.json>
- Original image request: <https://collections.library.yale.edu/iiif/2/15828022/full/2500,/0/default.jpg>
- Original IIIF manifest: <https://collections.library.yale.edu/manifests/15826821>
- Original Allmaps image annotation page: <https://annotations.allmaps.org/images/670dbd9ccc9a453a>
- Imported Allmaps annotation: <https://annotations.allmaps.org/images/670dbd9ccc9a453a>
- Original Allmaps map annotations: <https://annotations.allmaps.org/maps/46708584259540cf>, <https://annotations.allmaps.org/maps/6a0f6e58fa70d0d7>, <https://annotations.allmaps.org/maps/7c53bd5fd7da37f0>
- Saved dimensions: 2500 x 3032; original dimensions: 6557 x 7951
- Saved source manifest fixture: `static/iiif/images/670dbd9ccc9a453a/original-manifest.json`

### `bf358ffda2ce5ff9`

- Label: Map of Boston Common - image 1
- Manifest label: Map of Boston Common
- Image label: image 1
- Institution: Digital Commonwealth
- Institution homepage: <https://www.digitalcommonwealth.org/search?f%5Bgenre_basic_ssim%5D%5B%5D=Maps>
- Original IIIF Image API service: <https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:jh343z26w>
- Original IIIF `info.json`: <https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:jh343z26w/info.json>
- Original image request: <https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:jh343z26w/full/2500,/0/default.jpg>
- Original IIIF manifest: <https://ark.digitalcommonwealth.org/ark:/50959/jh343z25m/manifest>
- Original Allmaps image annotation page: <https://annotations.allmaps.org/images/bf358ffda2ce5ff9>
- Imported Allmaps annotation: <https://annotations.allmaps.org/maps/3038d45494907c64>
- Original Allmaps map annotations: <https://annotations.allmaps.org/maps/3038d45494907c64>
- Saved dimensions: 2500 x 1968; original dimensions: 7415 x 5837
- Saved source manifest fixture: `static/iiif/images/bf358ffda2ce5ff9/original-manifest.json`
