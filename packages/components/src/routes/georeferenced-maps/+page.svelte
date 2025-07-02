<script lang="ts">
  import GeoreferencedMaps from '$lib/components/GeoreferencedMaps.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  const georeferencedMap: GeoreferencedMap = {
    '@context': 'https://schemas.allmaps.org/map/2/context.json',
    type: 'GeoreferencedMap',
    id: 'https://annotations.allmaps.org/maps/83d44a0b956681b0',
    created: '2025-04-14T07:51:38.539Z',
    modified: '2025-04-14T07:51:38.539Z',
    resource: {
      id: 'https://dlc.services/iiif-img/7/4/32a1daa1-6ff5-46a4-a0a2-ae94ef3a92fa',
      height: 3949,
      width: 5208,
      type: 'ImageService2',
      partOf: [
        {
          id: 'https://dlc.services/iiif-query/7/?canvas=n2&manifest=s1&sequence=n1&s1=kaartenproject&n1=&n2=581',
          type: 'Canvas',
          partOf: [
            {
              id: 'https://dlc.services/iiif-resource/7/string1string2string3/kaartenproject/TRL-11.4.1.14',
              type: 'Manifest'
            }
          ]
        },
        {
          id: 'https://dlc.services/iiif-img/7/4/32a1daa1-6ff5-46a4-a0a2-ae94ef3a92fa/canvas/c/3',
          type: 'Canvas',
          label: { none: ['Canvas 3'] },
          partOf: [
            {
              id: 'https://dlc.services/iiif-resource/7/string1string2string3/kaartenproject/TRL-11.4.1.14',
              type: 'Manifest'
            }
          ]
        }
      ]
    },
    gcps: [
      { resource: [4346, 2550], geo: [4.9405887, 52.3579862] },
      { resource: [2243, 1837], geo: [4.9560178, 52.3571296] },
      { resource: [3823, 1010], geo: [4.9470578, 52.3519005] }
    ],
    resourceMask: [
      [512, 299],
      [486, 3644],
      [4811, 3656],
      [4779, 261]
    ],
    transformation: { type: 'polynomial', options: { order: 1 } }
  }
</script>

<div class="absolute w-full h-full flex flex-col">
  <GeoreferencedMaps georeferencedMaps={[georeferencedMap]} />
</div>
