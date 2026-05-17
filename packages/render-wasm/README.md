# @allmaps/render-wasm

WebAssembly-powered renderer for high-performance image transformations in Allmaps.

This package provides a Rust-based WASM implementation of core rendering functions, offering significant performance improvements over pure JavaScript implementations for image processing operations like JPEG decoding, image transformations, and format encoding.

**This module was mostly written by Claude Code / Sonnet 4.5, based on the original TypeScript IntArrayRenderer from the @allmaps/render module.**

## Features

- **Fast JPEG decoding**: Native Rust JPEG decoding is ~3.1× faster than jpeg-js
- **SIMD-optimized**: Built with WebAssembly SIMD support for parallel processing
- **Multiple output formats**: Support for PNG and WebP encoding
- **Zero-copy operations**: Efficient memory handling through WebAssembly's linear memory
- **Cloudflare Workers compatible**: Built for web targets, works seamlessly in edge environments

## Performance Benefits

The WASM renderer is primarily used in the [Allmaps TileServer](../../workers/tileserver/) where it provides:

- Smaller cache footprint (caching raw JPEG bytes instead of decoded images)
- Faster tile generation through native image processing
- Reduced memory pressure in serverless environments

## Installation

This package works in browsers and in Node.js as an ESM module.

Install with pnpm:

```sh
pnpm install @allmaps/render-wasm
```

## Building from Source

This package requires Rust and wasm-pack to build:

```sh
# Build for web (Cloudflare Workers, browsers)
pnpm run build

# Build for Node.js (tests)
pnpm run build:nodejs

# Build both targets
pnpm run build:all
```

The package is built with SIMD support enabled by default. This requires browsers/runtimes that support WebAssembly SIMD.

**Build outputs:**

- `pkg/` - Web target (ES modules for browsers and Cloudflare Workers)
- `pkg-nodejs/` - Node.js target (for Vitest tests)

The `wasm.d.ts` type declaration is automatically copied from `src/` to `pkg/` during build.

## Usage

### With the WASM Renderer

```js
import wasmInit, * as wasmModule from '@allmaps/render-wasm'
import wasmUrl from '@allmaps/render-wasm/wasm'
import { WasmRenderer } from '@allmaps/render/wasm'

// Initialize the WASM module
await wasmInit({ module_or_path: wasmUrl })

// Create a WASM renderer
const renderer = new WasmRenderer(wasmModule, {
  fetchFn: fetch,
  outputFormat: 'png' // or 'webp'
})

// Add a georeferenced map
await renderer.addGeoreferencedMap(georeferencedMap)

// Render to a buffer
const imageBuffer = await renderer.render(viewport)
```

### Direct WASM Functions

You can also use the lower-level WASM functions directly:

```js
import wasmInit, {
  decode_jpeg_test,
  encode_rgba_to_png
} from '@allmaps/render-wasm'
import wasmUrl from '@allmaps/render-wasm/wasm'

await wasmInit({ module_or_path: wasmUrl })

// Decode JPEG to RGBA
const jpegBytes = new Uint8Array(/* ... */)
const decoded = decode_jpeg_test(jpegBytes)

// Encode RGBA to PNG
const rgba = new Uint8Array(/* ... */)
const png = encode_rgba_to_png(rgba, width, height)
```

## Architecture

This package uses:

- **[zune-jpeg](https://github.com/etemesi254/zune-image)**: Fast JPEG decoder
- **[image-rs](https://github.com/image-rs/image)**: Image encoding (PNG, WebP)
- **wasm-bindgen**: Rust/JavaScript interop
- **wasm-pack**: WebAssembly build toolchain

## Exports

The package exports:

- `@allmaps/render-wasm`: Main WASM module with init function and decoder/encoder functions
- `@allmaps/render-wasm/wasm`: The compiled WASM binary (for bundler/worker environments)

## Browser Compatibility

Requires browsers with WebAssembly SIMD support:

- Chrome/Edge 91+
- Firefox 89+
- Safari 16.4+

## License

MIT
