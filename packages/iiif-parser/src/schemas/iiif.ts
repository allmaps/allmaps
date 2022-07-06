import { Image2Schema } from './image.2.js'
import { Image3Schema } from './image.3.js'
import { Canvas2Schema, Manifest2Schema } from './presentation.2.js'
import { Canvas3Schema, Manifest3Schema } from './presentation.3.js'

export const CanvasSchema = Canvas2Schema.or(Canvas3Schema)
export const ManifestSchema = Manifest2Schema.or(Manifest3Schema)
export const ImageSchema = Image2Schema.or(Image3Schema)

export const IIIFSchema = ManifestSchema.or(ImageSchema)
