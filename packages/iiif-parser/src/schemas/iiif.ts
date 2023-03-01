import { Image1Schema } from './image.1.js'
import { Image2Schema } from './image.2.js'
import { Image3Schema } from './image.3.js'

import {
  Canvas2Schema,
  Manifest2Schema,
  Collection2Schema
} from './presentation.2.js'

import {
  Canvas3Schema,
  Manifest3Schema,
  Collection3Schema
} from './presentation.3.js'

export { Image1Schema, Image2Schema, Image3Schema }
export { Canvas2Schema, Canvas3Schema }
export { Manifest2Schema, Manifest3Schema }
export { Collection2Schema, Collection3Schema }

export const ImageSchema = Image1Schema.or(Image2Schema).or(Image3Schema)
export const CanvasSchema = Canvas2Schema.or(Canvas3Schema)
export const ManifestSchema = Manifest2Schema.or(Manifest3Schema)
export const CollectionSchema = Collection2Schema.or(Collection3Schema)

export const IIIF2Schema = Manifest2Schema.or(Image2Schema)
export const IIIF3Schema = Manifest3Schema.or(Image3Schema)
export const IIIFSchema = ManifestSchema.or(ImageSchema)
