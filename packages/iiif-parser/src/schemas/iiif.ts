import { z } from 'zod'

import { Image1Schema } from './image.1.js'
import { Image2Schema } from './image.2.js'
import { Image3Schema } from './image.3.js'

import {
  Canvas2Schema,
  Manifest2Schema,
  Collection2Schema,
  EmbeddedCollection2Schema
} from './presentation.2.js'

import {
  Canvas3Schema,
  Manifest3Schema,
  Collection3Schema,
  EmbeddedCollection3Schema
} from './presentation.3.js'

export { Image1Schema, Image2Schema, Image3Schema }
export { Canvas2Schema, Canvas3Schema }
export { Manifest2Schema, Manifest3Schema }
export { Collection2Schema, Collection3Schema }

export const ImageSchema = z.union([Image1Schema, Image2Schema, Image3Schema])
export const CanvasSchema = z.union([Canvas2Schema, Canvas3Schema])
export const ManifestSchema = z.union([Manifest2Schema, Manifest3Schema])
export const CollectionSchema = z.union([
  Collection2Schema,
  EmbeddedCollection2Schema,
  Collection3Schema,
  EmbeddedCollection3Schema
])

export const IIIF1Schema = Image1Schema
export const IIIF2Schema = z.union([
  Collection2Schema,
  Manifest2Schema,
  Canvas2Schema,
  Image2Schema
])
export const IIIF3Schema = z.union([
  Collection3Schema,
  Manifest3Schema,
  Canvas3Schema,
  Image3Schema
])
export const IIIFSchema = z.union([IIIF1Schema, IIIF2Schema, IIIF3Schema])
