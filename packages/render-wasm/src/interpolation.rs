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

/// Sample a pixel using cubic convolution with a Catmull-Rom kernel.
///
/// Compared with bilinear interpolation this preserves more high-frequency
/// detail, which is especially useful for text and linework in scanned maps.
#[inline(always)]
pub fn sample_cubic(
    data: &[u8],
    tile_width: u32,
    tile_height: u32,
    tile_point_x: f64,
    tile_point_y: f64,
) -> [f64; 4] {
    let mut result = [0.0f64; 4];
    let base_x = tile_point_x.floor() as i32;
    let base_y = tile_point_y.floor() as i32;
    let weights_x = [
        cubic_weight(tile_point_x - (base_x - 1) as f64),
        cubic_weight(tile_point_x - base_x as f64),
        cubic_weight(tile_point_x - (base_x + 1) as f64),
        cubic_weight(tile_point_x - (base_x + 2) as f64),
    ];
    let weights_y = [
        cubic_weight(tile_point_y - (base_y - 1) as f64),
        cubic_weight(tile_point_y - base_y as f64),
        cubic_weight(tile_point_y - (base_y + 1) as f64),
        cubic_weight(tile_point_y - (base_y + 2) as f64),
    ];

    for (y_index, dy) in (-1..=2).enumerate() {
        let pixel_y = base_y + dy;
        let clamped_y = pixel_y.max(0).min(tile_height as i32 - 1) as u32;

        for (x_index, dx) in (-1..=2).enumerate() {
            let pixel_x = base_x + dx;
            let clamped_x = pixel_x.max(0).min(tile_width as i32 - 1) as u32;
            let weight = weights_x[x_index] * weights_y[y_index];
            let index = ((clamped_y * tile_width + clamped_x) * 4) as usize;

            for channel in 0..4 {
                result[channel] += data[index + channel] as f64 * weight;
            }
        }
    }

    result
}

#[inline(always)]
fn cubic_weight(distance: f64) -> f64 {
    let distance = distance.abs();
    // Catmull-Rom is the Keys cubic convolution kernel with a = -0.5.
    const A: f64 = -0.5;
    let distance_squared = distance * distance;
    let distance_cubed = distance_squared * distance;

    if distance <= 1.0 {
        (A + 2.0) * distance_cubed - (A + 3.0) * distance_squared + 1.0
    } else if distance < 2.0 {
        A * distance_cubed - 5.0 * A * distance_squared + 8.0 * A * distance - 4.0 * A
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::sample_cubic;

    #[test]
    fn cubic_sampling_preserves_integer_pixels() {
        let pixels = [
            10, 20, 30, 255, 40, 50, 60, 255, 70, 80, 90, 255, 100, 110, 120, 255,
        ];

        assert_eq!(
            sample_cubic(&pixels, 2, 2, 1.0, 1.0),
            [100.0, 110.0, 120.0, 255.0]
        );
    }

    #[test]
    fn cubic_sampling_preserves_constant_colors() {
        let pixels = [25, 50, 75, 255].repeat(16);
        let color = sample_cubic(&pixels, 4, 4, 1.25, 2.5);

        for (actual, expected) in color.iter().zip([25.0, 50.0, 75.0, 255.0]) {
            assert!((actual - expected).abs() < 1e-9);
        }
    }
}
