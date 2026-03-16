import {
  integer,
  doublePrecision,
  pgTable,
  pgView,
  jsonb,
  text,
  boolean,
  // geometry,
  customType,
  primaryKey,
  index
} from 'drizzle-orm/pg-core'

import { eq, sql, defineRelationsPart, type SQL } from 'drizzle-orm'

import { createTimestamp } from '../shared.js'

import { images } from './iiif.js'

import type { DbMap } from '../types.js'

// type Coordinate = [number, number];

// interface GeoJson {
//   type: string;
//   coordinates: Coordinate[][];
// }

// const polygon = customType<{ data: string; driverData: string }>({
//   dataType() {
//     return 'geometry(Polygon, 4326)'
//   }
// })

const polygon = (name: string, srid?: number) =>
  customType<{
    data: string
    driverData: string
    srid?: number
  }>({
    dataType() {
      if (srid) {
        return `geometry(Polygon, ${srid})`
      } else {
        return `geometry(Polygon)`
      }
    }
  })(name, srid)

export const maps = pgTable(
  'maps',
  {
    id: text('id').notNull(),
    imageId: text('image_id')
      .references(() => images.id)
      .notNull(),
    // Checksum for current version of map
    checksum: text('checksum').notNull(),
    // Checksum for current verions of all maps for entire image
    imageChecksum: text('image_checksum').notNull(),
    version: integer('version').notNull(),
    latest: boolean('latest').notNull().default(true),
    createdAt: createTimestamp('created_at'),
    updatedAt: createTimestamp('updated_at'),
    map: jsonb('data').notNull().$type<DbMap>(),
    // TODO: add GCPs?
    // resourceMask: geometry('resource_mask', {
    //   type: 'Polygon',
    //   mode: 'xy'
    // }),
    // geoMask: geometry('geo_mask', { type: 'Polygon', srid: 4326 }),
    resourceMask: polygon('resource_mask'),
    geoMask: polygon('geo_mask', 4326),

    // In square meters
    area: doublePrecision('area').generatedAlwaysAs(
      (): SQL =>
        sql`CASE WHEN ${maps.geoMask} IS NOT NULL THEN ST_Area(geography(${maps.geoMask})) ELSE NULL END`
    ),
    // In pixels per meter
    scale: doublePrecision('scale').generatedAlwaysAs(
      (): SQL =>
        sql`CASE WHEN ST_Area(geography(${maps.geoMask})) > 0 THEN sqrt(ST_Area(${maps.resourceMask}) / ST_Area(geography(${maps.geoMask}))) ELSE NULL END`
    )
  },
  (table) => [
    primaryKey({
      columns: [table.id, table.imageId, table.checksum, table.version]
    }),
    // TODO: improve indexes
    index().on(table.checksum),
    index().on(table.imageId),
    index().on(table.latest),
    index().on(table.updatedAt),
    index().using('GIST', table.geoMask)
  ]
)

// TODO: add constraint, map must have valid image

export const mapsLatest = pgView('maps_latest').as((qb) =>
  qb.select().from(maps).where(eq(maps.latest, true))
)

export const mapsRelationsPart = defineRelationsPart({ maps, images }, (r) => ({
  maps: {
    image: r.one.images({
      from: r.maps.imageId,
      to: r.images.id
    })
  }
}))
