import {
  MapSchema as Map1Schema,
  MapsSchema as Maps1Schema,
  GCPSchema as Map1GCPSchema,
  ImageSchema as Map1ImageSchema
} from './map/map.1.js'
import {
  MapSchema as Map2Schema,
  MapsSchema as Maps2Schema,
  GCPSchema as Map2GCPSchema,
  ResourceSchema as Map2ResourceSchema
} from './map/map.2.js'
import {
  PartOfSchema,
  ResourceMaskSchema,
  TransformationSchema
} from './shared.js'

const DefaultMapSchema = Map2Schema
const DefaultMapsSchema = Maps2Schema

const DefaultGCPSchema = Map2GCPSchema
const DefaultResourceSchema = Map2ResourceSchema

const MapAllVersionsSchema = Map1Schema.or(Map2Schema)
const MapsAllVersionsSchema = Maps1Schema.or(Maps2Schema)

const GCPAllVersionsSchema = Map1GCPSchema.or(Map2GCPSchema)

export {
  Map1Schema,
  Maps1Schema,
  Map1GCPSchema,
  Map1ImageSchema,
  Map2Schema,
  Maps2Schema,
  Map2GCPSchema,
  Map2ResourceSchema,

  // Default schemas
  DefaultMapSchema as MapSchema,
  DefaultMapsSchema as MapsSchema,
  DefaultGCPSchema as GCPSchema,
  DefaultResourceSchema as ResourceSchema,

  // All versions
  MapAllVersionsSchema,
  MapsAllVersionsSchema,
  GCPAllVersionsSchema,

  // Shared schemas
  PartOfSchema,
  ResourceMaskSchema,
  TransformationSchema
}
