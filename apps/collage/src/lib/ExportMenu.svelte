<script lang="ts">
  import { onDestroy } from 'svelte'
  import { shades } from '@allmaps/tailwind'
  import {
    DownloadSimple,
    FileCode,
    ImageSquare,
    VectorThree,
    X
  } from 'phosphor-svelte'
  import { LoadingSmall } from '@allmaps/ui'
  import type { Map as MapLibreMap } from 'maplibre-gl'
  import FanMenu from './FanMenu.svelte'
  import type { CollageMap } from './model'
  import { outline } from './model'
  import { CANVAS_SCALE } from './coordinates'
  import type { Point } from '@allmaps/types'
  import type { ExportableMapLayer } from './export-layer'
  import {
    exportView,
    frameExportView,
    defaultExportScale,
    imageDimensions,
    validateImageSize
  } from './export-view'
  import type { ExportView } from './export-view'
  import { exportImage, loadExportImages } from './export-image'
  import {
    exportSvg,
    DEFAULT_SVG_SIZE,
    validateSvgSize,
    validateSvgItems
  } from './export-svg'
  import { embeddedSvgSources } from './export-svg-images'

  let {
    map,
    layer,
    items,
    selectedIds,
    disabled,
    onsave,
    onopen
  }: {
    map?: MapLibreMap
    layer?: ExportableMapLayer
    items: CollageMap[]
    selectedIds: Set<string>
    disabled: boolean
    onsave: (items: CollageMap[]) => void
    onopen: (open: boolean) => void
  } = $props()
  let mode = $state<'annotation' | 'image' | 'svg'>()
  let selectedOnly = $state(false)
  const selection = $derived(
    items.filter((item) => selectedIds.has(item.instanceId))
  )
  const exportItems = $derived(selectedOnly ? selection : items)
  let view = $state.raw<ExportView>()
  let area = $state<'view' | 'collage'>('collage')
  let margin = $state(10)
  let proportion = $state('original')
  let proportionWidth = $state(1)
  let proportionHeight = $state(1)
  let maxDimension = $state(DEFAULT_SVG_SIZE.width)
  let embed = $state(false)
  let format = $state<'png' | 'jpg'>('png')
  let background = $state('#ffffff')
  const backgroundColors = [
    { label: 'White', value: '#ffffff' },
    { label: 'Black', value: '#000000' },
    ...(
      [
        'green',
        'blue',
        'purple',
        'pink',
        'orange',
        'red',
        'yellow',
        'gray'
      ] as const
    ).map((color) => ({
      label: color[0].toUpperCase() + color.slice(1),
      value: shades[color][0]
    }))
  ]
  let dpi = $state(300)
  let scale = $state(10000)
  let busy = $state(false)
  let error = $state('')
  let controller: AbortController | undefined
  let disposed = false
  const options = [
    { value: 'annotation', label: 'AnnotationPage', icon: FileCode },
    { value: 'image', label: 'Image', icon: ImageSquare },
    { value: 'svg', label: 'SVG', icon: VectorThree }
  ]
  const frame = $derived.by(() => {
    if (!view || mode === 'annotation') return {}
    try {
      const aspect =
        mode === 'svg' || proportion === 'original'
          ? undefined
          : proportion === 'custom'
            ? proportionWidth / proportionHeight
            : Number(proportion)
      if (
        mode !== 'svg' &&
        proportion === 'custom' &&
        !(proportionWidth > 0 && proportionHeight > 0)
      )
        throw new Error('Enter a width and height greater than zero.')
      const points =
        mode === 'svg' || area === 'collage'
          ? exportItems
              .flatMap(outline)
              .map(([x, y]): Point => [x * CANVAS_SCALE, y * CANVAS_SCALE])
          : undefined
      return { view: frameExportView(view, points, margin, aspect) }
    } catch (error) {
      return { error: (error as Error).message }
    }
  })
  const dimensions = $derived.by(() => {
    if (!frame.view) return undefined
    try {
      const dimensions = imageDimensions(frame.view, scale, dpi)
      validateImageSize(dimensions.width, dimensions.height)
      return dimensions
    } catch {
      return undefined
    }
  })
  const validation = $derived.by(() => {
    if (!exportItems.length) return 'Select maps to export.'
    if (mode === 'annotation') return ''
    if (frame.error) return frame.error
    if (!frame.view) return ''
    try {
      if (mode === 'svg')
        validateSvgSize({ width: maxDimension, height: maxDimension })
      else {
        const { width, height } = imageDimensions(frame.view, scale, dpi)
        validateImageSize(width, height)
      }
      return ''
    } catch (error) {
      return (error as Error).message
    }
  })

  function resetScale() {
    if (frame.view) scale = defaultExportScale(frame.view)
  }

  function choose(value: string) {
    if (disabled || !items.length) return
    if (value !== 'annotation' && (!map || !layer)) return
    if (!selection.length) selectedOnly = false
    map?.stop()
    if (map) view = exportView(map)
    mode =
      value === 'annotation' ? 'annotation' : value === 'svg' ? 'svg' : 'image'
    resetScale()
    error = ''
    onopen(true)
  }

  function close() {
    if (busy)
      controller?.abort(new DOMException('Export cancelled.', 'AbortError'))
    else {
      mode = undefined
      onopen(false)
    }
  }

  async function download(event?: SubmitEvent) {
    event?.preventDefault()
    if (busy || validation || !exportItems.length) return
    if (mode === 'annotation') {
      onsave(exportItems)
      close()
      return
    }
    if (!map || !layer || !frame.view) return
    const exportFrame = frame.view
    const targets = exportItems
    const mapIds = selectedOnly
      ? new Set(targets.map((item) => item.instanceId))
      : undefined
    busy = true
    error = ''
    controller = new AbortController()
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(90_000)
    ])
    const resized = () =>
      controller?.abort(
        new Error('The view changed size. Please export again.')
      )
    window.addEventListener('resize', resized)
    let succeeded = false
    try {
      let blob: Blob
      let extension: string
      if (mode === 'svg') {
        const maps = await loadExportImages(layer, exportFrame, signal, mapIds)
        const images = new Map(maps.map((map) => [map.mapId, map.image]))
        const visibleItems = targets.filter((item) =>
          images.has(item.instanceId)
        )
        const maximum = { width: maxDimension, height: maxDimension }
        // Validate transforms/effects before downloading image pixels.
        validateSvgItems(visibleItems, exportFrame)
        const sources = embed
          ? await embeddedSvgSources(layer, images, maximum, signal)
          : undefined
        blob = new Blob(
          [exportSvg(visibleItems, images, exportFrame, { maximum, sources })],
          {
            type: 'image/svg+xml'
          }
        )
        extension = 'svg'
      } else {
        blob = await exportImage(
          map,
          layer,
          exportFrame,
          { format, dpi, scale, backgroundColor: background, mapIds },
          signal
        )
        extension = format
      }
      signal.throwIfAborted()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `allmaps-collage.${extension}`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      succeeded = true
    } catch (cause) {
      if (!controller.signal.aborted)
        error =
          signal.reason?.name === 'TimeoutError'
            ? 'The image service took too long. Please try again at a lower resolution.'
            : cause instanceof Error
              ? cause.message
              : 'Could not export this view.'
    } finally {
      window.removeEventListener('resize', resized)
      const cancelled = controller.signal.aborted
      if (cancelled && controller.signal.reason?.name !== 'AbortError')
        error = controller.signal.reason.message
      controller = undefined
      busy = false
      if (!disposed && (succeeded || (cancelled && !error))) close()
    }
  }

  function showDialog(dialog: HTMLDialogElement) {
    dialog.showModal()
    const outside = (event: PointerEvent) => {
      const r = dialog.getBoundingClientRect()
      return (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
    }
    let startedOutside = false
    const down = (event: PointerEvent) => {
      startedOutside = outside(event)
    }
    const up = (event: PointerEvent) => {
      if (startedOutside && outside(event)) close()
      startedOutside = false
    }
    dialog.addEventListener('pointerdown', down)
    dialog.addEventListener('pointerup', up)
    return {
      destroy() {
        dialog.removeEventListener('pointerdown', down)
        dialog.removeEventListener('pointerup', up)
        dialog.close()
      }
    }
  }
  onDestroy(() => {
    disposed = true
    controller?.abort()
  })
</script>

<FanMenu
  label="Export"
  icon={DownloadSimple}
  direction="down"
  {options}
  disabled={disabled || !items.length}
  onselect={choose}
/>

{#if mode}
  <div class="modal-backdrop">
    <dialog
      class="input-dialog export-dialog"
      use:showDialog
      aria-labelledby="export-title"
      oncancel={(event) => {
        event.preventDefault()
        close()
      }}
    >
      <button class="close-dialog" aria-label="Close" onclick={close}
        ><X size={22} /></button
      >
      <h2 id="export-title">
        {mode === 'annotation'
          ? 'Export AnnotationPage'
          : mode === 'image'
            ? 'Export image'
            : 'Export SVG'}
      </h2>
      <form onsubmit={download}>
        <fieldset disabled={busy} class="export-fields">
          <label for="export-maps">Maps</label>
          <select
            id="export-maps"
            bind:value={selectedOnly}
            onchange={resetScale}
          >
            <option value={false}>All maps</option>
            <option value={true} disabled={!selection.length}
              >Selected maps</option
            >
          </select>
          {#if mode !== 'annotation'}
            {#if mode === 'image'}
              <label for="export-area">Area</label>
              <select id="export-area" bind:value={area} onchange={resetScale}>
                <option value="view">Current view</option>
                <option value="collage"
                  >{selectedOnly
                    ? 'Entire selection'
                    : 'Entire collage'}</option
                >
              </select>
            {/if}
            <label for="export-margin">Margin</label>
            <div class="export-scale">
              <input
                id="export-margin"
                type="number"
                min="0"
                max="100"
                step="any"
                required
                bind:value={margin}
              /><span>%</span>
            </div>
            {#if mode === 'image'}
              <label for="export-proportion">Proportion</label>
              <select id="export-proportion" bind:value={proportion}>
                <option value="original">Original</option>
                <option value="1">1:1</option>
                <option value={String(4 / 3)}>4:3</option>
                <option value="1.5">3:2</option>
                <option value={String(16 / 9)}>16:9</option>
                <option value="custom">Custom</option>
              </select>
              {#if proportion === 'custom'}
                <label for="export-proportion-width">Width : height</label>
                <div class="export-scale">
                  <input
                    id="export-proportion-width"
                    aria-label="Proportion width"
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    bind:value={proportionWidth}
                  />
                  <span>:</span>
                  <input
                    aria-label="Proportion height"
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    bind:value={proportionHeight}
                  />
                </div>
              {/if}
            {/if}
          {/if}
        </fieldset>
        {#if mode === 'image'}
          <fieldset disabled={busy} class="export-fields">
            <label for="export-format">Format</label>
            <select id="export-format" bind:value={format}
              ><option value="png">PNG</option><option value="jpg">JPG</option
              ></select
            >
            {#if format === 'jpg'}
              <label for="export-background">Background</label>
              <div class="export-background">
                <select
                  id="export-background"
                  value={backgroundColors.some(
                    (color) => color.value === background
                  )
                    ? background
                    : 'custom'}
                  onchange={(event) => {
                    if (event.currentTarget.value !== 'custom')
                      background = event.currentTarget.value
                  }}
                >
                  {#each backgroundColors as color (color.value)}<option
                      value={color.value}>{color.label}</option
                    >{/each}
                  <option value="custom">Custom</option>
                </select>
                <input
                  type="color"
                  aria-label="Background color"
                  bind:value={background}
                />
              </div>
            {/if}
            <label for="export-dpi">DPI</label>
            <input
              id="export-dpi"
              type="number"
              min="1"
              max="2400"
              step="1"
              required
              bind:value={dpi}
            />
            <label for="export-scale">Scale</label>
            <div class="export-scale">
              <span>1:</span><input
                id="export-scale"
                type="number"
                min="1"
                step="any"
                required
                bind:value={scale}
              />
            </div>
          </fieldset>
          <p class="export-dimensions">
            {#if dimensions}
              {dimensions.width.toLocaleString()} × {dimensions.height.toLocaleString()}
              px<br />{((dimensions.width / dpi) * 25.4).toFixed(1)} × {(
                (dimensions.height / dpi) *
                25.4
              ).toFixed(1)} mm{/if}
          </p>
        {:else if mode === 'svg'}
          <fieldset disabled={busy} class="export-fields">
            <label for="export-svg-dimension">Max. image dimension</label>
            <div class="export-scale">
              <input
                id="export-svg-dimension"
                type="number"
                min="1"
                max="8192"
                step="1"
                required
                bind:value={maxDimension}
              /><span>px</span>
            </div>
            <label for="export-svg-embed">Images</label>
            <select id="export-svg-embed" bind:value={embed}>
              <option value={false}>Linked</option>
              <option value={true}>Embedded</option>
            </select>
          </fieldset>
        {/if}
        {#if validation}<p class="dialog-error" role="alert">
            {validation}
          </p>{/if}
        {#if error}<p class="dialog-error" role="alert">{error}</p>{/if}
        <div class="export-actions">
          <button type="button" class="quiet-button" onclick={close}
            >Cancel</button
          >
          <button
            type="submit"
            class="primary-button"
            disabled={busy ||
              !!validation ||
              (mode !== 'annotation' && !frame.view)}
            >{#if busy}<LoadingSmall /><span>Exporting…</span
              >{:else}<DownloadSimple size={18} />Export{/if}</button
          >
        </div>
      </form>
    </dialog>
  </div>
{/if}
