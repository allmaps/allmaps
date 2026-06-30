<script lang="ts">
  import MapRowDetails from './MapRowDetails.svelte'
  import MapRowError from './MapRowError.svelte'
  import MapThumbnail from './MapThumbnail.svelte'

  import type { MapListRow, ThumbnailErrorMessage } from './types.js'

  type Props = {
    row: MapListRow
    selected?: boolean
    selectable?: boolean
    hidden?: boolean
    canToggleHidden?: boolean
    errorTitle?: string
    errorMessage?: string
    thumbnailError?: ThumbnailErrorMessage
    thumbnails: ReadonlyMap<string, ImageBitmap>
    onToggleHidden: (row: MapListRow) => void
  }

  let {
    row,
    selected = false,
    selectable = true,
    hidden = false,
    canToggleHidden = false,
    errorTitle,
    errorMessage,
    thumbnailError,
    thumbnails,
    onToggleHidden
  }: Props = $props()

  let thumbnail = $derived(thumbnails.get(row.resource.id))
  let displayedErrorTitle = $derived(errorTitle ?? 'Could not render this map')
  let displayedErrorMessage = $derived(errorMessage ?? row.renderError?.message)
  let hasError = $derived(
    !!(row.renderError || errorTitle || displayedErrorMessage)
  )
</script>

<li class="w-full flex flex-row min-w-0 gap-3 transition-colors text-gray-700">
  {#if hidden || !selectable}
    <span
      data-selected-map={selected ? 'true' : undefined}
      class={['shrink-0 rounded', hidden && 'opacity-50']}
      aria-label={row.mapId ?? `Map ${row.mapNumber}`}
    >
      <MapThumbnail {row} {selected} {thumbnail} {thumbnailError} />
      <span class="sr-only">{row.mapId ?? `Map ${row.mapNumber}`}</span>
    </span>
  {:else}
    <a
      href={row.mapUrl}
      aria-current={selected ? 'true' : undefined}
      data-selected-map={selected ? 'true' : undefined}
      class="shrink-0 rounded focus-visible:outline-pink"
      aria-label={row.mapId ?? `Map ${row.mapNumber}`}
    >
      <MapThumbnail {row} {selected} {thumbnail} {thumbnailError} />
      <span class="sr-only">{row.mapId ?? `Map ${row.mapNumber}`}</span>
    </a>
  {/if}

  {#if hasError}
    <MapRowError
      title={row.title}
      errorTitle={displayedErrorTitle}
      errorMessage={displayedErrorMessage}
    />
  {:else}
    <MapRowDetails
      {row}
      {selected}
      {hidden}
      {canToggleHidden}
      {onToggleHidden}
    />
  {/if}
</li>
