import { ImageService2Schema } from './image-service.2.js'
import { ImageService3Schema } from './image-service.3.js'

// TODO: it seems we don't need ImageServiceSchema, we can use Image.2.ts and Image.3.ts instead
export const ImageServiceSchema = ImageService2Schema.or(ImageService3Schema)
