import postgres from 'postgres'

import type { LanguageString } from '@allmaps/iiif-parser'
import type { DbRow } from '@allmaps/api-shared/types'

export type RawExportRow = {
  id: string
  image_id: string
  checksum: string
  image_checksum: string
  version: number
  created_at: Date
  updated_at: Date
  map: unknown
  geo_mask: unknown
  scale: number | null
  area: number | null
  image: unknown
}

export type StreamMapsOptions = {
  batchSize: number
  databaseUrl: string
  onRow: (row: DbRow) => Promise<void>
}

export async function streamMaps({
  batchSize,
  databaseUrl,
  onRow
}: StreamMapsOptions) {
  const sql = postgres(databaseUrl, {
    max: 1
  })

  try {
    const cursor = sql`
      select
        maps.id,
        maps.image_id,
        maps.checksum,
        maps.image_checksum,
        maps.version,
        maps.created_at,
        maps.updated_at,
        maps.data as map,
        ST_AsGeoJSON(maps.geo_mask)::json as geo_mask,
        maps.scale,
        maps.area,
        jsonb_build_object(
          'id', images.id,
          'uri', images.uri,
          'data', images.data,
          'embedded', images.embedded,
          'organizationUrl', case
            when organization_urls.url is null then null
            else jsonb_build_object(
              'url', organization_urls.url,
              'organization', case
                when organizations.id is null then null
                else jsonb_build_object(
                  'id', organizations.id,
                  'name', organizations.name,
                  'homepage', organizations.homepage,
                  'slug', organizations.slug,
                  'plan', organizations.plan
                )
              end
            )
          end,
          'canvases', coalesce(canvases_agg.canvases, '[]'::jsonb)
        ) as image
      from maps
      left join iiif.images on images.id = maps.image_id
      left join organization_urls
        on organization_urls.url = images.domain
        and organization_urls.type = 'domain'
      left join organizations on organizations.id = organization_urls.organization_id
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', canvases.id,
            'uri', canvases.uri,
            'label', canvases.label,
            'manifests', coalesce(manifests_agg.manifests, '[]'::jsonb)
          )
          order by canvases.id
        ) as canvases
        from iiif.canvases_images as canvases_to_images
        join iiif.canvases on canvases.id = canvases_to_images.canvas_id
        left join lateral (
          select jsonb_agg(
            jsonb_build_object(
              'id', manifests.id,
              'uri', manifests.uri,
              'label', manifests.label
            )
            order by manifests.id
          ) as manifests
          from iiif.manifests_canvases as manifests_to_canvases
          join iiif.manifests on manifests.id = manifests_to_canvases.manifest_id
          where manifests_to_canvases.canvas_id = canvases.id
        ) manifests_agg on true
        where canvases_to_images.image_id = images.id
      ) canvases_agg on true
      where maps.latest = true
        and maps.geo_mask is not null
      order by maps.updated_at desc
    `.cursor(batchSize)

    for await (const rows of cursor) {
      for (const row of rows) {
        await onRow(normalizeExportRow(row as unknown as RawExportRow))
      }
    }
  } finally {
    await sql.end()
  }
}

function normalizeExportRow(row: RawExportRow): DbRow {
  const map = parseJsonValue(row.map)
  const geoMask = parseJsonValue(row.geo_mask)
  const image = parseJsonValue(row.image) as DbRow['image']

  return {
    map: map as DbRow['map'],
    geoMask: geoMask as DbRow['geoMask'],
    image: normalizeImage(image),
    checksum: row.checksum,
    imageChecksum: row.image_checksum,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scale: row.scale,
    area: row.area
  }
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function normalizeImage(image: DbRow['image']): DbRow['image'] {
  if (!image) {
    return image
  }

  return {
    ...image,
    canvases: image.canvases.map((canvas) => ({
      ...canvas,
      label: normalizeLanguageString(canvas.label),
      manifests: canvas.manifests.map((manifest) => ({
        ...manifest,
        label: normalizeLanguageString(manifest.label)
      }))
    }))
  }
}

function normalizeLanguageString(
  label: LanguageString | string | null
): LanguageString | null {
  if (typeof label === 'string') {
    return {
      none: [label]
    }
  }

  return label
}
