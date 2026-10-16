# Allmaps Collage

A browser application for combining georeferenced maps on one zoomable canvas.
Move and rotate maps freely while preserving comparable real-world scale around
each map's original center. Arrange maps individually or in groups, change their
appearance, edit their masks, and save the layout as a Georeference Annotation.

Collage is an experimental application. Geometry, edited masks, layer order and
rotation round-trip through annotations, along with individual appearance, groups
and locks in optional `_allmaps.collage` metadata.

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

Place search uses the same Geocode Earth key as Editor. For local development,
set `PUBLIC_GEOCODE_EARTH_KEY` in the monorepo root's `.env.localhost.local`
(ignored by Git), then restart Vite. Production builds read `.env.production`
and deployment environment variables. Collage reads these values through
`$env/static/public` and validates the geocoding key and optional viewer URL
with the shared `@allmaps/env` schema. Without a key, coordinate search remains
available.

In Cloudflare Workers Builds, configure `PUBLIC_GEOCODE_EARTH_KEY` in the
Worker's **Build variables and secrets**, then rebuild and deploy. A runtime
Worker secret alone does not make the key available to this static app, and
changing the build secret requires a new build. The key is public browser
configuration; configure its allowed origins in Geocode Earth. Map searches
use the public Allmaps annotations API, like the random-map importer.

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

## Finding maps by place

The search icon opens the shared Allmaps geocoder, including venues and landmarks.
Choose a place or enter decimal coordinates in **latitude, longitude** order
(for example, `52.01, 4.36`). Brackets and whitespace-separated pairs use the same
order. Coordinate entry works locally, including without a Geocode Earth key.
Only the chosen point is used: no boundary or geometry request is made.

Results appear beneath a fixed circle, initially covering a 250 ground metre
radius. Pan, scroll or pinch to move and scale the original map beneath it. The
camera is constrained to keep the circle inside the image; the ground radius
stays within 10 m–50 km. **Refine search** queries maps for the center and radius
currently inside the circle. It sits in the button row and is enabled only after
the view changes. It retains chosen maps, including their crops, and keeps the
current map and camera in place while other results refresh. Routine loading and
skipped-map messages are omitted; the Allmaps spinner indicates progress.

Search queries up to 100 source annotations whose geographic masks intersect the
circle's bounds. Four concurrent `info.json` checks skip unavailable image
services; there is no sample-image preflight. Available results appear directly
on the canvas as they arrive. Previous/next start at the query's center and scale,
remembering adjustments to each map while browsing. **+ Add / − Remove** changes
the selection; the checkmark confirms it and
imports the maps with compact PRISM as one undo step. Left/right arrows, Space,
and Command/Ctrl Enter provide the corresponding shortcuts. Closing search
restores the previous collage and camera without adding anything.

The circle replaces the original resource mask rather than intersecting it, so
it cannot become a collection of partial segments. Sources whose image bounds do
not cover the entire circle are excluded. This guarantees coverage by the image,
not that every pixel contains cartographic content or that every tile server is
available. The **Import shape** fan offers Circle, Original mask and Full image
for all selected maps. This setting affects only the imported masks; the preview
stays circular. The canvas is clipped while navigating and resource masks are
created when selecting maps, avoiding transformer rebuilds on every gesture.
Masks remain editable and export as ordinary resource masks; no search metadata
is added to annotations.

Addition mode shares the collage's MapLibre map and Allmaps layer. Selected
previews become collage maps by updating their GCPs and masks in place, keeping
their instance IDs and the renderer's existing image/tile cache. Only the current
result, neighboring results and selected maps remain in the layer during search;
unused previews are removed when leaving it. Cancelling removes every preview
and restores the existing collage. Normal renderer cache pruning still applies.

The last eight searches remember their point, radius, current result and import
shape in `sessionStorage`. Responses are cached in memory for quick revisits;
after a page reload, the app refetches maps. Reopening a search always starts with
an empty selection. Use the × next to a recent search to remove it and its cached
response. This is per-tab search history, not an autosave of the collage.

## Arranging maps

- Click/drag a map to select/move it. Double-click a map to edit its group, or its mask when ungrouped.
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
  Double-click resets rotation; a group rotates rigidly using its first selected map.
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
  spacing and scale. Groups retain the full arc and share appearance controls; individual mask
  editing is available inside group editing mode. **Arrange**, **Geographic**, **Align** and **Distribute** appear as compact
  icon buttons beside **Edit layout** at the bottom center, above the zoom controls
  on smaller screens.
  **Arrange** compacts the current positions with PRISM, keeping the first selected
  map fixed and preserving scale, rotation, masks and layer order.
  **Geographic** keeps the first selected map
  fixed, including its rotation, and restores the others' geographic offsets and
  relative orientation. Each map keeps its scale; unrelated maps and layer order
  stay unchanged. Both arrangements are one undo step and fly the camera to the
  bounds of just the arranged selection.
  **Align** opens a fan for top, bottom, left, right, horizontal-center and
  vertical-center alignment, using the visible masks and the selection's bounds.
  Groups move as one object; inside **Edit group**, members align individually.
  Alignment preserves scale, rotation and appearance, is one undo step, and fits
  the selected maps in view.
  **Distribute** spaces three or more selected objects with equal horizontal or
  vertical gaps between their visible bounds, keeping the outer objects fixed.
  Groups count as one object, except inside **Edit group**. Crowded selections
  can retain overlap. Distribution preserves shapes, settings and layer order,
  fits the selection in view, and is one undo step.
  **Space horizontally** and **Space vertically** instead create a positive gap
  equal to 10% of the objects' average width or height, keeping the selection
  centered. These options work with two or more objects and can expand or compact
  the selection without resizing any maps.
  Mask editing remains an individual-map action.
  Group ordering keeps the selected maps' relative order; each gesture is one
  undo step. Click empty canvas or press Escape to deselect.
- **Open in Viewer** opens the imported annotation URL in a new tab. URL imports
  retain the exact URL, including for annotations containing multiple maps.
  Search and random maps use their original annotation URL. The button is
  disabled for pasted JSON, local files and multiple selected maps. The URL is
  kept through duplication and undo, without adding metadata to exports.
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
  are restored when reopening a saved annotation in Collage.
- The wand toggles automatic background removal, using Viewer's masked color
  detection in a worker and the same threshold/hardness. Appearance changes
  support undo/redo.
- A failed image or tile request marks the affected mask in Allmaps red.
  The outline returns to its normal color when the failed resources recover.
- Map imagery always updates during gestures. An update exceeding 32 ms switches
  that gesture to the outline fallback until release. This measures synchronous
  update cost, not GPU frame time. There is no preview toggle.

## Editing masks

Double-click an ungrouped map or a member inside **Edit group**, or select one
and choose **Edit mask**. Editing stays on the existing zoom
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
- Open **Drawing tools** for a fan of labeled options: Edit points, Polygon,
  Pen, Circle and Rectangle. The menu supports arrow keys and Escape.
- Tablet styluses (including Apple Pencil) use captured pointer input for all
  drawing and editing tools. Tap for polygon vertices, or drag and lift for
  freehand, circles, rectangles and vertex edits. Browser touch gestures do not
  take over a Pencil stroke; interrupted strokes restore the previous draft.
- Choose **Polygon** to replace the polygon. Click to place vertices,
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
- **Circle** draws from center to edge; **Rectangle** draws between opposite
  corners, aligned with the current view. Drag to draw and release to finish.
  Shapes stay within the image bounds and become ordinary editable polygons.
- Drag inside an existing mask to move it without changing its shape. Its edges
  stop at the image boundary. Drag outside to pan the map; adding a second finger
  cancels the mask drag and hands control to normal map navigation.
- **Reset mask** restores the source mask from the current import, including the
  original mask before a circular search crop. That source mask is kept in memory;
  reopening an exported collage uses the loaded mask as the new source of truth.
- **Full image mask** replaces the draft with the image rectangle.
- **Orthogonalize** straightens corners within 13° of a right angle and removes
  redundant vertices on nearly straight edges, preserving the mask's general
  orientation. A uniform fit keeps the result inside the image; invalid results
  leave the draft intact. This adapts the [iD orthogonalize action](https://github.com/openstreetmap/iD/blob/b08827e5e87a977587f49239fb734a126ac9ea69/modules/actions/orthogonalize.ts)
  by iD Contributors under the ISC license. The copyright and full license are
  retained in the source and [distributed notices](static/third-party-notices.txt).
- Use the editor's undo/redo controls for vertex edits, replacement polygons,
  and individual points while polygon drawing. Drawing a shape, moving a mask,
  resetting it, pen strokes, full-mask replacement and orthogonalization each
  form one undo step. Undo during pen drawing
  cancels the unfinished stroke. **Done** is disabled until a new polygon
  has been closed.
- **Done** (Cmd+Enter on Mac, Ctrl+Enter on Windows/Linux) saves the draft as one collage undo step and updates the tool
  positions. **Cancel** discards all edits. Both restore the other maps and
  previous camera view. Escape cancels editing when no drawing is in progress.

Masks must be simple polygons with at least three vertices inside the image.
Edited masks are included in the standard annotation. Editing leaves map
placements and GCPs unchanged.

## Tool ring settings

**Settings** at the top right lets you show or hide tools and change their order
by dragging the icon rows (use the grip on touchscreens so labels still scroll).
Focused rows also accept Up/Down or Home/End for keyboard reordering.
Preferences are stored in this browser. Mirror is hidden by default; Transform
is enabled. Reset restores the default tools and ordering.
Locked maps always retain an Unlock button, even if Lock is hidden in settings.

**Import maps as** defaults to Helmert. Polynomial fits a first-order affine
transformation to all original GCPs, retaining unequal axis scales and shear,
then reduces it to three control points. Two-point sources fall back to Helmert.
The Transform frame follows the fitted geometry, including both skew directions
and unequal axis scales. This option applies to URL, file, random, and place-search
imports; opening a collage always preserves its saved geometry.

**Transform** opens a separate mode for one or more unlocked maps. A selection
or group gets one shared frame: every sheet and the spaces between sheets receive
the same affine transform, preserving their arrangement and shared boundaries.
Individual masks, appearance, groups and imported reset values are retained.
Enter Edit group first to transform just one group member.
Drag corner handles to scale both axes, or midpoint handles
to scale X or Y. Hold Shift at a corner to retain proportions. Drag the sides
between handles to skew along those edges. The opposite corner or edge stays
fixed. Mouse, touch and pen use the same handles; arrow keys adjust a focused
handle. Drag inside the frame to move the map, or just outside a corner to rotate
around the frame's center. A rotation cursor appears outside the corners.
Rotation snaps to the map's bearing; Shift snaps in
15-degree steps. Pan outside the frame; wheel and pinch zoom remain available.
Other maps are shown by default in Transform mode and hidden by default in mask
mode. Both modes have a visibility button; within Edit group it only shows the
other group members. Leaving either mode restores the previous visibility.

**Isometric** opens a fan with **Tilt left** and **Tilt right**. Both create a
30-degree plane preserving the current area and center; a selection is projected
as one plane. Alt/Option-click applies the opposite of the last chosen tilt.
It aligns with the current view and is a single undo step within Transform mode.

**Reset** restores the imported scale and skew for one map. For a selection it
restores the scale, skew and relative spacing from before its shared transformation,
retaining the selection's current position and rotation. The selector remembers
its deformation across Transform sessions, including after saving and reopening
the collage. Individual shape edits start a new shared reference. For polynomial imports,
**Reset to zero** removes both shears and returns to uniform scale at the original
area-equivalent ground scale. Rotation, position, masks and appearance are retained.
The imported values use a polar rotation and uniform scale as their reference;
the remaining affine matrix supplies independent scales and two sequential shears.
The frame is a rectangle at zero skew and follows the map as a parallelogram when
skewed. Undo/redo work within the mode. Done (or Command/Ctrl Enter) commits one
collage undo step; Cancel or Escape discards the draft. Saved annotations retain
current and imported transform values, so both resets also work after reopening.

The layer-order button sends a frontmost selection to the back, and brings other
selections to the front. Alt/Option reverses the action.

## Locks and groups

Grouped maps use blue outlines, distinct from the pink individual selection.

Adding an annotation containing multiple maps groups them automatically. Each
URL or file gets its own group, including files dropped together; single-map
imports stay ungrouped. Saved group structures are preserved, with fresh group
IDs for each imported document. Opening a collage restores its groups as saved.
Random maps and place-search results remain independent maps.

**Lock** folds the map controls along their circle toward the lock button,
leaving **Unlock** available. Locked maps remain selectable and the canvas can
still pan/zoom, but dragging, duplication, deletion, arrangement and setting
changes are blocked. Locking a group locks every member. If a mixed selection
contains a locked map, unlock it before editing the selection. Reduced-motion
preferences disable the folding animation.

Select multiple maps and choose **Group** in the bottom action row, or press
Cmd/Ctrl+G. Clicking any member then selects the entire group; Shift/Cmd/Ctrl-click
and marquee selection also treat groups as units. Move and rotate them together.
Grouping preserves each member's mask, appearance and placement. Adjusting opacity,
color, saturation or background removal applies only that setting to every member;
background removal still detects each image's own paper color. Duplicated groups are independent.
Use **Ungroup** (Cmd/Ctrl+Shift+G) to separate the members permanently.
Lock, group and ungroup operations are undoable. Annotations preserve locks and
group membership in `_allmaps.collage`; adding a saved collage remaps group IDs
so separate imports do not merge into existing groups.

Double-click an unlocked grouped map to enter **Edit group**. Other maps and their
outlines are hidden on the same canvas without changing the view or clearing the
tile cache. Click, Shift-click, marquee and Cmd/Ctrl+A now select only individual
members of that group. Move, rotate, change settings, duplicate or remove members
individually; duplicates stay in the group. Double-click a member again, or use
**Edit mask**, to edit its mask and then return to the isolated group.

**Done**, Escape or Cmd/Ctrl+Enter returns to the full collage with the group
selected. Edits take effect immediately and retain their normal undo steps.
**Ungroup** in this mode (also Cmd/Ctrl+Shift+G) dissolves the entire group and
returns to the full collage with its former members selected, as one undo step.
Undo/redo preserves isolation while the group exists; deleting its last member
or undoing its creation returns to the full collage. Import, search and export
are disabled during group editing. **Fit group** frames only the group's members.

## Keyboard shortcuts

| Shortcut                              | Action                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------- |
| Cmd/Ctrl+S                            | Save annotation, or finish mask/group editing                             |
| Cmd/Ctrl+Enter                        | Finish mask/group editing or selection                                    |
| Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z         | Undo / redo in the active mode                                            |
| Cmd/Ctrl+G / Cmd/Ctrl+Shift+G         | Group / ungroup selected maps                                             |
| Cmd/Ctrl+A                            | Select all maps                                                           |
| Shift/Cmd/Ctrl-click                  | Toggle a map in the selection                                             |
| Shift-drag empty canvas               | Add maps to the selection with a rectangle                                |
| Double-click a map                    | Edit its group, or its mask inside a group / when ungrouped               |
| Alt/Option-drag a map or move control | Duplicate and move the selection                                          |
| Alt/Option-click mirror               | Mirror vertically                                                         |
| Space-drag                            | Pan the canvas                                                            |
| Shift while rotating                  | Snap to 15-degree increments, with natural bearing taking priority nearby |
| Alt/Option-click rotation             | Make each selected map upright around its own center                      |
| Alt/Option                            | Change Bring to front into Send to back                                   |
| Delete                                | Remove selected maps                                                      |
| Escape                                | Cancel a gesture or drawing, finish selection, exit mask editing, or deselect maps |

The **Select maps** button beside the zoom/fit controls enables tap selection on
phones, tablets and desktop. It keeps the current selection and replaces the
tool ring with **Select all**, **Clear** and **Done**. Tap maps to toggle them;
tapping empty canvas leaves the selection intact. Drag anywhere to pan, including
over maps, and pinch or scroll to zoom. Movement or a second finger cancels the
pending tap until all fingers lift. Double-tapping does not enter an editor or
zoom while selecting. Groups toggle together; inside **Edit group**, members
toggle individually. Locked maps can also be selected. **Done**, Escape or
Cmd/Ctrl+Enter restores the tools with the selection intact, without adding an
undo step. Cmd/Ctrl+A selects all maps in the current group or collage.

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

On **Add**, unwrap longitude across the antimeridian and fit the selected
transformation (Helmert by default) using all original GCPs. Sample that fit at
the crop center and two perpendicular side points. Subtract the projected mask's bounding-box center, then multiply by
`cos(source latitude)`. These three non-collinear GCPs preserve the fitted
transformation and allow affine edits while reducing the work needed to
rebuild transformers during drags. Sampling the fitted surface retains
information from the whole source fit.

New maps default to Helmert, approximating source warps at a comparable ground
scale. Optional polynomial import retains the first-order affine fit instead.
Mirroring and skew also use affine transformations. The preference affects future
imports; opening older collages preserves their saved geometry and transformation.

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
- `_allmaps.collage` version 1 preserves non-default appearance (opacity,
  saturation, hue/colorization, background removal/color, and mask application),
  groups, locks, custom titles, original import URLs, original masks for reset,
  and current/imported transform values. Appearance defaults are omitted. Unknown versions and malformed optional
  values are ignored. Removing a group or lock clears its old saved value.
  Geometry and layer order stay in standard GCPs, masks and annotation order;
  clients that ignore the optional metadata can still render those maps.
  Viewport, undo history and browser preferences are not exported.
- Reopening retains the loaded geometry as the source of truth. Provenance is
  preserved without fetching it to recover orientation.

## Rendering and current scope

The prototype uses the public `setMapOptions` API to update GCPs and the active
transformation, at most once per animation frame, with interpolation disabled.
This keeps the raster, masks, hit testing and tile
selection consistent. A dedicated renderer matrix API is a possible later
optimization; the prototype does not modify shared renderer code.

The UI supports individual and group selection, compact PRISM organization, duplication,
appearance controls, Transform mode, in-place mask editing and canvas exports. Editable map labels
and local autosave remain future work. Save annotations before closing
or reloading the page to preserve the layout.

### Exports

The export fan offers AnnotationPage, Image and SVG. Each dialog offers **All maps**
or **Selected maps**; the latter is disabled when nothing is selected. Selection
exports preserve layer order, map settings, groups and locks. AnnotationPage saves
only the chosen maps. Image defaults to the entire collage (or entire selection)
and can also export the current view, without controls
or the dotted backdrop. Entire collage fits the visible masks (or full images
where masks are disabled), keeping the view's orientation. Margin adds a percentage
of the shorter side on each edge; zero gives a tight frame. Preset and custom
width-to-height proportions expand the frame without cropping maps.
Both image and SVG export default to a 10% margin. SVG always frames the entire
collage or selection with its original proportions. Overlapping unselected maps
are excluded from both image and SVG exports. Export is disabled for empty collages.

Image export offers transparent PNG or JPG with a selectable background (Allmaps
colors, white, black, or a custom color), DPI, and a
printed map scale such as 1:10,000. Scale uses Collage's normalized ground meters,
including its internal canvas coordinate factor. Dimensions are rounded to the
nearest pixel; source image detail still limits how much detail can be printed.

Raster export retains the existing MapLibre instance, Allmaps renderer and tile
cache. A frozen canvas covers the map while an export viewport requests tiles
at the output resolution. Only the backing buffer changes size, so a different
aspect ratio does not change the camera, CSS canvas or control positions.
It waits for tile preparation and the
`allrequestedtilesloaded` event, verifies that required tiles actually succeeded,
captures inside MapLibre's render event, then restores the display resolution.
Cancellation, failure and timeouts also restore the view. The
[changedpi](https://github.com/shutterstock/changeDPI) Blob API writes PNG pHYs and
JPEG JFIF density metadata without re-encoding pixels or making a base64 copy.
Output is limited to 32 megapixels and 8,192 pixels per side (or lower device
limits); oversized exports are rejected rather than silently changing scale.

SVG follows the native matrix and resource-coordinate clipping approach in the
[Allmaps SVG warping notebook](https://observablehq.com/@allmaps/svg-warping).
Its settings dialog offers a single maximum source-image dimension (default
2,048 px on the longest side) and linked or embedded images. Images fit inside these limits
without changing their aspect ratio, respecting declared service limits and
available sizes. These limits affect source detail, not the SVG's layout.
Embedding first tries decoded ImageData tiles from the existing renderer cache.
Only complete source coverage at the requested detail is reused; partial or
lower-resolution caches fall back to a bounded full-image request. This requires
the service to allow cross-origin fetching. Cached pixels are assembled as PNG;
downloaded JPEG/PNG files keep their encoding. Duplicate sources are embedded
once and referenced by each map. Source images are limited to 32 megapixels,
8,192 px per side, and 100 MB of encoded data per SVG. Tile-only services without
a complete suitable cache or a full-image rendition are rejected.
Helmert and first-order polynomial transforms, including mirrored maps, are
supported, along with masks, opacity, saturation and colorization. Automatic
background removal and non-affine transformations require Image export. Linked
images must remain accessible when the SVG is opened; applications that block
external SVG images may need those links enabled.

Adding fits Helmert by default, or a first-order polynomial when selected in
Settings, to the original GCPs. Opening preserves supported
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
