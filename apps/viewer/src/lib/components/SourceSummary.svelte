<script lang="ts">
  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Manifest } from '@allmaps/iiif-parser'

  import type { Source } from '$lib/types/shared.js'

  type ImageLoadSummary = {
    sourceImageCount: number
    imageErrorCount: number
  }

  type Props = {
    source: Source
    imageLoadSummary?: ImageLoadSummary
  }

  type JsonObject = Record<string, unknown>

  type Summary = {
    sentence: string
    details: string[]
  }

  let { source, imageLoadSummary }: Props = $props()

  let summary = $derived.by(() => getSourceSummary(source, imageLoadSummary))

  function isJsonObject(value: unknown): value is JsonObject {
    return !!value && typeof value === 'object' && !Array.isArray(value)
  }

  function pluralize(count: number, singular: string, plural = `${singular}s`) {
    return `${count} ${count === 1 ? singular : plural}`
  }

  function countDistinctImages(maps: GeoreferencedMap[]) {
    return new Set(maps.map((map) => map.resource.id)).size
  }

  function countOrganizations(maps: GeoreferencedMap[]) {
    const organizationLabels = new Set<string>()

    for (const map of maps) {
      const provider = map.resource.provider?.[0]

      if (provider?.label) {
        organizationLabels.add(JSON.stringify(provider.label))
      }
    }

    return organizationLabels.size
  }

  function getOrganizationClause(maps: GeoreferencedMap[]) {
    const organizationCount = countOrganizations(maps)

    if (organizationCount <= 1) {
      return ''
    }

    return `, from ${pluralize(organizationCount, 'organization')}`
  }

  function getOrganizationDetail(maps: GeoreferencedMap[]) {
    const organizationCount = countOrganizations(maps)

    if (organizationCount <= 1) {
      return
    }

    return `The maps are from ${pluralize(organizationCount, 'organization')}.`
  }

  function hasGeoreferencingValue(value: unknown): boolean {
    if (typeof value === 'string') {
      return value === 'georeferencing'
    } else if (Array.isArray(value)) {
      return value.some(hasGeoreferencingValue)
    }

    return false
  }

  function hasGeoreferencingPurpose(annotation: unknown): boolean {
    if (!isJsonObject(annotation)) {
      return false
    }

    return (
      hasGeoreferencingValue(annotation.motivation) ||
      hasGeoreferencingValue(annotation.purpose)
    )
  }

  function countAnnotationPageItems(annotationPage: unknown) {
    if (!isJsonObject(annotationPage)) {
      return
    }

    const items = annotationPage.items

    if (!Array.isArray(items)) {
      return
    }

    if (hasGeoreferencingPurpose(annotationPage)) {
      return items.length
    }

    return items.filter(hasGeoreferencingPurpose).length
  }

  function countSourceAnnotationItems(source: Source) {
    if (!isJsonObject(source.data)) {
      return
    }

    if (source.data.type === 'Annotation') {
      return 1
    }

    if (source.data.type === 'AnnotationPage') {
      return countAnnotationPageItems(source.data)
    }
  }

  function countManifestAnnotationItems(manifest: Manifest) {
    let count = 0

    for (const canvas of manifest.canvases) {
      for (const annotationPage of canvas.annotations ?? []) {
        count += countAnnotationPageItems(annotationPage) ?? 0
      }
    }

    return count
  }

  function getUnparsedAnnotationDetail(
    annotationCount: number | undefined,
    mapCount: number
  ) {
    if (annotationCount === undefined || annotationCount <= mapCount) {
      return
    }

    return `${pluralize(
      annotationCount - mapCount,
      'georeference annotation'
    )} could not be parsed.`
  }

  function getImageLoadDetail(imageLoadSummary?: ImageLoadSummary) {
    const imageErrorCount = imageLoadSummary?.imageErrorCount ?? 0

    if (imageErrorCount === 0) {
      return
    }

    const sourceImageCount = imageLoadSummary?.sourceImageCount ?? 0

    if (sourceImageCount > 0 && imageErrorCount === sourceImageCount) {
      return `All ${pluralize(sourceImageCount, 'image')} could not be loaded.`
    } else if (sourceImageCount > 0) {
      return `${imageErrorCount} of ${pluralize(
        sourceImageCount,
        'image'
      )} could not be loaded.`
    }

    return `${pluralize(imageErrorCount, 'image')} could not be loaded.`
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

  function getLoadedResourcePhrase(label: string) {
    return `Loaded ${pluralize(1, label)}`
  }

  function countIiifImages(
    source: Source,
    imageLoadSummary?: ImageLoadSummary
  ) {
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

    return imageLoadSummary?.sourceImageCount ?? 0
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
      return 'embedded and linked georeference annotations'
    } else if (hasEmbeddedAnnotations) {
      return 'embedded georeference annotations'
    } else if (hasLinkedAnnotations) {
      return 'linked georeference annotations'
    }

    return 'georeference annotations'
  }

  function getAnnotationSummary(
    source: Source,
    imageLoadSummary?: ImageLoadSummary
  ): Summary {
    if (source.parsed.type !== 'annotation') {
      throw new Error('Expected annotation source')
    }

    const maps = source.parsed.maps
    const details = [
      getUnparsedAnnotationDetail(
        countSourceAnnotationItems(source),
        maps.length
      ),
      getImageLoadDetail(imageLoadSummary)
    ].filter((detail) => detail !== undefined)

    return {
      sentence: `${getLoadedResourcePhrase(
        'Georeference Annotation'
      )} that contains ${pluralize(
        maps.length,
        'map'
      )}${getOrganizationClause(maps)}.`,
      details
    }
  }

  function getIiifSummary(
    source: Source,
    imageLoadSummary?: ImageLoadSummary
  ): Summary {
    if (source.parsed.type !== 'iiif') {
      throw new Error('Expected IIIF source')
    }

    const { iiif } = source.parsed
    const embeddedMaps = source.parsed.embeddedMaps ?? []
    const apiMaps = source.parsed.apiMaps ?? []
    const maps = [...embeddedMaps, ...apiMaps]
    const imageCount = countIiifImages(source, imageLoadSummary)
    const resourceLabel = getIiifResourceLabel(iiif.type)
    const details = [
      getOrganizationDetail(maps),
      getImageLoadDetail(imageLoadSummary)
    ].filter((detail) => detail !== undefined)

    if (embeddedMaps.length > 0 && apiMaps.length === 0) {
      const annotationPlacement =
        iiif.type === 'manifest'
          ? getManifestAnnotationPlacement(iiif)
          : 'georeference annotations'
      const unparsedAnnotationDetail =
        iiif.type === 'manifest'
          ? getUnparsedAnnotationDetail(
              countManifestAnnotationItems(iiif),
              embeddedMaps.length
            )
          : undefined

      return {
        sentence: `${getLoadedResourcePhrase(
          resourceLabel
        )} that contains ${pluralize(
          embeddedMaps.length,
          'map'
        )} in ${annotationPlacement}.`,
        details: [unparsedAnnotationDetail, ...details].filter(
          (detail) => detail !== undefined
        )
      }
    }

    if (apiMaps.length > 0 && embeddedMaps.length === 0) {
      const apiImageCount = countDistinctImages(apiMaps)
      const allmapsFoundPhrase =
        apiMaps.length === apiImageCount
          ? 'Allmaps found maps'
          : `Allmaps found ${pluralize(apiMaps.length, 'map')}`
      const allmapsFoundTarget =
        imageCount > 0 && apiImageCount === imageCount
          ? 'all images'
          : pluralize(apiImageCount, 'image')

      return {
        sentence: `${getLoadedResourcePhrase(resourceLabel)}${
          imageCount > 0
            ? ` that contains ${pluralize(imageCount, 'image')}`
            : ''
        }; ${allmapsFoundPhrase} for ${allmapsFoundTarget}.`,
        details
      }
    }

    if (maps.length > 0) {
      return {
        sentence: `${getLoadedResourcePhrase(resourceLabel)}${
          imageCount > 0
            ? ` that contains ${pluralize(imageCount, 'image')}`
            : ''
        } and ${pluralize(maps.length, 'map')}.`,
        details: [
          embeddedMaps.length > 0
            ? `${pluralize(
                embeddedMaps.length,
                'map'
              )} came from georeference annotations in the source.`
            : undefined,
          apiMaps.length > 0
            ? `Allmaps found ${pluralize(apiMaps.length, 'map')}.`
            : undefined,
          ...details
        ].filter((detail) => detail !== undefined)
      }
    }

    return {
      sentence: `${getLoadedResourcePhrase(resourceLabel)}${
        imageCount > 0 ? ` that contains ${pluralize(imageCount, 'image')}` : ''
      }. No georeferenced maps were found.`,
      details
    }
  }

  function getSourceSummary(
    source: Source,
    imageLoadSummary?: ImageLoadSummary
  ) {
    if (source.parsed.type === 'annotation') {
      return getAnnotationSummary(source, imageLoadSummary)
    }

    return getIiifSummary(source, imageLoadSummary)
  }
</script>

<section class="bg-gray-50 p-1 text-sm text-center leading-snug text-gray-700">
  <p>{summary.sentence}</p>

  {#if summary.details.length > 0}
    <div class="mt-1 space-y-1 text-xs text-gray-500">
      {#each summary.details as detail (detail)}
        <p>{detail}</p>
      {/each}
    </div>
  {/if}
</section>
