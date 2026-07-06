<script lang="ts">
  import { fade } from 'svelte/transition'

  import { parseLocalizedLanguageString } from '$lib/shared/iiif.js'
  import { m } from '$lib/paraglide/messages.js'

  import { getSourceState } from '$lib/state/source.svelte'

  const sourceState = getSourceState()

  const parsedIiif = $derived(sourceState.source?.parsedIiif)

  const typeString = $derived.by(() => {
    const type = sourceState.source?.type
    if (type === 'collection') {
      return 'IIIF Collection'
    } else if (type === 'manifest') {
      return 'IIIF Manifest'
    } else if (type === 'image') {
      return 'IIIF Image'
    }
  })

  const typeUrl = $derived.by(() => {
    const type = sourceState.source?.type
    const majorVersion = sourceState.source?.parsedIiif?.majorVersion
    if (type === 'collection' && majorVersion === 2) {
      return 'https://iiif.io/api/presentation/2.0/#collections'
    } else if (type === 'collection' && majorVersion === 3) {
      return 'https://iiif.io/api/presentation/3.0/#51-collection'
    } else if (type === 'manifest' && majorVersion === 2) {
      return 'https://iiif.io/api/presentation/2.0/#manifest'
    } else if (type === 'manifest' && majorVersion === 3) {
      return 'https://iiif.io/api/presentation/3.0/#52-manifest'
    } else if (type === 'image' && majorVersion === 1) {
      return 'https://iiif.io/api/image/1.1/'
    } else if (type === 'image' && majorVersion === 2) {
      return 'https://iiif.io/api/image/2.1/'
    } else if (type === 'image' && majorVersion === 3) {
      return 'https://iiif.io/api/image/3.0/'
    }
  })

  const label = $derived.by(() => {
    if (parsedIiif?.type === 'manifest' || parsedIiif?.type === 'collection') {
      return parsedIiif.label
    }
  })

  const description = $derived.by(() => {
    if (parsedIiif?.type === 'manifest') {
      return parsedIiif.description
    }
  })

  const metadata = $derived.by(() => {
    if (parsedIiif?.type === 'manifest') {
      return parsedIiif.metadata
    }
  })

  const labelString = $derived(parseLocalizedLanguageString(label))
  const descriptionString = $derived(parseLocalizedLanguageString(description))

  const metadataStrings = $derived(
    metadata
      ? metadata.map((item) => ({
          label: parseLocalizedLanguageString(item.label),
          value: parseLocalizedLanguageString(item.value)
        }))
      : []
  )

  const showActiveImageInfo = $derived(
    sourceState.source && sourceState.source.type !== 'image'
  )

  const activeImageLabel = $derived(
    parseLocalizedLanguageString(sourceState.activeCanvas?.label)
  )

  // TODO: use labels!
</script>

<div class="grid grid-cols-[max-content_1fr] gap-2">
  <div class="col-span-2 font-bold">
    {m.georeferencing_this_resource()}
  </div>
  {#if sourceState.source}
    <div>{m.type_label()}</div>
    <a class="underline" href={typeUrl}>{typeString}</a>
    <div>{m.url_label()}</div>
    <a class="break-all underline" href={sourceState.source.url}
      >{sourceState.source?.url}</a
    >
  {/if}
  {#if labelString}
    <div>{m.label_label()}</div>
    <div>{labelString}</div>
  {/if}
  {#if descriptionString}
    <div>{m.description_label()}</div>
    <div>{descriptionString}</div>
  {/if}
  {#if metadataStrings.length}
    <div class="col-span-2">{m.metadata_label()}</div>
    <dl
      class="col-span-2 grid max-h-36 w-full grid-cols-subgrid gap-2 overflow-auto rounded-md bg-[rgba(220,220,220,0.1)] p-2 shadow-inner"
    >
      {#each metadataStrings as { label, value }, index (index)}
        <dt>{label}</dt>
        <dd class="break-all">{value}</dd>
      {/each}
    </dl>
  {/if}

  {#if showActiveImageInfo}
    <div class="col-span-2 font-bold">{m.current_image_label()}</div>
    <div>{m.url_label()}</div>
    <div>
      <a
        class="break-all underline"
        href={`${sourceState.activeImage?.uri}/info.json`}
        >{sourceState.activeImage?.uri}</a
      >
    </div>
    {#if activeImageLabel}
      <div>{m.label_label()}</div>
      <div>{activeImageLabel}</div>
    {/if}
    <div>{m.resolution_label()}</div>
    <div>
      {#if sourceState.activeImage && !sourceState.activeImage.embedded}
        <span transition:fade
          >{sourceState.activeImage?.width} × {sourceState.activeImage?.height}
          {m.pixels()}</span
        >
      {/if}
    </div>
  {/if}
</div>
