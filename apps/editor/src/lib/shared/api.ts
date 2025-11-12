import { generateChecksum } from '@allmaps/id'
import { fetchJson } from '@allmaps/stdlib'

import type { Source } from '$lib/types/shared.js'

export async function fetchMaps(apiBaseUrl: string, source: Source) {
  const url = `${apiBaseUrl}/${source.type}s/${source.allmapsId}/maps`
  return await fetchJson(url)
}

export async function checkSource(apiBaseUrl: string, source: Source) {
  const url = `${apiBaseUrl}/${source.type}s/${source.allmapsId}`
  return await fetchJson(url)
}

export async function createSource(apiBaseUrl: string, source: Source) {
  if (source.type === 'collection') {
    console.warn("Don't create collection sources via API.")
    return
  }

  const checksum = await generateChecksum(source.sourceIiif)

  const apiUrl = `${apiBaseUrl}/${source.type}s/${source.allmapsId}`

  const apiData = {
    url: source.url,
    checksum
  }

  const response = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify(apiData)
  })

  return await response.json()
}
