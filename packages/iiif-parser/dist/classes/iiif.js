import { IIIFSchema } from '../schemas/iiif.js';
import { Image } from './image.js';
import { Manifest } from './manifest.js';
export class IIIF {
    static parse(iiifData) {
        const parsedIiif = IIIFSchema.parse(iiifData);
        if ('protocol' in parsedIiif &&
            parsedIiif.protocol === 'http://iiif.io/api/image') {
            return new Image(parsedIiif);
        }
        else if (('@type' in parsedIiif && parsedIiif['@type'] === 'sc:Manifest') ||
            ('type' in parsedIiif && parsedIiif.type === 'Manifest')) {
            return new Manifest(parsedIiif);
        }
        else {
            throw new Error('Unsupported IIIF type');
        }
    }
}
