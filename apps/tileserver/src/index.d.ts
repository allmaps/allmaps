// Type definitions of jpeg-js dependency include reference to Buffer.
// Buffer is undefined in browsers and workers.
// By adding a Buffer type definition in index.d.ts,
// we can prevent TypeScript errors.
type Buffer = ArrayBuffer
