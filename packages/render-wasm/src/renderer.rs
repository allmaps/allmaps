use crate::interpolation::sample_bilinear;
use crate::mask::point_in_polygon;
use crate::transforms::Transform;

/// Bounding box in resource space
#[derive(Clone, Copy)]
struct BBox {
    min_x: f64,
    max_x: f64,
    min_y: f64,
    max_y: f64,
}

impl BBox {
    /// Check if two bounding boxes intersect
    #[inline(always)]
    fn intersects(&self, other: &BBox) -> bool {
        !(self.max_x < other.min_x ||
          self.min_x > other.max_x ||
          self.max_y < other.min_y ||
          self.min_y > other.max_y)
    }

    /// Check if a point is inside this bbox
    #[inline(always)]
    fn contains_point(&self, x: f64, y: f64) -> bool {
        x >= self.min_x && x <= self.max_x && y >= self.min_y && y <= self.max_y
    }
}

/// Decoded tile with its metadata
pub struct DecodedTile {
    pub rgba: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
    bbox: BBox, // Cached bounding box for fast culling
}

impl DecodedTile {
    /// Create a new decoded tile with computed bounding box
    pub fn new(
        rgba: Vec<u8>,
        width: u32,
        height: u32,
        column: f64,
        row: f64,
        scale_factor: f64,
        original_width: f64,
        original_height: f64,
    ) -> Self {
        let min_x = column * original_width;
        let min_y = row * original_height;
        let max_x = min_x + original_width;
        let max_y = min_y + original_height;

        DecodedTile {
            rgba,
            width,
            height,
            scale_factor,
            bbox: BBox { min_x, max_x, min_y, max_y },
        }
    }

    /// Resource-space origin of this tile
    #[inline(always)]
    fn origin_x(&self) -> f64 {
        self.bbox.min_x
    }

    #[inline(always)]
    fn origin_y(&self) -> f64 {
        self.bbox.min_y
    }

    /// Check if a resource point falls within this tile
    #[inline(always)]
    fn contains(&self, rx: f64, ry: f64) -> bool {
        self.bbox.contains_point(rx, ry)
    }

    /// Get the bounding box of this tile
    #[inline(always)]
    fn bbox(&self) -> &BBox {
        &self.bbox
    }
}

/// Compute rough viewport bounding box in resource space by sampling key points
fn compute_viewport_bbox(
    transform: &Transform,
    canvas_to_geo: &[f64],
    output_width: u32,
    output_height: u32,
) -> BBox {
    let a = canvas_to_geo[0];
    let b = canvas_to_geo[1];
    let c = canvas_to_geo[2];
    let d = canvas_to_geo[3];
    let e = canvas_to_geo[4];
    let f = canvas_to_geo[5];

    let mut min_x = f64::INFINITY;
    let mut max_x = f64::NEG_INFINITY;
    let mut min_y = f64::INFINITY;
    let mut max_y = f64::NEG_INFINITY;

    // Sample corners and edges (9 points total)
    let sample_points = [
        (0.0, 0.0),
        (output_width as f64, 0.0),
        (0.0, output_height as f64),
        (output_width as f64, output_height as f64),
        (output_width as f64 / 2.0, 0.0),
        (output_width as f64, output_height as f64 / 2.0),
        (output_width as f64 / 2.0, output_height as f64),
        (0.0, output_height as f64 / 2.0),
        (output_width as f64 / 2.0, output_height as f64 / 2.0),
    ];

    for (fx, fy) in sample_points.iter() {
        let geo_x = a * fx + c * fy + e;
        let geo_y = b * fx + d * fy + f;
        let (rx_raw, ry_raw) = transform.evaluate(geo_x, geo_y);
        let rx = rx_raw;
        let ry = -ry_raw;

        min_x = min_x.min(rx);
        max_x = max_x.max(rx);
        min_y = min_y.min(ry);
        max_y = max_y.max(ry);
    }

    // Add padding to account for approximate bbox
    let padding = ((max_x - min_x) + (max_y - min_y)) * 0.1;
    BBox {
        min_x: min_x - padding,
        max_x: max_x + padding,
        min_y: min_y - padding,
        max_y: max_y + padding,
    }
}

/// Core render loop: for each output pixel, transform back to resource space,
/// check mask, find tile, sample with bilinear interpolation.
/// Optimized with bounding box culling and early pixel termination.
pub fn render(
    tiles: &[DecodedTile],
    transform: &Transform,
    mask_polygon: &[f64],
    canvas_to_geo: &[f64], // 6-element homogeneous transform
    output_width: u32,
    output_height: u32,
) -> Vec<u8> {
    let pixel_count = (output_width * output_height) as usize;
    let mut output = vec![0u8; pixel_count * 4];

    let a = canvas_to_geo[0];
    let b = canvas_to_geo[1];
    let c = canvas_to_geo[2];
    let d = canvas_to_geo[3];
    let e = canvas_to_geo[4];
    let f = canvas_to_geo[5];

    // OPTIMIZATION: Compute viewport bounding box for early culling
    let viewport_bbox = compute_viewport_bbox(transform, canvas_to_geo, output_width, output_height);

    // OPTIMIZATION: Bounding box culling - filter tiles that don't intersect viewport
    let visible_tiles: Vec<&DecodedTile> = tiles
        .iter()
        .filter(|tile| tile.bbox().intersects(&viewport_bbox))
        .collect();

    // If no tiles intersect, return empty image
    if visible_tiles.is_empty() {
        return output;
    }

    for cy in 0..output_height {
        for cx in 0..output_width {
            let fx = cx as f64;
            let fy = cy as f64;

            // Apply inverse homogeneous transform: canvas -> projected geo (EPSG:3857)
            let geo_x = a * fx + c * fy + e;
            let geo_y = b * fx + d * fy + f;

            // Apply transform: projected geo (EPSG:3857) -> resource pixels
            // Note: The transformation from getToResourceTransformation() expects EPSG:3857,
            // not WGS84! ProjectedGcpTransformer handles the projection internally.
            let (rx_raw, ry_raw) = transform.evaluate(geo_x, geo_y);

            // FIX: ProjectedGcpTransformer.transformToResource() negates the Y coordinate
            // to handle coordinate system handedness (image Y increases downward).
            // We need to do the same flip here.
            let rx = rx_raw;
            let ry = -ry_raw;

            // OPTIMIZATION: Early pixel termination - rough bounds check before expensive operations
            // Quick check if pixel is anywhere near the viewport bbox
            if !viewport_bbox.contains_point(rx, ry) {
                continue;
            }

            // Check resource mask
            if !point_in_polygon(rx, ry, mask_polygon) {
                continue;
            }

            // Find containing tile (only search visible tiles!)
            let tile = match visible_tiles.iter().find(|t| t.contains(rx, ry)) {
                Some(t) => t,
                None => {
                    continue;
                }
            };

            // Compute tile-local sub-pixel coordinates
            let tile_x = (rx - tile.origin_x()) / tile.scale_factor;
            let tile_y = (ry - tile.origin_y()) / tile.scale_factor;

            // Safety check: ensure coordinates are within tile bounds
            if tile_x < 0.0 || tile_x >= tile.width as f64 || tile_y < 0.0 || tile_y >= tile.height as f64 {
                // Out of bounds - skip this pixel
                continue;
            }

            // Bilinear sample
            let color =
                sample_bilinear(&tile.rgba, tile.width, tile.height, tile_x, tile_y);

            let idx = ((cy * output_width + cx) * 4) as usize;
            output[idx] = color[0].round().min(255.0).max(0.0) as u8;
            output[idx + 1] = color[1].round().min(255.0).max(0.0) as u8;
            output[idx + 2] = color[2].round().min(255.0).max(0.0) as u8;
            output[idx + 3] = color[3].round().min(255.0).max(0.0) as u8;
        }
    }

    output
}
