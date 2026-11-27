import { t } from 'elysia'

const coordinateQuery = t.Optional(
  t.Union([t.String(), t.Array(t.String())], {
    description:
      'Latitude, longitude pairs as comma-separated values or repeated parameters'
  })
)

export const mapsQuerySchema = t.Object({
  limit: t.Optional(t.Number()),
  imageServiceDomain: t.Optional(t.String()),
  manifestDomain: t.Optional(t.String()),
  intersects: coordinateQuery,
  containedBy: coordinateQuery,
  minScale: t.Optional(t.Number()),
  maxScale: t.Optional(t.Number()),
  minArea: t.Optional(t.Number()),
  maxArea: t.Optional(t.Number()),
  modifiedAfter: t.Optional(t.String()),
  modifiedBefore: t.Optional(t.String())
})
