import type { EmbeddedImage } from '@allmaps/iiif-parser'

function generateImageService(image: EmbeddedImage) {
  const profile = image.supportsAnyRegionAndSize ? 'level1' : 'level0'
  const type = `ImageService${image.majorVersion}`

  return {
    id: image.uri,
    profile,
    type
  }
}

export function generateManifest(id: string, images: EmbeddedImage[]) {
  return {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id,
    type: 'Manifest',
    items: images.map((image, index) => ({
      id: `${id}/canvases/${index}`,
      type: 'Canvas',
      width: image.width,
      height: image.height,
      items: [
        {
          type: 'AnnotationPage',
          id: `${id}/canvases/${index}/annotation-page`,
          items: [
            {
              type: 'Annotation',
              id: `${id}/canvases/${index}/annotation`,
              motivation: 'painting',
              target: `${id}/canvases/${index}`,
              body: {
                type: 'Image',
                id: image.uri,
                width: image.width,
                height: image.height,
                service: [generateImageService(image)]
              }
            }
          ]
        }
      ]
    }))
  }
}
