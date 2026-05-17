/// Bilinear interpolation helpers.

/// Bilinear pixel weight: (1 - |point_x - pixel_x|) * (1 - |point_y - pixel_y|)
#[inline(always)]
pub fn bilinear_weight(pixel_x: f64, pixel_y: f64, point_x: f64, point_y: f64) -> f64 {
    (1.0 - (point_x - pixel_x).abs()) * (1.0 - (point_y - pixel_y).abs())
}

/// Sample a pixel from an RGBA buffer with bilinear interpolation.
/// `tile_point` is the sub-pixel coordinate within the tile.
/// Returns [r, g, b, a].
#[inline(always)]
pub fn sample_bilinear(
    data: &[u8],
    tile_width: u32,
    tile_height: u32,
    tile_point_x: f64,
    tile_point_y: f64,
) -> [f64; 4] {
    let mut result = [0.0f64; 4];

    // The four surrounding pixels (floor/ceil)
    let offsets: [(i32, i32); 4] = [(0, 0), (1, 0), (0, 1), (1, 1)];

    for &(dx, dy) in &offsets {
        let px = tile_point_x.floor() as i32 + dx;
        let py = tile_point_y.floor() as i32 + dy;

        // Clamp to tile bounds
        let cx = px.max(0).min(tile_width as i32 - 1) as u32;
        let cy = py.max(0).min(tile_height as i32 - 1) as u32;

        let weight = bilinear_weight(px as f64, py as f64, tile_point_x, tile_point_y);
        let idx = ((cy * tile_width + cx) * 4) as usize;

        for c in 0..4 {
            result[c] += data[idx + c] as f64 * weight;
        }
    }

    result
}
