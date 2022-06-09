import { z } from 'zod';
import { ImageSchema } from '../schemas/iiif.js';
import { ProfileProperties } from '../lib/types.js';
declare type ImageType = z.infer<typeof ImageSchema>;
export declare function getProfileProperties(parsedImage: ImageType): ProfileProperties;
export {};
