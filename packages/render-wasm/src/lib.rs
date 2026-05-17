mod interpolation;
mod mask;
mod renderer;
mod transforms;

use image::codecs::jpeg::{JpegDecoder, JpegEncoder};
use image::codecs::png::{PngDecoder, PngEncoder};
use image::codecs::webp::WebPEncoder;
use image::{DynamicImage, ImageDecoder, ImageEncoder};
use std::io::Cursor;
use wasm_bindgen::prelude::*;

use renderer::{render, DecodedTile};
use transforms::Transform;

#[wasm_bindgen(start)]
pub fn init() {
    // Only enable panic hook in debug builds for better error messages
    #[cfg(feature = "console_error_panic_hook_feature")]
    console_error_panic_hook::set_once();
}

/// Decode a JPEG from raw bytes into an RGBA Vec
fn decode_jpeg(data: &[u8]) -> (Vec<u8>, u32, u32) {
    let decoder = JpegDecoder::new(Cursor::new(data)).expect("Failed to create JPEG decoder");
    let (width, height) = decoder.dimensions();
    let img = DynamicImage::from_decoder(decoder).expect("Failed to decode JPEG");
    let rgba = img.to_rgba8();
    (rgba.into_raw(), width, height)
}

/// Decode a PNG from raw bytes into an RGBA Vec
/// Returns error message as string on failure instead of panicking
fn decode_png(data: &[u8]) -> Result<(Vec<u8>, u32, u32), String> {
    let decoder = PngDecoder::new(Cursor::new(data))
        .map_err(|e| format!("Failed to create PNG decoder: {}", e))?;
    let (width, height) = decoder.dimensions();
    let img = DynamicImage::from_decoder(decoder)
        .map_err(|e| format!("Failed to decode PNG: {}", e))?;
    let rgba = img.to_rgba8();
    Ok((rgba.into_raw(), width, height))
}

/// Encode RGBA pixels into PNG bytes with optimized compression
fn encode_png(pixels: &[u8], width: u32, height: u32) -> Vec<u8> {
    let mut buf = Vec::new();
    // Use default compression (6) which is a good balance of speed and size
    // PngEncoder uses default compression level which is optimal for most cases
    let encoder = PngEncoder::new(&mut buf);
    encoder
        .write_image(pixels, width, height, image::ExtendedColorType::Rgba8)
        .expect("Failed to encode PNG");
    buf
}

/// Encode RGBA pixels into WebP bytes using lossless compression
/// Note: Lossy WebP encoding is not available because libwebp-sys cannot
/// compile to wasm32-unknown-unknown (missing C standard library headers).
/// The pure-Rust image-webp crate only supports lossless encoding.
///
/// Lossless WebP is still 25-30% smaller than PNG while maintaining perfect quality.
fn encode_webp(pixels: &[u8], width: u32, height: u32) -> Vec<u8> {
    let mut buf = Vec::new();
    let encoder = WebPEncoder::new_lossless(&mut buf);
    encoder
        .write_image(pixels, width, height, image::ExtendedColorType::Rgba8)
        .expect("Failed to encode WebP");
    buf
}

/// Encode RGBA pixels into JPEG bytes with configurable quality
/// Converts RGBA to RGB (removes alpha channel) since JPEG doesn't support transparency
fn encode_jpeg(pixels: &[u8], width: u32, height: u32, quality: u8) -> Result<Vec<u8>, String> {
    // Convert RGBA to RGB by removing alpha channel
    let rgb_pixels: Vec<u8> = pixels
        .chunks_exact(4)
        .flat_map(|rgba| [rgba[0], rgba[1], rgba[2]])
        .collect();

    let mut buf = Vec::new();
    let encoder = JpegEncoder::new_with_quality(&mut buf, quality);
    encoder
        .write_image(&rgb_pixels, width, height, image::ExtendedColorType::Rgb8)
        .map_err(|e| format!("Failed to encode JPEG: {}", e))?;
    Ok(buf)
}

/// Encode raw RGBA pixels to PNG
#[wasm_bindgen]
pub fn encode_rgba_to_png(pixels: &[u8], width: u32, height: u32) -> Vec<u8> {
    encode_png(pixels, width, height)
}

/// Encode raw RGBA pixels to WebP (lossless)
#[wasm_bindgen]
pub fn encode_rgba_to_webp(pixels: &[u8], width: u32, height: u32) -> Vec<u8> {
    encode_webp(pixels, width, height)
}

/// Encode raw RGBA pixels to JPEG with configurable quality (1-100, default 85)
#[wasm_bindgen]
pub fn encode_rgba_to_jpeg(pixels: &[u8], width: u32, height: u32, quality: u8) -> Vec<u8> {
    encode_jpeg(pixels, width, height, quality).unwrap_or_else(|e| {
        web_sys::console::error_1(&format!("JPEG encoding failed: {}", e).into());
        Vec::new()
    })
}

/// Test function for benchmarking JPEG decoding
#[wasm_bindgen]
pub struct DecodedImage {
    pub width: u32,
    pub height: u32,
}

#[wasm_bindgen]
pub fn decode_jpeg_test(jpeg_data: &[u8]) -> DecodedImage {
    let (_, width, height) = decode_jpeg(jpeg_data);
    DecodedImage { width, height }
}

/// Render warped tile from pre-decoded RGBA tiles (most efficient - no JPEG decoding)
#[wasm_bindgen]
pub fn render_warped_tile_rgba_direct(
    rgba_tiles: &[u8],
    tile_offsets: &[u32],
    tile_widths: &[u32],
    tile_heights: &[u32],
    tile_columns: &[f64],
    tile_rows: &[f64],
    tile_scale_factors: &[f64],
    tile_original_widths: &[f64],
    tile_original_heights: &[f64],
    transform_type: &str,
    transform_args: &[f64],
    source_points: &[f64],
    mask_polygon: &[f64],
    canvas_to_geo: &[f64],
    output_width: u32,
    output_height: u32,
) -> Vec<u8> {
    let tile_count = tile_offsets.len();

    // Parse pre-decoded RGBA tiles (no JPEG decoding needed!)
    let mut decoded_tiles = Vec::with_capacity(tile_count);
    for i in 0..tile_count {
        let start = tile_offsets[i] as usize;
        let end = if i + 1 < tile_count {
            tile_offsets[i + 1] as usize
        } else {
            rgba_tiles.len()
        };

        let rgba_data = &rgba_tiles[start..end];
        let w = tile_widths[i];
        let h = tile_heights[i];

        decoded_tiles.push(DecodedTile::new(
            rgba_data.to_vec(),
            w,
            h,
            tile_columns[i],
            tile_rows[i],
            tile_scale_factors[i],
            tile_original_widths[i],
            tile_original_heights[i],
        ));
    }

    // Parse transform
    let transform = Transform::parse(transform_type, transform_args, source_points);

    // Render and return raw RGBA pixels
    render(
        &decoded_tiles,
        &transform,
        mask_polygon,
        canvas_to_geo,
        output_width,
        output_height,
    )
}

/// Render warped tile and return raw RGBA pixels (for compositing multiple maps)
/// Note: This function decodes JPEG on every call - prefer render_warped_tile_rgba_direct for better performance
#[wasm_bindgen]
pub fn render_warped_tile_rgba(
    jpeg_tiles: &[u8],
    tile_offsets: &[u32],
    _tile_widths: &[u32],
    _tile_heights: &[u32],
    tile_columns: &[f64],
    tile_rows: &[f64],
    tile_scale_factors: &[f64],
    tile_original_widths: &[f64],
    tile_original_heights: &[f64],
    transform_type: &str,
    transform_args: &[f64],
    source_points: &[f64],
    mask_polygon: &[f64],
    canvas_to_geo: &[f64],
    output_width: u32,
    output_height: u32,
) -> Vec<u8> {
    let tile_count = tile_offsets.len();

    // Decode all JPEG tiles
    let mut decoded_tiles = Vec::with_capacity(tile_count);
    for i in 0..tile_count {
        let start = tile_offsets[i] as usize;
        let end = if i + 1 < tile_count {
            tile_offsets[i + 1] as usize
        } else {
            jpeg_tiles.len()
        };

        let jpeg_data = &jpeg_tiles[start..end];
        let (rgba, decoded_w, decoded_h) = decode_jpeg(jpeg_data);

        // ALWAYS use decoded dimensions to match RGBA buffer size
        // The provided tile_widths/heights may not match actual JPEG dimensions
        let w = decoded_w;
        let h = decoded_h;

        decoded_tiles.push(DecodedTile::new(
            rgba,
            w,
            h,
            tile_columns[i],
            tile_rows[i],
            tile_scale_factors[i],
            tile_original_widths[i],
            tile_original_heights[i],
        ));
    }

    // Parse transform
    let transform = Transform::parse(transform_type, transform_args, source_points);

    // Render and return raw RGBA pixels
    render(
        &decoded_tiles,
        &transform,
        mask_polygon,
        canvas_to_geo,
        output_width,
        output_height,
    )
}

#[wasm_bindgen]
pub fn render_warped_tile(
    jpeg_tiles: &[u8],
    tile_offsets: &[u32],
    _tile_widths: &[u32],
    _tile_heights: &[u32],
    tile_columns: &[f64],
    tile_rows: &[f64],
    tile_scale_factors: &[f64],
    tile_original_widths: &[f64],
    tile_original_heights: &[f64],
    transform_type: &str,
    transform_args: &[f64],
    source_points: &[f64],
    mask_polygon: &[f64],
    canvas_to_geo: &[f64],
    output_width: u32,
    output_height: u32,
) -> Vec<u8> {
    let tile_count = tile_offsets.len();

    // Decode all JPEG tiles
    let mut decoded_tiles = Vec::with_capacity(tile_count);
    for i in 0..tile_count {
        let start = tile_offsets[i] as usize;
        let end = if i + 1 < tile_count {
            tile_offsets[i + 1] as usize
        } else {
            jpeg_tiles.len()
        };

        let jpeg_data = &jpeg_tiles[start..end];
        let (rgba, decoded_w, decoded_h) = decode_jpeg(jpeg_data);

        // ALWAYS use decoded dimensions to match RGBA buffer size
        // The provided tile_widths/heights may not match actual JPEG dimensions
        let w = decoded_w;
        let h = decoded_h;

        decoded_tiles.push(DecodedTile::new(
            rgba,
            w,
            h,
            tile_columns[i],
            tile_rows[i],
            tile_scale_factors[i],
            tile_original_widths[i],
            tile_original_heights[i],
        ));
    }

    // Parse transform
    let transform = Transform::parse(transform_type, transform_args, source_points);

    // Render
    let pixels = render(
        &decoded_tiles,
        &transform,
        mask_polygon,
        canvas_to_geo,
        output_width,
        output_height,
    );

    // Encode PNG
    encode_png(&pixels, output_width, output_height)
}

#[wasm_bindgen]
pub fn render_warped_tile_webp(
    jpeg_tiles: &[u8],
    tile_offsets: &[u32],
    _tile_widths: &[u32],
    _tile_heights: &[u32],
    tile_columns: &[f64],
    tile_rows: &[f64],
    tile_scale_factors: &[f64],
    tile_original_widths: &[f64],
    tile_original_heights: &[f64],
    transform_type: &str,
    transform_args: &[f64],
    source_points: &[f64],
    mask_polygon: &[f64],
    canvas_to_geo: &[f64],
    output_width: u32,
    output_height: u32,
) -> Vec<u8> {
    let tile_count = tile_offsets.len();

    // Decode all JPEG tiles
    let mut decoded_tiles = Vec::with_capacity(tile_count);
    for i in 0..tile_count {
        let start = tile_offsets[i] as usize;
        let end = if i + 1 < tile_count {
            tile_offsets[i + 1] as usize
        } else {
            jpeg_tiles.len()
        };

        let jpeg_data = &jpeg_tiles[start..end];
        let (rgba, decoded_w, decoded_h) = decode_jpeg(jpeg_data);

        // ALWAYS use decoded dimensions to match RGBA buffer size
        // The provided tile_widths/heights may not match actual JPEG dimensions
        let w = decoded_w;
        let h = decoded_h;

        decoded_tiles.push(DecodedTile::new(
            rgba,
            w,
            h,
            tile_columns[i],
            tile_rows[i],
            tile_scale_factors[i],
            tile_original_widths[i],
            tile_original_heights[i],
        ));
    }

    // Parse transform
    let transform = Transform::parse(transform_type, transform_args, source_points);

    // Render
    let pixels = render(
        &decoded_tiles,
        &transform,
        mask_polygon,
        canvas_to_geo,
        output_width,
        output_height,
    );

    // Encode WebP (lossless - lossy not available in WASM)
    encode_webp(&pixels, output_width, output_height)
}

#[wasm_bindgen]
pub fn render_warped_tile_jpeg(
    jpeg_tiles: &[u8],
    tile_offsets: &[u32],
    _tile_widths: &[u32],
    _tile_heights: &[u32],
    tile_columns: &[f64],
    tile_rows: &[f64],
    tile_scale_factors: &[f64],
    tile_original_widths: &[f64],
    tile_original_heights: &[f64],
    transform_type: &str,
    transform_args: &[f64],
    source_points: &[f64],
    mask_polygon: &[f64],
    canvas_to_geo: &[f64],
    output_width: u32,
    output_height: u32,
    quality: u8,
) -> Vec<u8> {
    let tile_count = tile_offsets.len();

    // Decode all JPEG tiles
    let mut decoded_tiles = Vec::with_capacity(tile_count);
    for i in 0..tile_count {
        let start = tile_offsets[i] as usize;
        let end = if i + 1 < tile_count {
            tile_offsets[i + 1] as usize
        } else {
            jpeg_tiles.len()
        };

        let jpeg_data = &jpeg_tiles[start..end];
        let (rgba, decoded_w, decoded_h) = decode_jpeg(jpeg_data);

        // ALWAYS use decoded dimensions to match RGBA buffer size
        // The provided tile_widths/heights may not match actual JPEG dimensions
        let w = decoded_w;
        let h = decoded_h;

        decoded_tiles.push(DecodedTile::new(
            rgba,
            w,
            h,
            tile_columns[i],
            tile_rows[i],
            tile_scale_factors[i],
            tile_original_widths[i],
            tile_original_heights[i],
        ));
    }

    // Parse transform
    let transform = Transform::parse(transform_type, transform_args, source_points);

    // Render
    let pixels = render(
        &decoded_tiles,
        &transform,
        mask_polygon,
        canvas_to_geo,
        output_width,
        output_height,
    );

    // Encode JPEG
    encode_jpeg(&pixels, output_width, output_height, quality).unwrap_or_else(|e| {
        web_sys::console::error_1(&format!("JPEG encoding failed: {}", e).into());
        Vec::new()
    })
}

/// Convert PNG bytes to JPEG bytes with configurable quality
/// Useful for converting OG images from vercel-og (which outputs PNG) to JPEG for smaller file sizes
/// Returns empty Vec on error to avoid panics
#[wasm_bindgen]
pub fn convert_png_to_jpeg(png_data: &[u8], quality: u8) -> Vec<u8> {
    let result = decode_png(png_data)
        .and_then(|(rgba, width, height)| encode_jpeg(&rgba, width, height, quality));

    match result {
        Ok(jpeg_bytes) => jpeg_bytes,
        Err(e) => {
            web_sys::console::error_1(&format!("PNG to JPEG conversion failed: {}", e).into());
            Vec::new()
        }
    }
}

/// Convert PNG bytes to WebP bytes (lossless)
/// Useful for converting OG images from vercel-og (which outputs PNG) to WebP for smaller file sizes
/// Returns empty Vec on error to avoid panics
#[wasm_bindgen]
pub fn convert_png_to_webp(png_data: &[u8]) -> Vec<u8> {
    match decode_png(png_data) {
        Ok((rgba, width, height)) => encode_webp(&rgba, width, height),
        Err(e) => {
            web_sys::console::error_1(&format!("PNG to WebP conversion failed: {}", e).into());
            Vec::new()
        }
    }
}
