import { Size, ImageRequest, Tileset, TileZoomLevel } from './types.js';
export declare function getIiifTile({ width: imageWidth, height: imageHeight }: Size, zoomLevel: TileZoomLevel, column: number, row: number): ImageRequest;
export declare function getTileZoomLevels(imageSize: Size, tilesets: Tileset[] | undefined, supportsAnyRegionAndSize: boolean): TileZoomLevel[];
