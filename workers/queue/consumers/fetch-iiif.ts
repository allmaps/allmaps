import { fetchJson } from '@allmaps/stdlib'
import { Manifest as IIIFManifest } from '@allmaps/iiif-parser'

import type { Db } from '@allmaps/api-db'
import type { IIIFQueueMessageBody } from '@allmaps/api-types'

import { createManifest } from '../db/iiif-queries.js'

export async function fetchIiif(db: Db, msg: Message<IIIFQueueMessageBody>) {
  if (msg.body.type === 'manifest') {
    const manifestUrl = msg.body.url
    console.log('Fetching manifest', manifestUrl)

    const sourceData = await fetchJson(manifestUrl)

    const parsedManifest = IIIFManifest.parse(sourceData)

    const resultManifest = await createManifest(db, parsedManifest, sourceData)
    console.log(`Saved in database as manifest/${resultManifest.id}`)

    return resultManifest.id
  }

  throw new Error('Unknown message type')
}
