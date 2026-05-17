/**
 * Pure TypeScript SHA-1 implementation.
 * No external dependencies — works in all environments including Cloudflare Workers.
 *
 * Based on the SHA-1 specification (FIPS PUB 180-4).
 */

function rotl(n: number, s: number): number {
  return ((n << s) | (n >>> (32 - s))) >>> 0
}

/**
 * Computes the SHA-1 hash of a UTF-8 string and returns it as a hex string.
 *
 * @param message - Input string.
 * @returns Hex-encoded SHA-1 digest.
 */
export function sha1Hex(message: string): string {
  // Encode string to UTF-8 bytes
  const msgBytes = new TextEncoder().encode(message)
  const msgLen = msgBytes.length

  // Pre-processing: adding padding bits
  // Message length in bits
  const bitLen = msgLen * 8

  // Padding: 1 byte 0x80, then zeros, then 8 bytes for the 64-bit length.
  // Total padded length must be a multiple of 64 bytes.
  const padLen = ((msgLen + 9 + 63) & ~63) - msgLen
  const padded = new Uint8Array(msgLen + padLen)
  padded.set(msgBytes)
  padded[msgLen] = 0x80

  // Append original length in bits as big-endian 64-bit integer.
  // JavaScript's bit ops are 32-bit, so split into two 32-bit words.
  const dataView = new DataView(padded.buffer)
  const totalLen = padded.length
  dataView.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false)
  dataView.setUint32(totalLen - 4, bitLen >>> 0, false)

  // Initial hash values (H0–H4)
  let H0 = 0x67452301
  let H1 = 0xefcdab89
  let H2 = 0x98badcfe
  let H3 = 0x10325476
  let H4 = 0xc3d2e1f0

  // Process each 512-bit (64-byte) block
  const W = new Uint32Array(80)

  for (let offset = 0; offset < totalLen; offset += 64) {
    // Prepare message schedule
    for (let i = 0; i < 16; i++) {
      W[i] = dataView.getUint32(offset + i * 4, false)
    }
    for (let i = 16; i < 80; i++) {
      W[i] = rotl(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1)
    }

    let a = H0
    let b = H1
    let c = H2
    let d = H3
    let e = H4

    for (let i = 0; i < 80; i++) {
      let f: number
      let k: number

      if (i < 20) {
        f = ((b & c) | (~b & d)) >>> 0
        k = 0x5a827999
      } else if (i < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }

      const temp = (rotl(a, 5) + f + e + k + W[i]) >>> 0
      e = d
      d = c
      c = rotl(b, 30)
      b = a
      a = temp
    }

    H0 = (H0 + a) >>> 0
    H1 = (H1 + b) >>> 0
    H2 = (H2 + c) >>> 0
    H3 = (H3 + d) >>> 0
    H4 = (H4 + e) >>> 0
  }

  return [H0, H1, H2, H3, H4]
    .map((h) => h.toString(16).padStart(8, '0'))
    .join('')
}
