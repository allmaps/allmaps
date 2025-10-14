import { computeBbox } from '@allmaps/stdlib'
import { parseAnnotation, generateAnnotation } from '@allmaps/annotation'
import { GcpTransformer } from '@allmaps/transform'

import type { Annotation, AnnotationPage } from '@allmaps/annotation'

export function generateFakeStraightAnnotation(
  imageId: string,
  width: number,
  height: number
) {
  const georeferencedMap = [
    {
      id: imageId,
      '@context': 'https://schemas.allmaps.org/map/2/context.json',
      type: 'GeoreferencedMap',
      resource: {
        id: imageId,
        width,
        height,
        type: 'ImageService2'
      },
      resourceMask: [
        [0, 0],
        [0, height],
        [width, height],
        [width, 0]
      ],
      transformation: { type: 'straight' },
      gcps: [
        {
          resource: [0, 0],
          geo: [0, height / 10_000]
        },
        {
          resource: [width, 0],
          geo: [width / 10_000, height / 10_000]
        },
        {
          resource: [width, height],
          geo: [width / 10_000, 0]
        }
      ]
    }
  ]

  return generateAnnotation(georeferencedMap)
}
export function computeTransformedAnnotationBbox(
  annotation: Annotation | AnnotationPage
) {
  const maps = parseAnnotation(annotation)
  const map = maps[0]

  const transformer = new GcpTransformer(map.gcps, map.transformation?.type)

  const geoMask = transformer.transformToGeo([map.resourceMask])
  return computeBbox(geoMask)
}
