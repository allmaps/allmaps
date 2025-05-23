import { IRequestStrict } from 'itty-router'

import { arrayBufferToBase64 } from './base64.js'

import type { Env } from '../shared/types.js'

export async function loadImage(
  req: IRequestStrict,
  env: Env,
  imagePath: string
) {
  try {
    if (!env?.ASSETS) {
      throw new Error('ASSETS binding is not configured')
    }

    const imageUrl = new URL(`/images/${imagePath}`, req.url).toString()
    const imageData = await env.ASSETS.fetch(imageUrl)

    // Get content-type from response
    const contentType = imageData.headers.get('content-type') || 'image/png'
    const arrayBuffer = await imageData.arrayBuffer()
    const base64Image = arrayBufferToBase64(arrayBuffer)

    return `data:${contentType};base64,${base64Image}`
  } catch (error) {
    throw new Error(`Failed to load image ${imagePath}:`)
  }
}
