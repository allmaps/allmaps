/// Transform evaluation functions.
/// The JS side pre-solves transforms and passes weights; we only evaluate here.

pub enum Transform<'a> {
    Straight {
        tx: f64,
        ty: f64,
        scale: f64,
    },
    Helmert {
        w0: f64,
        w1: f64,
        w2: f64,
        w3: f64,
    },
    Polynomial1 {
        wx: [f64; 3],
        wy: [f64; 3],
    },
    Polynomial2 {
        wx: [f64; 6],
        wy: [f64; 6],
    },
    Polynomial3 {
        wx: [f64; 10],
        wy: [f64; 10],
    },
    Projective {
        // 3x3 matrix stored as [row0col0, row1col0, row2col0, row0col1, row1col1, row2col1, row0col2, row1col2, row2col2]
        m: [f64; 9],
    },
    ThinPlateSpline {
        n: usize,
        rbf_wx: &'a [f64],
        rbf_wy: &'a [f64],
        affine_wx: [f64; 3],
        affine_wy: [f64; 3],
        source_points: &'a [f64], // flattened [x,y,x,y,...]
    },
}

impl<'a> Transform<'a> {
    pub fn evaluate(&self, x: f64, y: f64) -> (f64, f64) {
        match self {
            Transform::Straight { tx, ty, scale } => (tx + scale * x, ty + scale * y),

            Transform::Helmert { w0, w1, w2, w3 } => {
                (w0 + w2 * x - w3 * y, w1 + w2 * y + w3 * x)
            }

            Transform::Polynomial1 { wx, wy } => (
                wx[0] + wx[1] * x + wx[2] * y,
                wy[0] + wy[1] * x + wy[2] * y,
            ),

            Transform::Polynomial2 { wx, wy } => {
                let rx =
                    wx[0] + wx[1] * x + wx[2] * y + wx[3] * x * x + wx[4] * y * y + wx[5] * x * y;
                let ry =
                    wy[0] + wy[1] * x + wy[2] * y + wy[3] * x * x + wy[4] * y * y + wy[5] * x * y;
                (rx, ry)
            }

            Transform::Polynomial3 { wx, wy } => {
                let rx = wx[0]
                    + wx[1] * x
                    + wx[2] * y
                    + wx[3] * x * x
                    + wx[4] * y * y
                    + wx[5] * x * y
                    + wx[6] * x * x * x
                    + wx[7] * y * y * y
                    + wx[8] * x * x * y
                    + wx[9] * x * y * y;
                let ry = wy[0]
                    + wy[1] * x
                    + wy[2] * y
                    + wy[3] * x * x
                    + wy[4] * y * y
                    + wy[5] * x * y
                    + wy[6] * x * x * x
                    + wy[7] * y * y * y
                    + wy[8] * x * x * y
                    + wy[9] * x * y * y;
                (rx, ry)
            }

            Transform::Projective { m } => {
                // m is 3x3 flattened column-major style matching the JS weightsArrays layout:
                // weightsArrays[col][row] => m[col*3 + row]
                // c = m[0*3+2]*x + m[1*3+2]*y + m[2*3+2]
                // num1 = m[0*3+0]*x + m[1*3+0]*y + m[2*3+0]
                // num2 = m[0*3+1]*x + m[1*3+1]*y + m[2*3+1]
                let c = m[2] * x + m[5] * y + m[8];
                let num1 = m[0] * x + m[3] * y + m[6];
                let num2 = m[1] * x + m[4] * y + m[7];
                (num1 / c, num2 / c)
            }

            Transform::ThinPlateSpline {
                n,
                rbf_wx,
                rbf_wy,
                affine_wx,
                affine_wy,
                source_points,
            } => {
                let mut rx = affine_wx[0] + affine_wx[1] * x + affine_wx[2] * y;
                let mut ry = affine_wy[0] + affine_wy[1] * x + affine_wy[2] * y;

                for i in 0..*n {
                    let sx = source_points[i * 2];
                    let sy = source_points[i * 2 + 1];
                    let dx = x - sx;
                    let dy = y - sy;
                    let r = (dx * dx + dy * dy).sqrt();
                    let kernel = if r == 0.0 { 0.0 } else { r * r * r.ln() };
                    rx += rbf_wx[i] * kernel;
                    ry += rbf_wy[i] * kernel;
                }

                (rx, ry)
            }
        }
    }

    pub fn parse(
        transform_type: &str,
        transform_args: &'a [f64],
        source_points: &'a [f64],
    ) -> Transform<'a> {
        match transform_type {
            "straight" => Transform::Straight {
                tx: transform_args[0],
                ty: transform_args[1],
                scale: transform_args[2],
            },
            "helmert" => Transform::Helmert {
                w0: transform_args[0],
                w1: transform_args[1],
                w2: transform_args[2],
                w3: transform_args[3],
            },
            "polynomial" | "polynomial1" => {
                let mut wx = [0.0; 3];
                let mut wy = [0.0; 3];
                wx.copy_from_slice(&transform_args[0..3]);
                wy.copy_from_slice(&transform_args[3..6]);
                Transform::Polynomial1 { wx, wy }
            }
            "polynomial2" => {
                let mut wx = [0.0; 6];
                let mut wy = [0.0; 6];
                wx.copy_from_slice(&transform_args[0..6]);
                wy.copy_from_slice(&transform_args[6..12]);
                Transform::Polynomial2 { wx, wy }
            }
            "polynomial3" => {
                let mut wx = [0.0; 10];
                let mut wy = [0.0; 10];
                wx.copy_from_slice(&transform_args[0..10]);
                wy.copy_from_slice(&transform_args[10..20]);
                Transform::Polynomial3 { wx, wy }
            }
            "projective" => {
                let mut m = [0.0; 9];
                m.copy_from_slice(&transform_args[0..9]);
                Transform::Projective { m }
            }
            "thinPlateSpline" => {
                let n = transform_args[0] as usize;
                let rbf_wx = &transform_args[1..1 + n];
                let rbf_wy = &transform_args[1 + n..1 + 2 * n];
                let mut affine_wx = [0.0; 3];
                let mut affine_wy = [0.0; 3];
                affine_wx.copy_from_slice(&transform_args[1 + 2 * n..1 + 2 * n + 3]);
                affine_wy.copy_from_slice(&transform_args[1 + 2 * n + 3..1 + 2 * n + 6]);
                Transform::ThinPlateSpline {
                    n,
                    rbf_wx,
                    rbf_wy,
                    affine_wx,
                    affine_wy,
                    source_points,
                }
            }
            _ => panic!("Unknown transform type: {}", transform_type),
        }
    }
}
