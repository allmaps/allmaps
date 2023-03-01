import type { EmbeddedImage } from '@allmaps/iiif-parser'

export function generateManifest(uri: string, images: EmbeddedImage[]) {
  return {
    id: uri,
    type: 'Manifest',
    items: images.map((image) => ({
      id: `${image.uri}/canvas`,
      type: 'Canvas',
      width: image.width,
      height: image.height,
      items: [
        {
          type: 'AnnotationPage',
          id: `${image.uri}/annotations`,
          items: [
            {
              type: 'Annotation',
              id: `${image.uri}/annotation`,
              motivation: 'painting',
              target: `${image.uri}/canvas`,
              body: {
                type: 'Image',
                id: image.uri,
                format: 'image/tiff',
                width: image.width,
                height: image.height,
                service: [
                  {
                    id: image.uri,
                    // TODO: get from image
                    profile: 'level2',
                    // TODO: get from image
                    type: 'ImageService2'
                  }
                ]
              }
            }
          ]
        }
      ]
    }))
  }
}
