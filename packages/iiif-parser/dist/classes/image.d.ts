import { z } from 'zod';
import { CanvasSchema } from '../schemas/iiif.js';
import { ImageSchema } from '../schemas/iiif.js';
import { Fit } from '../lib/thumbnails.js';
import { Size, ImageRequest, MajorVersion, TileZoomLevel } from '../lib/types.js';
declare type ImageType = z.infer<typeof ImageSchema>;
declare type CanvasType = z.infer<typeof CanvasSchema>;
declare type EmbeddedImageType = ImageType | CanvasType;
export declare class EmbeddedImage {
    embedded: boolean;
    uri: string;
    width: number;
    height: number;
    majorVersion: MajorVersion;
    constructor(parsedImageOrCanvas: EmbeddedImageType);
    getImageUrl({ region, size }: ImageRequest): string;
}
export declare class Image extends EmbeddedImage {
    supportsAnyRegionAndSize: boolean;
    maxWidth?: number;
    maxHeight?: number;
    maxArea?: number;
    tileZoomLevels: TileZoomLevel[];
    sizes?: Size[];
    constructor(parsedImage: ImageType);
    static parse(iiifData: any): Image;
    getIiifTile(zoomLevel: TileZoomLevel, column: number, row: number): ImageRequest;
    getThumbnail(size: Size, mode?: Fit): ImageRequest | ImageRequest[][];
}
export {};
