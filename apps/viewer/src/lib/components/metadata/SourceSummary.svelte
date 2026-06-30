<script lang="ts">
  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Manifest } from '@allmaps/iiif-parser'

  import { getErrorsState } from '$lib/state/errors.svelte.js'

  import type { SourceInfoWarningDetail } from '$lib/state/errors.svelte.js'
  import type { Source } from '$lib/types/shared.js'

  type Props = {
    source: Source
  }

  type SummaryDetail = {
    text: string
    tone?: 'error'
  }

  type Summary = {
    sentence: string
    details: SummaryDetail[]
  }

  let { source }: Props = $props()

  const errorsState = getErrorsState()

  let summary = $derived.by(() =>
    getSourceSummary(
      source,
      errorsState.sourceInfoWarningDetails,
      errorsState.sourceImageCount
    )
  )

  function pluralize(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`
  }

  function countDistinctImages(maps: GeoreferencedMap[]) {
    return new Set(maps.map((map) => map.resource.id)).size
  }

  function getIiifResourceLabel(type: string) {
    if (type === 'manifest') {
      return 'IIIF Manifest'
    } else if (type === 'collection') {
      return 'IIIF Collection'
    } else if (type === 'image') {
      return 'IIIF Image API service'
    }

    return 'IIIF resource'
  }

  function compactDetails(details: Array<SummaryDetail | undefined>) {
    return details.filter((detail) => detail !== undefined)
  }

  function countIiifImages(source: Source, sourceImageCount?: number) {
    if (source.parsed.type !== 'iiif') {
      return 0
    }

    const iiif = source.parsed.iiif

    if (iiif.type === 'image') {
      return 1
    }

    const iiifImageCount = iiif.images.length

    if (iiifImageCount > 0) {
      return iiifImageCount
    }

    return sourceImageCount ?? 0
  }

  function getManifestAnnotationPlacement(manifest: Manifest) {
    let hasEmbeddedAnnotations = false
    let hasLinkedAnnotations = false

    for (const canvas of manifest.canvases) {
      for (const annotationPage of canvas.annotations ?? []) {
        if (annotationPage.items) {
          hasEmbeddedAnnotations = true
        } else if (annotationPage.id) {
          hasLinkedAnnotations = true
        }
      }
    }

    if (hasEmbeddedAnnotations && hasLinkedAnnotations) {
      return 'embedded and linked Georeference Annotations'
    } else if (hasEmbeddedAnnotations) {
      return 'embedded Georeference Annotations'
    } else if (hasLinkedAnnotations) {
      return 'linked Georeference Annotations'
    }

    return 'Georeference Annotations'
  }

  function getAnnotationSummary(
    source: Source,
    warningDetails: SourceInfoWarningDetail[]
  ): Summary {
    if (source.parsed.type !== 'annotation') {
      throw new Error('Expected annotation source')
    }

    const maps = source.parsed.maps

    return {
      sentence: `Viewing ${pluralize(maps.length, 'map')} from ${pluralize(
        1,
        'Georeference Annotation'
      )}`,
      details: warningDetails
    }
  }

  function getIiifSummary(
    source: Source,
    warningDetails: SourceInfoWarningDetail[],
    sourceImageCount: number
  ): Summary {
    if (source.parsed.type !== 'iiif') {
      throw new Error('Expected IIIF source')
    }

    const { iiif } = source.parsed
    const embeddedMaps = source.parsed.embeddedMaps ?? []
    const apiMaps = source.parsed.apiMaps ?? []
    const maps = [...embeddedMaps, ...apiMaps]
    const imageCount = countIiifImages(source, sourceImageCount)
    const resourceLabel = getIiifResourceLabel(iiif.type)

    if (embeddedMaps.length > 0 && apiMaps.length === 0) {
      const annotationPlacement =
        iiif.type === 'manifest'
          ? getManifestAnnotationPlacement(iiif)
          : 'Georeference Annotations'

      return {
        sentence: `Viewing ${pluralize(
          embeddedMaps.length,
          'map'
        )} from ${annotationPlacement} in ${pluralize(1, resourceLabel)}`,
        details: warningDetails
      }
    }

    if (apiMaps.length > 0 && embeddedMaps.length === 0) {
      const apiImageCount = countDistinctImages(apiMaps)
      const allmapsFoundTarget =
        imageCount > 1 && apiImageCount === imageCount
          ? `all ${pluralize(imageCount, 'image')}`
          : pluralize(apiImageCount, 'image')

      return {
        sentence: `Viewing ${pluralize(
          apiMaps.length,
          'map'
        )} found by Allmaps for ${allmapsFoundTarget} in ${pluralize(
          1,
          resourceLabel
        )}`,
        details: warningDetails
      }
    }

    if (maps.length > 0) {
      return {
        sentence: `Viewing ${pluralize(maps.length, 'map')} from ${pluralize(
          1,
          resourceLabel
        )}`,
        details: compactDetails([
          embeddedMaps.length > 0
            ? {
                text: `${pluralize(
                  embeddedMaps.length,
                  'map'
                )} came from Georeference Annotations in the source.`
              }
            : undefined,
          apiMaps.length > 0
            ? {
                text: `Allmaps found ${pluralize(apiMaps.length, 'map')}.`
              }
            : undefined,
          ...warningDetails
        ])
      }
    }

    return {
      sentence: `No georeferenced maps found in ${pluralize(1, resourceLabel)}`,
      details: warningDetails
    }
  }

  function getSourceSummary(
    source: Source,
    warningDetails: SourceInfoWarningDetail[],
    sourceImageCount: number
  ) {
    if (source.parsed.type === 'annotation') {
      return getAnnotationSummary(source, warningDetails)
    }

    return getIiifSummary(source, warningDetails, sourceImageCount)
  }
</script>

{#snippet summaryDetail(detail: SummaryDetail)}
  <p
    class="inline-flex rounded-full bg-red/10 px-2 py-0.5 font-medium text-red"
  >
    {detail.text}
  </p>
{/snippet}

<section
  class="p-1 flex items-center flex-wrap justify-center gap-2 text-xs leading-snug text-gray-700"
>
  <span class="bg-green/10 text-green font-medium px-2 py-0.5 rounded-full"
    >{summary.sentence}</span
  >

  {#if summary.details.length > 0}
    {#each summary.details as detail (detail.text)}
      {@render summaryDetail(detail)}
    {/each}
  {/if}
</section>
