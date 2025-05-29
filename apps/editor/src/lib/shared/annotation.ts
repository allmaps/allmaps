import { computeBbox } from '@allmaps/stdlib'
import { parseAnnotation, generateAnnotation } from '@allmaps/annotation'
import { GcpTransformer } from '@allmaps/transform'

import type { Annotation, AnnotationPage } from '@allmaps/annotation'

export function makeFakeStraightAnnotation(
  imageUri: string,
  width: number,
  height: number
) {
  const offsetLng = 0.01
  const offsetLat = 0

  const georeferencedMap = [
    {
      '@context': 'https://schemas.allmaps.org/map/2/context.json',
      type: 'GeoreferencedMap',
      resource: {
        id: imageUri,
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
          geo: [offsetLng, offsetLat + height / 10_000]
        },
        {
          resource: [width, 0],
          geo: [offsetLng + width / 10_000, offsetLat + height / 10_000]
        },
        {
          resource: [width, height],
          geo: [offsetLng + width / 10_000, offsetLat]
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
