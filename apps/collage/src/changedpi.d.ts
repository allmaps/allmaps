declare module 'changedpi' {
  export function changeDpiBlob(blob: Blob, dpi: number): Promise<Blob>
}
