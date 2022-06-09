import { z } from 'zod';
import { ManifestSchema } from '../schemas/iiif.js';
import { Image, EmbeddedImage } from './image.js';
declare type ManifestType = z.infer<typeof ManifestSchema>;
declare type FetchFunction = (url: string) => Promise<any>;
declare type MajorVersion = 2 | 3;
declare type ManifestImage = EmbeddedImage | Image;
export declare class FetchedEvent extends Event {
    image: Image;
    constructor(image: Image);
}
export declare class Manifest extends EventTarget {
    uri: string;
    majorVersion: MajorVersion;
    images: ManifestImage[];
    label?: any;
    constructor(parsedManifest: ManifestType);
    static parse(iiifData: any): Manifest;
    fetchNextImages(fetch: FetchFunction): AsyncGenerator<Image, void, unknown>;
    fetchNextImages2(fetch: FetchFunction): Promise<void>;
}
export {};
