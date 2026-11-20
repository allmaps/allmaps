# Open in Allmaps

Open in Allmaps routes IIIF Manifest and Image API links to Allmaps Viewer or Allmaps Editor.
The browser reads the publisher’s metadata and asks the Allmaps REST API for
published georeferencing and organization details. The app looks up the
resource's exact hostname with `GET /organizations?domain=…`. Supporter and
Innovator organizations supply the name and logo shown on the transition page.
The Open buttons link directly to Viewer or Editor. Button clicks and automatic
opens send a background POST to `/analytics/handoff` when analytics are enabled.
Handoff analytics use the returned organization API URL as the ID.

The app uses the root environment files for the REST, Annotations, Allmaps Viewer,
Allmaps Editor, and Docs base URLs. Build the app before deploying its Cloudflare
Worker, and deploy the coverage endpoints and organization domain filter first.

Set `PUBLIC_STATS_WEBSITE_ID` in the target Worker environment to the site ID
created for Open in Allmaps at `stats.allmaps.org`. Use a separate ID for
staging. With the variable unset, the resolver still opens Allmaps Viewer and Allmaps Editor.

## Inspect the transition

Append `&redirect=false` to an Open in Allmaps link to keep the transition
page open after resolving the resource. The destination and organization
branding still load. Click **Open in Allmaps Viewer** or **Open in Allmaps Editor**
to open the selected app.

The transition shows a small image preview and basic metadata from the IIIF
resource already loaded by the browser. For manifests, it uses the first supported
image. The preview needs only the thumbnail image request; it does not fetch masks
or additional metadata.

## Georeferencing summaries

`GET /manifests/:manifestId/georeferenced` returns coverage and counts for
the indexed manifest relationships.

```json
{
  "mapCount": 12,
  "georeferencedMapCount": 8,
  "georeferencingUpdatedAt": "2026-11-15T12:00:00.000Z",
  "canvasCount": 10,
  "georeferencedCanvasCount": 6
}
```

`mapCount` counts distinct current, unarchived maps on the manifest’s indexed images,
including unfinished maps. `georeferencedMapCount` counts the subset with a
geographic mask, published through the Annotations API. Historical map versions
and maps on archived images are excluded. Reusing an image on several canvases
counts its maps once. Both summary endpoints also return
`georeferencingUpdatedAt`, the most recent update to a map that is currently
published, or `null` when no published map was found.

`canvasCount` counts distinct indexed canvases linked to the manifest.
`georeferencedCanvasCount` counts those canvases with at least one published map.
Open in Allmaps derives the status from these counts. Zero covered canvases means
no indexed coverage. A positive covered count equal to the total means full
coverage. A positive count below the total means partial coverage.

An absent manifest returns zero indexed map and covered canvas counts, and
`canvasCount: null`. Known manifests with no indexed canvases return
zero counts. This endpoint calculates summaries from indexed relationships, including
retained links from previous imports.

`GET /images/:imageId/georeferenced` returns a boolean `georeferenced` and
the same two map counts. Unknown and archived images return `false` and zero
counts. These summaries describe indexed Allmaps data. Embedded annotations
are checked separately by the Open app.
