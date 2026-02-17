# @allmaps/frame

Find optimal viewport frames for georeferenced map previews.

_This package and its algorithm was created with help from Claude Code / Sonnet 4.5. It works quite well, but needs improvement!_

## What it does

`@allmaps/frame` computes the best bounding box (frame) to show when generating preview images of georeferenced maps. It analyzes map polygon geometries and finds a viewport that:

- **Minimizes background** (high fill - map pixels / viewport pixels)
- **Shows meaningful content** (adequate coverage - visible map / total map)
- **Handles complex cases** (scattered maps, irregular shapes, clusters)

## Installation

```bash
npm install @allmaps/frame
```

## Usage

```typescript
import { findBestFrame } from '@allmaps/frame'
import type { Polygon, Size, Bbox } from '@allmaps/types'

const mapPolygons: Polygon[] = [
  // Array of polygons representing your map geometry
  // Each polygon is an array of rings (outer + holes)
  // Each ring is an array of [lon, lat] coordinates
]

const viewportSize: Size = [800, 600] // [width, height] in pixels

const mapBbox: Bbox = [minLon, minLat, maxLon, maxLat] // Overall bounding box

const optimalFrame = findBestFrame(mapPolygons, viewportSize, mapBbox)
// Returns: [minLon, minLat, maxLon, maxLat] - optimal viewport bbox
```

## Algorithm

The function uses a multi-stage approach:

1. **Spatial clustering** - Groups nearby polygons using union-find
2. **Candidate generation** - Proposes multiple center points per cluster:
   - Cluster bbox center
   - Polygon centroids (top 8 by area)
   - Midpoints between centroids
   - Pole of inaccessibility
3. **Scale optimization** - Samples 40 zoom levels for each candidate center
4. **Scoring** - Evaluates each viewport by:
   - `fill` = intersection area / viewport area (higher = less background)
   - `coverage` = intersection area / cluster area (higher = more map shown)
   - Enforces minimum thresholds (≥30% fill, cluster-dependent coverage)
5. **Refinement** - Centers the viewport on the area-weighted centroid of visible content

## Use cases

- **Single large polygon** - Shows most of it with minimal background
- **Scattered small maps** - Zooms into the densest cluster
- **Long thin chains** - Shows a well-filled section
- **Irregular polygon with outliers** - Focuses on the main mass

## Dependencies

- `@allmaps/stdlib` - Bbox utilities
- `@allmaps/types` - TypeScript types
- `@turf/*` - Geospatial operations
- `polylabel` - Pole of inaccessibility

## License

MIT
