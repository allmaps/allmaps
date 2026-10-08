import { detectBackgroundColor } from '@allmaps/background-color'
import type { Point } from '@allmaps/types'

export type BackgroundRequest = {
  resourceSize: Point
  mask: Point[]
  rows: { url: string; width?: number; height?: number }[][]
}

self.onmessage = async ({ data }: MessageEvent<BackgroundRequest>) => {
  const bitmaps: ImageBitmap[] = []
  try {
    const rows = await Promise.all(
      data.rows.map((row) =>
        Promise.all(
          row.map(async (request) => {
            const response = await fetch(request.url, {
              signal: AbortSignal.timeout(15000)
            })
            if (!response.ok) throw new Error('Could not load a map thumbnail.')
            const bitmap = await createImageBitmap(await response.blob())
            bitmaps.push(bitmap)
            return bitmap
          })
        )
      )
    )
    const width = Math.max(
      ...rows.map((row) => row.reduce((sum, tile) => sum + tile.width, 0))
    )
    const height = rows.reduce(
      (sum, row) => sum + Math.max(...row.map((tile) => tile.height)),
      0
    )
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not read the map thumbnail.')
    let y = 0
    for (const row of rows) {
      let x = 0
      for (const tile of row) {
        context.drawImage(tile, x, y)
        x += tile.width
      }
      y += Math.max(...row.map((tile) => tile.height))
    }
    const thumbnail = canvas.transferToImageBitmap()
    bitmaps.push(thumbnail)
    // Same masked color detection and renderer settings as Allmaps Viewer.
    const color = detectBackgroundColor(data.resourceSize, thumbnail, data.mask)
    self.postMessage({
      color:
        '#' + color.map((value) => value.toString(16).padStart(2, '0')).join('')
    })
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : String(error)
    })
  } finally {
    bitmaps.forEach((bitmap) => bitmap.close())
  }
}
