import {
  text,
  integer,
  boolean,
  foreignKey,
  pgTable,
  check,
  uniqueIndex
} from 'drizzle-orm/pg-core'

import { sql, defineRelationsPart } from 'drizzle-orm'

import { createTimestamp } from '../shared.js'

import { images, canvases, manifests } from './iiif.js'
import { maps } from './maps.js'
import { users } from './auth.js'

export const lists = pgTable('lists', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  deletable: boolean('deletable').notNull().default(true),
  createdAt: createTimestamp('created_at'),
  updatedAt: createTimestamp('updated_at')
})

export const listItems = pgTable(
  'list_items',
  {
    listId: text('list_id')
      .notNull()
      .references(() => lists.id),
    mapId: text('map_id'),
    mapImageId: text('map_image_id'),
    mapChecksum: text('map_checksum'),
    mapVersion: integer('map_version'),
    imageId: text('image_id').references(() => images.id),
    canvasId: text('canvas_id').references(() => canvases.id),
    manifestId: text('manifest_id').references(() => manifests.id),
    createdAt: createTimestamp('created_at')
  },
  (table) => [
    uniqueIndex('list_items_list_map_uidx')
      .on(
        table.listId,
        table.mapId,
        table.mapImageId,
        table.mapChecksum,
        table.mapVersion
      )
      .where(sql`${table.mapId} IS NOT NULL`),
    uniqueIndex('list_items_list_image_uidx')
      .on(table.listId, table.imageId)
      .where(sql`${table.imageId} IS NOT NULL`),
    uniqueIndex('list_items_list_canvas_uidx')
      .on(table.listId, table.canvasId)
      .where(sql`${table.canvasId} IS NOT NULL`),
    uniqueIndex('list_items_list_manifest_uidx')
      .on(table.listId, table.manifestId)
      .where(sql`${table.manifestId} IS NOT NULL`),
    foreignKey({
      columns: [
        table.mapId,
        table.mapImageId,
        table.mapChecksum,
        table.mapVersion
      ],
      foreignColumns: [maps.id, maps.imageId, maps.checksum, maps.version]
    }),
    check(
      'single_foreign_key',
      sql`
      (
        num_nonnulls(${table.imageId}, ${table.canvasId}, ${table.manifestId}) = 1
        AND
        ${table.mapId} IS NULL AND ${table.mapVersion} IS NULL AND ${table.mapImageId} IS NULL AND ${table.mapChecksum} IS NULL
      ) OR (
        num_nonnulls(${table.imageId}, ${table.canvasId}, ${table.manifestId}) = 0
        AND
        ${table.mapId} IS NOT NULL AND ${table.mapVersion} IS NOT NULL AND ${table.mapImageId} IS NOT NULL AND ${table.mapChecksum} IS NOT NULL
      )`
    )
  ]
)

export const listsRelationsPart = defineRelationsPart(
  { lists, listItems, users, images, canvases, manifests },
  (r) => ({
    lists: {
      listItems: r.many.listItems({
        from: r.lists.id,
        to: r.listItems.listId
      }),
      user: r.one.users({
        from: r.lists.userId,
        to: r.users.id
      })
    },
    listItems: {
      list: r.one.lists({
        from: r.listItems.listId,
        to: r.lists.id
      }),
      image: r.one.images({
        from: r.listItems.imageId,
        to: r.images.id
      }),
      canvas: r.one.canvases({
        from: r.listItems.canvasId,
        to: r.canvases.id
      }),
      manifest: r.one.manifests({
        from: r.listItems.manifestId,
        to: r.manifests.id
      })
    }
  })
)
