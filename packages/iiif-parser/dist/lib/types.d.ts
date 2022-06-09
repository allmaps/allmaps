import { z } from 'zod';
import { TilesetSchema } from '../schemas/shared.js';
export declare type Tileset = z.infer<typeof TilesetSchema>;
export interface Region {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface Size {
    width: number;
    height: number;
}
export interface ImageRequest {
    region?: Region;
    size?: Size;
}
export declare type MajorVersion = 2 | 3;
export interface TileZoomLevel {
    scaleFactor: number;
    width: number;
    height: number;
    originalWidth: number;
    originalHeight: number;
    columns: number;
    rows: number;
}
export interface ProfileProperties {
    supportsAnyRegionAndSize: boolean;
    maxWidth?: number;
    maxHeight?: number;
    maxArea?: number;
}
