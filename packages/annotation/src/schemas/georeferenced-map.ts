import { z } from 'zod'

import {
  GeoreferencedMapSchema as GeoreferencedMap1Schema,
  GeoreferencedMapsSchema as GeoreferencedMaps1Schema,
  GCPSchema as GeoreferencedMap1GCPSchema,
  ImageSchema as GeoreferencedMap1ImageSchema
} from './georeferenced-map/georeferenced-map.1.js'
import {
  GeoreferencedMapSchema as GeoreferencedMap2Schema,
  GeoreferencedMapsSchema as GeoreferencedMaps2Schema,
  GCPSchema as GeoreferencedMap2GCPSchema,
  ResourceSchema as GeoreferencedMap2ResourceSchema
} from './georeferenced-map/georeferenced-map.2.js'
import {
  PartOfSchema,
  ResourceMaskSchema,
  TransformationSchema
} from './shared.js'

const DefaultGeoreferencedMapSchema = GeoreferencedMap2Schema
const DefaultGeoreferencedMapsSchema = GeoreferencedMaps2Schema

const DefaultGCPSchema = GeoreferencedMap2GCPSchema
const DefaultResourceSchema = GeoreferencedMap2ResourceSchema

const GeoreferencedMapAllVersionsSchema = z.union([
  GeoreferencedMap1Schema,
  GeoreferencedMap2Schema
])
const GeoreferencedMapsAllVersionsSchema = z.union([
  GeoreferencedMaps1Schema,
  GeoreferencedMaps2Schema
])

const GCPAllVersionsSchema = z.union([
  GeoreferencedMap1GCPSchema,
  GeoreferencedMap2GCPSchema
])

export {
  GeoreferencedMap1Schema,
  GeoreferencedMaps1Schema,
  GeoreferencedMap1GCPSchema,
  GeoreferencedMap1ImageSchema,
  GeoreferencedMap2Schema,
  GeoreferencedMaps2Schema,
  GeoreferencedMap2GCPSchema,
  GeoreferencedMap2ResourceSchema,

  // Default schemas
  DefaultGeoreferencedMapSchema as GeoreferencedMapSchema,
  DefaultGeoreferencedMapsSchema as GeoreferencedMapsSchema,
  DefaultGCPSchema as GCPSchema,
  DefaultResourceSchema as ResourceSchema,

  // All versions
  GeoreferencedMapAllVersionsSchema,
  GeoreferencedMapsAllVersionsSchema,
  GCPAllVersionsSchema,

  // Shared schemas
  PartOfSchema,
  ResourceMaskSchema,
  TransformationSchema
}
