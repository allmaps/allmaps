import { generateAnnotation } from '@allmaps/annotation'

export function makeFakeStraightAnnotation(
  imageUri: string,
  width: number,
  height: number
) {
  const scale = 10_000
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
      gcps: [
        {
          resource: [0, 0],
          geo: [0, height / scale]
        },
        {
          resource: [width, 0],
          geo: [width / scale, height / scale]
        },
        {
          resource: [width, height],
          geo: [width / scale, 0]
        }
      ]
    }
  ]

  return generateAnnotation(georeferencedMap)
}
