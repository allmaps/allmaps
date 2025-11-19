<script lang="ts">
  import { onMount } from 'svelte'

  import { parseAnnotation } from '@allmaps/annotation'
  import { computeBbox, bboxToSize } from '@allmaps/stdlib'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Size } from '@allmaps/types'

  let map = $state<GeoreferencedMap>()

  const svgWidth = 100

  type MaskedMapSource = {
    annotationUrl: string
    manifestId: string
    label: string
    institution: string
  }

  type MaskedMap = {
    imageUrl: string
    imageSize: Size
    size: Size
    translate: Size
    scale: number
    polygonPoints: string
  } & MaskedMapSource

  const maskedMapSources: MaskedMapSource[] = [
    {
      annotationUrl:
        'https://annotations.allmaps.org/maps/9db1d63140516b3a@a96eea591fe25495',
      manifestId:
        'https://ark.digitalcommonwealth.org/ark:/50959/dj530101x/manifest',
      label: 'Atlas of the city of Lynn, Massachusetts',
      institution:
        'Leventhal Map & Education Center at the Boston Public Library'
    },
    {
      annotationUrl:
        'https://annotations.allmaps.org/maps/e6063da500ea194a@d338b7b2a984fa33',
      manifestId:
        'https://digitalcollections.universiteitleiden.nl/iiif_manifest/item:3194734/manifest',
      label: 'Hizen Nagasaki no zu Ser. 360',
      institution: 'Leiden University Libraries'
    },
    {
      annotationUrl:
        'https://annotations.allmaps.org/maps/fb81263d704ae1c6@337455af5ca041dd',
      manifestId:
        'https://uvaerfgoed.nl/viewer/api/v1/records/11245_3_40100/manifest/',
      label: 'Plan tot uitbreiding van Amsterdam',
      institution: 'Universiteit van Amsterdam'
    }
  ]

  let maskedMaps = $state<MaskedMap[]>([])

  async function fetchMaskedMap(
    maskedMapSource: MaskedMapSource
  ): Promise<MaskedMap> {
    const { annotationUrl } = maskedMapSource

    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )

    const maps = parseAnnotation(annotation)
    map = maps[0]

    const imageId = map.resource.id
    const imageSize =
      map.resource.width && map.resource.height
        ? [map.resource.width, map.resource.height]
        : [map.resourceMask[2][0], map.resourceMask[2][1]]

    const bbox = computeBbox(map.resourceMask)
    const bboxSize = bboxToSize(bbox)

    const padding = 1
    const size: Size = [
      svgWidth + padding * 2,
      (svgWidth / bboxSize[0]) * bboxSize[1] + padding * 2
    ]
    const scale = svgWidth / bboxSize[0]

    const polygonPoints = map.resourceMask
      .map((point) => point.join(','))
      .join(' ')

    return {
      ...maskedMapSource,
      imageUrl: `${imageId}/full/1024,/0/default.jpg`,
      imageSize: imageSize as Size,
      translate: [-bbox[0] + padding / scale, -bbox[1] + padding / scale],
      scale: scale,
      size: size,
      polygonPoints: polygonPoints
    }
  }

  onMount(async () => {
    maskedMaps = await Promise.all(maskedMapSources.map(fetchMaskedMap))
  })
</script>

{#snippet renderMaskedMap(
  id: string,
  maskedMap: MaskedMap,
  strokeColor: string,
  textColor: string
)}
  {@const { size, translate, scale, polygonPoints, imageUrl, imageSize } =
    maskedMap}
  <svg
    class="w-full h-auto"
    xmlns="http://www.w3.org/2000/svg"
    viewBox={`0 0 ${size[0]} ${size[1]}`}
  >
    <g transform={`scale(${scale}) translate(${translate[0]}, ${translate[1]})`}
      ><a
        href="https://viewer.allmaps.org/?url={encodeURIComponent(
          maskedMap.annotationUrl
        )}"
        aria-label={`View ${maskedMap.label} in Allmaps Viewer`}
      >
        <image
          href={imageUrl}
          width={imageSize[0]}
          height={imageSize[1]}
          clip-path={`url(#clip${id})`}
        /></a
      >
      <clipPath id={`clip${id}`}>
        <polygon points={polygonPoints} />
      </clipPath>
      <polygon
        vector-effect="non-scaling-stroke"
        points={polygonPoints}
        class={[strokeColor, 'stroke-5 fill-none']}
      />
    </g>
  </svg>
  <p class={[textColor, 'text-sm text-right']}>
    <strong>{maskedMap.label}</strong>
  </p>
  <p class={[textColor, 'text-sm text-right']}>
    {maskedMap.institution}
  </p>
{/snippet}

<ol
  class="m-0 w-full h-full flex flex-col lg:grid lg:grid-rows-1 lg:grid-cols-3 print:grid print:grid-rows-1 print:grid-cols-3 list-none p-4 gap-4"
>
  <li
    class="p-4 md:p-6 lg:p-8 bg-yellow/5 rounded-xl grid grid-cols-1 sm:grid-cols-[2fr_1fr] lg:grid-cols-1 lg:grid-rows-[1fr_min-content] print:grid-cols-1 print:grid-rows-[1fr_min-content] gap-8"
  >
    <div class="flex flex-col gap-4">
      <h3 class="text-yellow text-4xl">Works with any IIIF map</h3>
      <p>
        Allmaps is an ecosystem for working with maps, plans and aerial photos.
        It offers tools to annotate such resources with geospatial information,
        and turns images into interactive map layers to overlay and compare.
      </p>
      <p>
        Allmaps is IIIF-first and does not require specific infrastructure or
        expertise to turn digitized images into interactive maps. The only
        requirement is a map collection that is availeble through the <a
          class="underline text-yellow"
          href="https://iiif.io/api/image/">IIIF Image API</a
        >, and, preferably, the
        <a
          class="underline text-yellow"
          href="https://iiif.io/api/presentation/">IIIF Presentation API</a
        >.
      </p>
    </div>
    <!-- place-self-end md:place-self-auto -->
    <div class="w-full justify-self-end">
      {#if maskedMaps[0]}
        {@render renderMaskedMap(
          'map0',
          maskedMaps[0],
          'stroke-yellow',
          'text-yellow'
        )}
      {/if}
    </div>
  </li>
  <li
    class="p-4 md:p-6 lg:p-8 bg-blue/5 rounded-xl grid grid-cols-1 sm:grid-cols-[1fr_2fr] lg:grid-cols-1 lg:grid-rows-[1fr_min-content] print:grid-cols-1 print:grid-rows-[1fr_min-content] gap-8"
  >
    <div class="flex flex-col gap-4">
      <h3 class="text-blue text-4xl">Open & light-weight</h3>
      <p>
        Georeferencing is the process of annotating images with geospatial
        information. Other than creating new versions of the image, Allmaps uses
        light-weight and <a
          class="underline text-blue"
          href="https://iiif.io/api/extension/georef/"
          >standardized Georeference Annotations</a
        > to annotate the original IIIF resource.
      </p>
      <p>
        All georeference data created with Allmaps is <a
          class="underline text-blue"
          href="https://allmaps.org/#open-data">published daily</a
        > as an openly licensed dataset. Its open source packages can be tailored
        to existing workflows and institutional requirements.
      </p>
    </div>
    <!-- place-self-end md:place-self-auto md:-order-1 print:-order-1 print:place-self-auto -->
    <div class="w-full justify-self-end sm:-order-1">
      {#if maskedMaps[1]}
        {@render renderMaskedMap(
          'map1',
          maskedMaps[1],
          'stroke-blue',
          'text-blue'
        )}
      {/if}
    </div>
  </li>
  <li
    class="p-4 md:p-6 lg:p-8 bg-orange/5 rounded-xl grid grid-cols-1 sm:grid-cols-[2fr_1fr] lg:grid-cols-1 lg:grid-rows-[1fr_min-content] print:grid-cols-1 print:grid-rows-[1fr_min-content] gap-8"
  >
    <div class="flex flex-col gap-4">
      <h3 class="text-orange text-4xl">Making maps accessible</h3>
      <p>
        Allmaps is a collaboration between <a
          class="underline text-orange"
          href="https://www.tudelft.nl/en/library"
          >Delft University of Technology Library</a
        >
        and independent developer and cartographer
        <a class="underline text-orange" href="https://bertspaan.nl"
          >Bert Spaan</a
        >. A legal entity is being established for its maintenance and further
        development, while preserving the commitment to open data and open
        source.
      </p>
      <p>
        The ultimate goal of Allmaps is to make all digitized maps accessible
        and to provide an interface for exploring IIIF maps across collections
        and institutions.
      </p>
    </div>
    <!-- place-self-end md:place-self-auto -->
    <div class="w-full justify-self-end">
      {#if maskedMaps[2]}
        {@render renderMaskedMap(
          'map2',
          maskedMaps[2],
          'stroke-orange',
          'text-orange'
        )}
      {/if}
    </div>
  </li>
</ol>
