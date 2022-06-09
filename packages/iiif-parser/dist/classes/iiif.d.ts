import { Image } from './image.js';
import { Manifest } from './manifest.js';
export declare class IIIF {
    static parse(iiifData: any): Image | Manifest;
}
