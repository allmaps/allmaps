import { ImageService2Schema } from './image-service.2.js';
import { ImageService3Schema } from './image-service.3.js';
export const ImageServiceSchema = ImageService2Schema.or(ImageService3Schema);
