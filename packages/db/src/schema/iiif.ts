import {
  integer,
  pgSchema,
  jsonb,
  text,
  boolean,
  primaryKey,
  index,
  type PgColumn
} from 'drizzle-orm/pg-core'

import { defineRelationsPart } from 'drizzle-orm'

import { organizationUrls } from './organizations.js'

import { createTimestamp, createGeneratedDomain } from '../shared.js'

import type { LanguageString } from '@allmaps/iiif-parser'

// =================================================================================================
// IIIF schema
// =================================================================================================

export const iiifSchema = pgSchema('iiif')

export const images = iiifSchema.table(
  'images',
  {
    id: text('id').notNull().primaryKey(),
    uri: text('uri').notNull(),
    domain: createGeneratedDomain((): PgColumn => images.uri),
    width: integer('width'),
    height: integer('height'),
    data: jsonb('data'),
    embedded: boolean('embedded').notNull().default(true),
    checksum: text('checksum'),
    createdAt: createTimestamp('created_at'),
    updatedAt: createTimestamp('updated_at')
  },
  (table) => [index().on(table.domain)]
)

export const canvases = iiifSchema.table('canvases', {
  id: text('id').notNull().primaryKey(),
  uri: text('uri').notNull(),
  label: jsonb('label').$type<LanguageString>(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  createdAt: createTimestamp('created_at'),
  updatedAt: createTimestamp('updated_at')
})

export const manifests = iiifSchema.table(
  'manifests',
  {
    id: text('id').notNull().primaryKey(),
    uri: text('uri').notNull(),
    domain: createGeneratedDomain((): PgColumn => manifests.uri),
    label: jsonb('label').$type<LanguageString>(),
    data: jsonb('data'),
    checksum: text('checksum'),
    createdAt: createTimestamp('created_at'),
    updatedAt: createTimestamp('updated_at')
  },
  (table) => [index().on(table.domain)]
)

export const canvasesToImages = iiifSchema.table(
  'canvases_images',
  {
    canvasId: text('canvas_id')
      .notNull()
      .references(() => canvases.id),
    imageId: text('image_id')
      .notNull()
      .references(() => images.id)
  },
  (table) => [
    primaryKey({ columns: [table.canvasId, table.imageId] }),
    index('canvas_to_images_canvas_id_idx').on(table.canvasId),
    index('canvas_to_images_image_id_idx').on(table.imageId),
    index('canvas_to_images_composite_idx').on(table.canvasId, table.imageId)
  ]
)

export const manifestsToCanvases = iiifSchema.table(
  'manifests_canvases',
  {
    manifestId: text('manifest_id')
      .notNull()
      .references(() => manifests.id),
    canvasId: text('canvas_id')
      .notNull()
      .references(() => canvases.id)
  },
  (table) => [
    primaryKey({ columns: [table.manifestId, table.canvasId] }),
    index('manifests_to_canvases_manifest_id_idx').on(table.manifestId),
    index('manifests_to_canvases_canvas_id_idx').on(table.canvasId),
    index('manifests_to_canvases_composite_idx').on(
      table.manifestId,
      table.canvasId
    )
  ]
)

// Manifests and canvases have a many-to-many relationship
// Canvases and images have a many-to-many relationship

export const iiifRelationsPart = defineRelationsPart(
  {
    images,
    canvases,
    manifests,
    canvasesToImages,
    manifestsToCanvases,
    organizationUrls
  },
  (r) => ({
    images: {
      canvases: r.many.canvases({
        from: r.images.id.through(r.canvasesToImages.imageId),
        to: r.canvases.id.through(r.canvasesToImages.canvasId)
      }),
      organizationUrl: r.one.organizationUrls({
        from: r.images.domain,
        to: r.organizationUrls.url,
        where: {
          type: 'domain'
        }
      })
    },
    canvases: {
      manifests: r.many.manifests({
        from: r.canvases.id.through(r.manifestsToCanvases.canvasId),
        to: r.manifests.id.through(r.manifestsToCanvases.manifestId)
      }),
      participants: r.many.images()
    },
    manifests: {
      participants: r.many.canvases()
    }
  })
)

// images: r.many.images({

// manifests
// groups: {
//   participants: r.many.users(),
// },
// }
// ));

// export const iiifRelationsPart = defineRelationsPart(
//   { images, canvases, manifests, canvasesToImages, manifestsToCanvases },
//   (r) => ({
//     images: {
//       canvases: r.many.canvases({
//         from: r.images.id.through(r.canvasesToImages.imageId),
//         to: r.canvases.id.through(r.canvasesToImages.canvasId)
//       })
//     },
//     canvases: {
//       images: r.many.images({
//         from: r.canvases.id.through(r.canvasesToImages.canvasId),
//         to: r.images.id.through(r.canvasesToImages.imageId)
//       }),
//       manifests: r.many.manifests({
//         from: r.canvases.id.through(r.manifestsToCanvases.canvasId),
//         to: r.manifests.id.through(r.manifestsToCanvases.manifestId)
//       })
//     },
//     manifests: {
//       canvases: r.many.canvases({
//         from: r.manifests.id.through(r.manifestsToCanvases.manifestId),
//         to: r.canvases.id.through(r.manifestsToCanvases.canvasId)
//       })
//     }
//   })
// )
