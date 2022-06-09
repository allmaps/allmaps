import { ImageRequest, Size, TileZoomLevel } from './types.js';
export declare type Fit = 'cover' | 'contain';
export declare function getThumbnail(sizes: Size[] | undefined, tileZoomLevels: TileZoomLevel[], supportsAnyRegionAndSize: boolean, imageSize: Size, containerSize: Size, mode?: Fit): ImageRequest | ImageRequest[][];
