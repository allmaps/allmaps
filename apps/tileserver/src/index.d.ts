// Type definitions of jpeg-js dependency include reference to Buffer.
// Buffer is undefined in browsers and workers.
// By adding a Buffer type definition in index.d.ts,
// we can prevent TypeScript errors.
type Buffer = ArrayBuffer

// Cloudflare Workers don't support ImageBitmap and WebGL,
// @cloudflare/workers-types does not include these types.
// TODO: move WebGLRenderer to new package @allmaps/webgl?
type ImageBitmap = unknown
type WebGL2RenderingContext = unknown
type WebGLProgram = unknown
type WebGLTexture = unknown
type WebGLVertexArrayObject = unknown
