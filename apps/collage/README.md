# Allmaps Collage

A browser application for combining georeferenced maps on one zoomable canvas.
Move and rotate maps freely while preserving comparable real-world scale around
each map's original center. Arrange maps individually or in groups, change their
appearance, edit their masks, and save the layout as a Georeference Annotation.

Collage is an experimental application. Geometry, edited masks, layer order and
rotation round-trip through annotations; appearance settings remain session-only.

## Development

From the monorepo root:

```sh
pnpm install
pnpm --filter '@allmaps/maplibre...' build
pnpm --filter @allmaps/background-color build
pnpm --filter @allmaps/ui exec svelte-package
pnpm --filter @allmaps/collage dev
```

Open [localhost:5517](http://localhost:5517). The app runs entirely in the browser; annotation and
IIIF image URLs must allow browser requests. There is no upload or persistence
service.

```sh
pnpm --filter @allmaps/collage test
pnpm --filter @allmaps/collage check
pnpm --filter @allmaps/collage lint
pnpm --filter @allmaps/collage build
```

## Adding and opening maps

- **Add maps** accepts an annotation URL, pasted JSON, or local annotation files.
  It adds every map and leaves them unselected. Initial placement always uses
  compact PRISM, seeded from original geographic positions, with the first map
  at the current view center. There is no import layout chooser. It preserves
  annotation order, each map's approximate ground scale and mask. Added maps use
  Helmert (translation, rotation and uniform scaling), encoded by three non-collinear GCPs.
  **Try random maps** requests 12 candidates from
  `https://annotations.allmaps.org/maps/random`, four at a time, without opening a
  dialog. Area (0.25–400 km²) and image-scale (0.2–20 pixels/meter) filters favor
  neighborhood and city plans. Each candidate has a ten-second request deadline.
  Duplicate or unsupported maps are skipped, as are services whose `info.json`
  cannot be fetched and parsed in the browser. Sample image fetching and decoding
  remain available through the loader's `checkImageData` option, disabled by
  default. Maps that pass these checks are added; Escape cancels loading.
- **Open collage** restores coordinates and annotation order as supplied. It
  never applies scale normalization or recenters individual maps. It replaces
  the current canvas as an undoable action.
- Drop annotation files or a URL on the canvas to add them. Drop into the Open
  collage dialog to restore a saved layout instead.

## Arranging maps

- Click/drag a map to select/move it. Double-click a map to edit its mask.
  Hold Alt/Option while starting a move to drag a duplicate; this also works
  with the move control and multi-map selections. Copies appear after three
  pixels of movement. Escape cancels them; duplication and movement are one
  undo step. Its controls use equal angular spacing on a
  semicircle tilted toward the bottom right. Their anchors follow the current
  mask center and rotate and move with the map. Saving an edited mask immediately
  updates the tool positions. The arc contracts when zoomed out; when a map extends off screen,
  the control arc smoothly docks toward the screen center based on the full map
  size, without following clipped fragments. The entire arc is kept on screen,
  with full slider rails included so changing a value does not shift the arc.
  Repositioning eases smoothly after panning; direct manipulation stays immediate.
  Drag the rotation control to rotate freely. Within 4° of the map's natural
  bearing, it snaps to make the image upright; Shift retains 15° increments
  elsewhere. A group rotates rigidly and snaps using its first selected map.
  Double-click resets an individual map to its loaded orientation.
  Its angle updates live while active or focused. Dragging, keyboard rotation and
  double-click reset use the controls’ center as their pivot, including when the
  controls dock toward the screen center. That pivot stays fixed during a drag.
  Arrow keys rotate a focused control by 1 degree (15 with Shift). Space-drag pans.
- On touch screens, a second finger switches to canvas pan/zoom and cancels any
  in-progress map move, rotation or slider change without adding an undo step.
  Map dragging stays disabled until all fingers lift, even if a pinch starts
  with either finger over a map.
- Shift/Cmd/Ctrl-click toggles maps in a selection. Cmd/Ctrl+A selects all.
  Shift-drag empty canvas adds maps intersecting a selection rectangle. Drag any
  selected map to move the group; rotate uses one shared pivot and preserves
  spacing and scale. Groups retain the full arc, with individual-map appearance
  and mask buttons disabled. **Arrange** and **Geographic** appear as compact
  icon buttons beside **Edit layout** at the bottom center, above the zoom controls
  on smaller screens.
  **Arrange** compacts the current positions with PRISM, keeping the first selected
  map fixed and preserving scale, rotation, masks and layer order.
  **Geographic** keeps the first selected map
  fixed, including its rotation, and restores the others' geographic offsets and
  relative orientation. Each map keeps its scale; unrelated maps and layer order
  stay unchanged. Both arrangements are one undo step and fly the camera to the
  bounds of just the arranged selection.
  Appearance, mask editing and original-orientation reset remain individual-map actions.
  Group ordering keeps the selected maps' relative order; each gesture is one
  undo step. Click empty canvas or press Escape to deselect.
- **Duplicate map** copies the selection with its scale, rotation, mask and
  appearance intact. Copies get new IDs, appear slightly down and to the right,
  and become selected. A group duplicates together in one undo step.
- **Mirror** reflects each selected map horizontally in image space around its
  visible center, preserving scale and mask. Hold Alt/Option to reflect vertically;
  the icon changes to match. The selection changes in one undo
  step. Reflections use a first-order polynomial (affine) transformation;
  mirroring a similarity back restores Helmert. Mirror state is derived from
  geometry and survives export/reopen without extra metadata.
- Hold **Alt/Option** and click the rotation button to make the image upright
  using `@allmaps/bearing`. The icon changes to an upward arrow while the modifier
  is held. For a selection, each map rotates around its own visible center;
  centers and scales stay fixed. The entire selection changes in one undo step.
  Alt/Option+Enter or Space on the focused rotation control does the same.
  Bearings are calculated once at the start of a rotation gesture, not per frame.
- The layer-order button brings maps to the front. Holding Alt/Option changes
  its icon and sends them to the back. Both actions support multiple maps.
- Double-clicking rotation resets the angle to zero without fetching the original
  annotation. Export stores the angle in `_allmaps.rotation`, so resetting still
  works after reopening a collage. Without valid rotation metadata, the loaded
  orientation becomes zero. Rotation uses the controls’ center; scale and mask
  do not change.

### Layout computation

Imports and group arrangements run in a dedicated Web Worker. Panning and zooming
remain available; other document edits wait for the result. Cancel with Escape,
close the import dialog, or use the dock's cancel button. Cancellation and failure
leave the document unchanged. A successful arrangement is applied in one undo step.

The local PRISM implementation follows
[Gansner and Hu (2010)](https://doi.org/10.7155/jgaa.00198), using a Delaunay
proximity graph and a sparse conjugate-gradient solver.
The solver reuses its matrix-product buffer and uses indexed dot-product loops,
matching the tested layout experiment without changing its results. A second
PRISM pass compacts sparse layouts by compressing center distances toward 50%
padded-box occupancy, without shrinking maps. It keeps that pass only when it
converges, reduces area and satisfies all overlap/gap checks. Exact topology and
geographic distances are not guaranteed.

The previous spiral packer remains only as an internal recovery path if PRISM
fails to converge, with a visible explanation. Workers have a 30-second deadline;
timeout leaves the current document intact. Final placements must still satisfy
the app's coordinate limits.

## Appearance

- Opacity and colorize are radial sliders. Opacity is one (fully opaque) at the
  inner end and zero at the outer end; colorize increases outward from zero to
  one. Knobs retain their values and positions after release and reselection;
  faded rails remain visible. Opacity starts alongside the other controls.
  Colorize shows its hexadecimal color value. Adjusting hue
  enables colorization; double-click the knob or press Enter/Space while focused
  to toggle it. Arrow keys change opacity by 5% or hue by 10°; Home/End choose
  either endpoint. Saturation is a color/grayscale toggle. Appearance settings
  remain session-only.
- The wand toggles automatic background removal, using Viewer's masked color
  detection in a worker and the same threshold/hardness. Appearance changes
  support undo/redo.
- A failed image or tile request marks the affected mask in Allmaps red.
  The outline returns to its normal color when the failed resources recover.
- Map imagery always updates during gestures. An update exceeding 32 ms switches
  that gesture to the outline fallback until release. This measures synchronous
  update cost, not GPU frame time. There is no preview toggle.

## Editing masks

Double-click a map, or select one and choose **Edit mask**. Editing stays on the existing zoom
surface, preserving the map's placement, orientation and current camera view.
The full image is shown and other maps are temporarily hidden. Use **Fit map**
to zoom to the full image when needed. The outline and handles
follow Allmaps Editor styling; failed maps retain their red outline. The logo
stays visible and the top actions are disabled. On phones and tablets (up to
960 pixels wide), editing actions sit above the zoom and undo controls so the
groups stay separate, including with the longer pen-mode label.
Warnings stack above these actions, including when the buttons wrap on phones.

- Drag a vertex to move it, drag anywhere along an edge to add one, and
  right-click or double-tap a vertex to remove it. Dragged points stop at the image boundary,
  including on rotated and warped maps.
- Choose **Draw new mask** to replace the polygon. Click to place vertices,
  then click the first vertex or press Enter to close it. Escape or the drawing
  button cancels an unfinished replacement and restores the previous draft.
- **Pen** draws a freehand mask using Terra Draw's existing freehand polygon mode.
  Drag and release to close it, or click to start, move, and click to finish.
  Strokes stay inside the image and are simplified to a polygon using a two-pixel
  tolerance at the current zoom. The result can be edited with the vertex tools.
  Crossing or empty strokes leave the previous draft intact.
  On touch screens, draw with one finger or a stylus. Adding a second finger
  pauses the stroke and zooms around the current pen point; moving both fingers
  pans while keeping that point under the drawing finger. Lift the second finger
  to continue the same stroke, then lift the drawing finger to finish it.
  Two-finger gestures started before drawing use normal pan and zoom. Scroll
  zoom and the zoom buttons remain available; navigation is only locked while
  drawing, not just because Pen is selected.
- **Full image mask** replaces the draft with the image rectangle.
- **Orthogonalize** straightens corners within 13° of a right angle and removes
  redundant vertices on nearly straight edges, preserving the mask's general
  orientation. A uniform fit keeps the result inside the image; invalid results
  leave the draft intact. This adapts the [iD orthogonalize action](https://github.com/openstreetmap/iD/blob/b08827e5e87a977587f49239fb734a126ac9ea69/modules/actions/orthogonalize.ts)
  by iD Contributors under the ISC license. The copyright and full license are
  retained in the source and [distributed notices](static/third-party-notices.txt).
- Use the editor's undo/redo controls for vertex edits, replacement polygons,
  and individual points while polygon drawing. Pen strokes, full-mask replacement
  and orthogonalization each form one undo step. Undo during pen drawing
  cancels the unfinished stroke. **Done** is disabled until a new polygon
  has been closed.
- **Done** (Cmd+Enter on Mac, Ctrl+Enter on Windows/Linux) saves the draft as one collage undo step and updates the tool
  positions. **Cancel** discards all edits. Both restore the other maps and
  previous camera view. Escape cancels editing when no drawing is in progress.

Masks must be simple polygons with at least three vertices inside the image.
Edited masks are included in the standard annotation. Editing leaves map
placements and GCPs unchanged.

## Keyboard shortcuts

| Shortcut                              | Action                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------- |
| Cmd/Ctrl+S                            | Save annotation, or finish mask editing                                   |
| Cmd/Ctrl+Enter                        | Save the mask and exit mask editing                                       |
| Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z         | Undo / redo in the active mode                                            |
| Cmd/Ctrl+A                            | Select all maps                                                           |
| Shift/Cmd/Ctrl-click                  | Toggle a map in the selection                                             |
| Shift-drag empty canvas               | Add maps to the selection with a rectangle                                |
| Double-click a map                    | Edit its mask                                                             |
| Alt/Option-drag a map or move control | Duplicate and move the selection                                          |
| Alt/Option-click mirror               | Mirror vertically                                                         |
| Space-drag                            | Pan the canvas                                                            |
| Shift while rotating                  | Snap to 15-degree increments, with natural bearing taking priority nearby |
| Alt/Option-click rotation             | Make each selected map upright around its own center                      |
| Alt/Option                            | Change Bring to front into Send to back                                   |
| Delete                                | Remove selected maps                                                      |
| Escape                                | Cancel a gesture or drawing, exit mask editing, or deselect maps          |

Focused rotation and slider controls also accept arrow keys. Sliders support
Home/End; Enter or Space toggles a focused colorize control.

## Coordinates and scale

MapLibre has an empty Mercator style, centered on Null Island, with pitch,
camera rotation, and world copies disabled. Zoom can go beyond the world
rectangle down to zoom −2; the empty canvas no longer has to fill the viewport
with the world extent. Its transparent canvas sits over
a full-screen dotted backdrop using the Allmaps green palette. The compact
header follows the other apps: bold Allmaps and light Collage. Selection controls
are individual circular buttons; explanatory copy stays out of the canvas.

On **Add**, unwrap longitude across the antimeridian and fit Helmert using all
original GCPs. Sample that fit at the crop center and two perpendicular side
points. Subtract the projected mask's bounding-box center, then multiply by
`cos(source latitude)`. These three non-collinear GCPs preserve the fitted
similarity and allow affine reflections while reducing the work needed to
rebuild transformers during drags. Sampling the fitted surface retains
information from the whole source fit.

All newly added maps use Helmert; mirroring uses an affine reflection. Nonlinear and affine source warps become
similarity approximations, prioritizing comparable ground scale. There is no
transformation switch. Opening older collages still preserves their saved
geometry and transformation.

The latitude correction removes the local spherical Mercator scale factor once.
Canvas units represent spherical ground meters around the source
center, not exact ellipsoidal surveying distances. Scale distortion across
large geographic extents remains; this is a local comparison model.

Keep that normalized geometry in memory. Each gesture applies a rigid rotation
and translation from this baseline, without repeatedly modifying the previous
GCP result or recomputing scale at the artificial destination. Drawing uses a
common 1:8 coordinate conversion for rasters, controls, pointer input and mask
editing, giving large atlases room beyond the usual world rectangle. The initial
and maximum zoom are offset by three levels to retain the same visible map sizes.
This is only a canvas conversion: PRISM, saved placements and exported GCPs retain
their ground-meter scale. No drawing-scale metadata is added to annotations.

Export converts the placed metric coordinates back to longitude/latitude,
including unwrapped longitudes outside ±180°. Coordinates are limited to
±100,000,000 meters to avoid precision loss near the Mercator poles; this is
separate from the ordinary world extent. The 146-map Ortelius atlas is covered
by an offline import, rendering and export/reopen regression fixture.

**Open** is deliberately separate from **Add**: there is no metadata flag that
can reliably identify a collage. Opening preserves the supplied geometry even
if it is far from Null Island.

## Annotation contract

- Export an ordinary `AnnotationPage`. Its item order is the layer order, from
  back to front.
- Added maps use three synthetic GCPs. Moving and rotating change their geographic
  coordinates; mirroring reflects their resource coordinates. Export writes a
  standard Helmert or first-order polynomial `transformation`, edited mask,
  image resource and existing source metadata. Bearings and mirror state are
  derived from geometry and require no extra annotation metadata.
- Give newly added maps fresh annotation IDs. Runtime instance IDs are separate,
  so opening repeated IDs does not silently drop a map.
- Preserve existing `_allmaps` properties. When possible, add a missing source `id` reference
  using the original annotation ID or a single-map source URL. Anonymous local
  files need no source reference.
- Record `_allmaps.rotation` in degrees, counterclockwise in projected map
  coordinates. The GCPs already include this rotation: loading factors it out of
  the local geometry before restoring the angle, keeping the rendered layout
  unchanged. Missing or invalid values default to zero. Resetting and exporting
  writes zero over the previously saved angle.
- Record `_allmaps.geographicReference` with a stable image point (`resource`),
  its original longitude/latitude (`geo`), and the accumulated ground-scale
  normalization factor (`scale`). This small reference survives moves, rotation,
  mask edits, duplication and export/reopen without storing the original GCPs or
  fetching source annotations. It does not overwrite the API's `_allmaps.scale`.
  Geographic offsets use Mercator differences corrected by the fixed map's
  normalization factor, with longitude wrapping at the antimeridian. As with map
  scale, this is a local approximation: nearby plans align, while widely separated
  latitudes have projection distortion. Each map's scale is preserved.
  Older saved collages without this reference still open normally; re-add their
  original annotations to enable geographic arrangement.
- Do not export placements, viewport, other UI state, or a Collage extension.
  Opacity, saturation, colorization, background removal and applying the mask
  are session-only.
  They reset when reopening an annotation; geometry and layer order are retained.
- Reopening retains the loaded geometry as the source of truth. Provenance is
  preserved without fetching it to recover orientation.

## Rendering and current scope

The prototype uses the public `setMapOptions` API to update GCPs and the active
transformation, at most once per animation frame, with interpolation disabled.
This keeps the raster, masks, hit testing and tile
selection consistent. A dedicated renderer matrix API is a possible later
optimization; the prototype does not modify shared renderer code.

The UI supports individual and group selection, compact PRISM organization, duplication,
appearance controls and in-place mask editing. Editable map labels, canvas
snapshots and local autosave remain future work. Save annotations before closing
or reloading the page to preserve the layout.

Adding fits Helmert to the original GCPs regardless of the source transformation. Opening preserves supported
loaded transformations (first-order polynomial, Helmert, thin plate spline,
projective and linear), coordinates and GCP counts. Custom resource projections
and Canvas targets remain unsupported. Opening straight or higher-order
polynomial transformations is rejected because the current rendering/export
path cannot preserve them faithfully; they can be added as approximations.

The tests cover latitude-dependent scale, three-point Helmert preservation, mirroring,
single/group bearing alignment and snapping, rigid transforms, saved rotation
and offline reset, mask editing and control centers,
duplication, selection, viewport-aware controls, image-loading failure recovery,
metadata, ordering, empty files, antimeridian import, and repeated export/import
without scale drift.
