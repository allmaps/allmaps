import { defaultPageMetadata } from '$lib/page-metadata.js'

export const prerender = true

export function load() {
  return {
    pageMetadata: defaultPageMetadata
  }
}
