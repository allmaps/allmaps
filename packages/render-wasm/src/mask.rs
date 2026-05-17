/// Point-in-polygon test using ray casting algorithm.
/// Polygon is a flat array [x0,y0,x1,y1,...] representing a closed ring.
pub fn point_in_polygon(px: f64, py: f64, polygon: &[f64]) -> bool {
    let n = polygon.len() / 2;
    if n < 3 {
        return false;
    }

    let mut inside = false;
    let mut j = n - 1;

    for i in 0..n {
        let xi = polygon[i * 2];
        let yi = polygon[i * 2 + 1];
        let xj = polygon[j * 2];
        let yj = polygon[j * 2 + 1];

        if ((yi > py) != (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
            inside = !inside;
        }

        j = i;
    }

    inside
}
