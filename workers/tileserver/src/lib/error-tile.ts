import { encode_rgba_to_png, encode_rgba_to_webp } from '@allmaps/render-wasm'
import { TileError } from './tile-error.js'

// A small bitmap font keeps error tiles independent of browsers and font servers.
const glyphs: Record<string, string> = {
  A: '010101111101101',
  B: '110101110101110',
  C: '011100100100011',
  D: '110101101101110',
  E: '111100110100111',
  F: '111100110100100',
  G: '011100101101011',
  H: '101101111101101',
  I: '111010010010111',
  J: '001001001101010',
  K: '101101110101101',
  L: '100100100100111',
  M: '101111111101101',
  N: '101111111111101',
  O: '010101101101010',
  P: '110101110100100',
  Q: '010101101111011',
  R: '110101110101101',
  S: '011100010001110',
  T: '111010010010010',
  U: '101101101101111',
  V: '101101101101010',
  W: '101101111111101',
  X: '101101010101101',
  Y: '101101010010010',
  Z: '111001010100111',
  '0': '111101101101111',
  '1': '010110010010111',
  '2': '110001010100111',
  '3': '110001010001110',
  '4': '101101111001001',
  '5': '111100110001110',
  '6': '011100111101111',
  '7': '111001010010010',
  '8': '111101111101111',
  '9': '111101111001110',
  '-': '000000111000000'
}

export function errorTilePixels(error: TileError, retina = false) {
  const ratio = retina ? 2 : 1
  const size = 256 * ratio
  const pixels = new Uint8Array(size * size * 4)
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels.set([255, 245, 243, 255], offset)
  }
  const scale = 3 * ratio
  function text(line: string, y: number) {
    for (const [index, character] of [...line.toUpperCase()].entries()) {
      const glyph = glyphs[character]
      if (!glyph) continue
      for (let bit = 0; bit < glyph.length; bit++) {
        if (glyph[bit] !== '1') continue
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const x = 20 * ratio + index * 4 * scale + (bit % 3) * scale + dx
            const row = y * ratio + Math.floor(bit / 3) * scale + dy
            pixels.set([135, 35, 35, 255], (row * size + x) * 4)
          }
        }
      }
    }
  }
  text('ALLMAPS ERROR', 24)
  const lines: string[] = ['']
  for (const word of error.message.split(' ')) {
    const last = lines.length - 1
    if (`${lines[last]} ${word}`.trim().length > 18) lines.push(word)
    else lines[last] = `${lines[last]} ${word}`.trim()
  }
  lines.forEach((line, index) => text(line, 68 + index * 24))
  text(error.code, 194)
  text(
    error.upstreamStatus
      ? `SOURCE HTTP ${error.upstreamStatus}`
      : `STATUS ${error.status}`,
    220
  )
  return { pixels, size }
}

export function createErrorTileResponse(error: TileError, request: Request) {
  const pathname = new URL(request.url).pathname
  const { pixels, size } = errorTilePixels(
    error,
    pathname.endsWith('@2x.png') || pathname.endsWith('@2x.webp')
  )
  const webp = pathname.endsWith('.webp')
  const bytes = webp
    ? encode_rgba_to_webp(pixels, size, size)
    : encode_rgba_to_png(pixels, size, size)

  // Map clients generally discard non-2xx image responses. Expose the failure
  // explicitly, while allowing the diagnostic image to be displayed.
  return new Response(bytes, {
    headers: {
      'Content-Type': webp ? 'image/webp' : 'image/png',
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      ...(error.upstreamStatus
        ? { 'X-Allmaps-Upstream-Status': String(error.upstreamStatus) }
        : {}),
      'X-Allmaps-Error': error.code,
      'X-Allmaps-Error-Message': error.message,
      'X-Allmaps-Error-Status': String(error.status),
      'Access-Control-Expose-Headers':
        'X-Allmaps-Error, X-Allmaps-Error-Message, X-Allmaps-Error-Status, X-Allmaps-Upstream-Status'
    }
  })
}
