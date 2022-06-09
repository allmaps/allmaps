import { ManifestSchema } from '../schemas/iiif.js';
import { Image, EmbeddedImage } from './image.js';
export class FetchedEvent extends Event {
    constructor(image) {
        super('fetched');
        this.image = image;
    }
}
export class Manifest extends EventTarget {
    // TODO: add label, metadata, description
    constructor(parsedManifest) {
        super();
        this.images = [];
        if ('@type' in parsedManifest) {
            // IIIF Presentation API 2.0
            this.uri = parsedManifest['@id'];
            this.majorVersion = 2;
            const canvases = parsedManifest.sequences[0].canvases;
            this.images = canvases.map((canvas) => new EmbeddedImage(canvas));
        }
        else if ('type' in parsedManifest) {
            // IIIF Presentation API 3.0
            this.uri = parsedManifest.id;
            this.majorVersion = 3;
            this.label = parsedManifest.label;
            const canvases = parsedManifest.items;
            this.images = canvases.map((canvas) => new EmbeddedImage(canvas));
        }
        else {
            throw new Error('Unsupported Manifest');
        }
    }
    static parse(iiifData) {
        const parsedManifest = ManifestSchema.parse(iiifData);
        return new Manifest(parsedManifest);
    }
    // const options = {
    //   maxDepth: 2,
    //   maxItems: 10,
    //   images: true,
    //   manifests: true,
    //   collections: false
    // }
    async *fetchNextImages(fetch
    // options: FetchNextOptions = { maxDepth: 2, maxItems: 10 }
    ) {
        for (const imageIndex in this.images) {
            const image = this.images[imageIndex];
            if (image instanceof EmbeddedImage) {
                const url = `${image.uri}/info.json`;
                const iiifData = await fetch(url);
                const newImage = Image.parse(iiifData);
                this.images[imageIndex] = newImage;
                yield newImage;
            }
        }
    }
    async fetchNextImages2(fetch
    // options: FetchNextOptions = { maxDepth: 2, maxItems: 10 }
    ) {
        for (const imageIndex in this.images) {
            const image = this.images[imageIndex];
            if (image instanceof EmbeddedImage) {
                const url = `${image.uri}/info.json`;
                const iiifData = await fetch(url);
                const newImage = Image.parse(iiifData);
                this.images[imageIndex] = newImage;
                const event = new FetchedEvent(newImage);
                this.dispatchEvent(event);
            }
        }
    }
}
