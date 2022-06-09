import { z } from 'zod';
export const ImageService3Schema = z.object({
    id: z.string().url(),
    width: z.number().int(),
    height: z.number().int()
    // "profile": "http://iiif.io/api/image/2/level1.json",
});
