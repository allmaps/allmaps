export function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = ''
  for (const byte of new Uint8Array(buffer)) {
    binary += String.fromCodePoint(byte)
  }

  return btoa(binary)
}
