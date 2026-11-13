<script lang="ts">
  import { onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import * as Select from '@allmaps/ui/select'
  import { CodeBlock } from '@allmaps/ui/code'
  import { LoadingSmall } from '@allmaps/ui'
  import { annotationExamples } from '../lib/examples/data.js'
  import { validateImageSettings, imageExampleSource } from '../lib/image.ts'
  import type { ImageSettings, ImageWorkerResponse } from '../lib/image.ts'
  import type { CodeThemeConfig } from '@allmaps/ui/code'

  let { codeTheme }: { codeTheme?: CodeThemeConfig } = $props()
  const id = $props.id()
  const examples = annotationExamples.map((example) => ({
    ...example,
    annotationUrl: example.annotationUrl.replace(/@[0-9a-f]{16}$/, '')
  }))
  const formats = [
    { value: 'png', label: 'PNG' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'webp', label: 'WebP' }
  ] as const
  let draftUrl = $state(examples[0].annotationUrl)
  let width = $state<number>(1024)
  let height = $state<number>(1024)
  let format = $state<ImageSettings['format']>('png')
  let loading = $state(false)
  let status = $state('')
  let error = $state('')
  let result = $state.raw<{
    url: string
    blob: Blob
    settings: ImageSettings
    mapCount: number
  }>()
  let worker: Worker | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  const selectedExample = $derived(
    examples.find((option) => option.annotationUrl === draftUrl.trim())
  )

  const previewAspectRatio = $derived(
    Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
      ? width / height
      : 1
  )

  function stop() {
    clearTimeout(timeout)
    worker?.terminate()
    worker = undefined
    loading = false
  }
  function clearResult() {
    if (result) URL.revokeObjectURL(result.url)
    result = undefined
  }
  function reset() {
    if (loading) stop()
    clearResult()
    error = ''
    status = ''
  }
  function changeUrl(value: string) {
    draftUrl = value
    reset()
  }
  function fail(message: string) {
    stop()
    error = message
  }
  function renderImage() {
    let settings: ImageSettings
    try {
      settings = validateImageSettings({
        annotationUrl: draftUrl,
        width,
        height,
        format
      })
    } catch (cause) {
      error =
        cause instanceof Error ? cause.message : 'Check the image settings.'
      return
    }
    loading = true
    error = ''
    status = 'Loading renderer…'
    try {
      // No worker, renderer, or IIIF requests until this button is clicked.
      worker ??= new Worker(
        new URL('../lib/image-render.worker.ts', import.meta.url),
        { type: 'module' }
      )
      const activeWorker = worker
      worker.onmessage = (event: MessageEvent<ImageWorkerResponse>) => {
        if (worker !== activeWorker) return
        const message = event.data
        if (message.type === 'progress') {
          status = message.message
        } else if (message.type === 'error') {
          fail(message.message)
        } else {
          clearTimeout(timeout)
          clearResult()
          result = {
            url: URL.createObjectURL(message.blob),
            blob: message.blob,
            settings,
            mapCount: message.mapCount
          }
          loading = false
          status = `Image ready for ${message.mapCount} ${message.mapCount === 1 ? 'map' : 'maps'}.`
        }
      }
      worker.onerror = () =>
        fail('Could not load or run the image renderer. Please try again.')
      worker.onmessageerror = () =>
        fail('Could not receive the rendered image. Please try again.')
      timeout = setTimeout(
        () =>
          fail(
            'Rendering took too long. Try a smaller image or another example.'
          ),
        90000
      )
      worker.postMessage(settings)
    } catch (cause) {
      fail(
        cause instanceof Error ? cause.message : 'Could not start the renderer.'
      )
    }
  }
  function download() {
    if (!result) return
    const link = document.createElement('a')
    link.href = result.url
    link.download = `allmaps-map.${result.settings.format === 'jpeg' ? 'jpg' : result.settings.format}`
    link.click()
  }
  onDestroy(() => {
    stop()
    clearResult()
  })
</script>

{#snippet exampleLabel(label: string)}
  {@const separator = label.indexOf(' — ')}
  <span
    class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap [&_strong]:font-semibold"
    ><strong>{separator === -1 ? label : label.slice(0, separator)}</strong
    >{#if separator !== -1}<span class="font-normal opacity-75"
        >{label.slice(separator)}</span
      >{/if}</span
  >
{/snippet}

<div
  class="not-content border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-[14px] bg-[color:var(--sl-color-bg,#fff)] text-[color:var(--sl-color-text,#182a2f)] overflow-hidden"
>
  <form
    class="p-5 grid gap-4 [&_[data-slot='select-trigger']]:w-full [&_[data-slot='select-trigger']]:min-w-0 [&_[data-slot='select-trigger']]:h-auto [&_[data-slot='select-trigger']]:py-2.5 [&_[data-slot='select-trigger']]:px-3 [&_[data-slot='select-trigger']]:rounded-lg [&_[data-slot='select-trigger']]:text-sm"
    onsubmit={(event) => {
      event.preventDefault()
      renderImage()
    }}
  >
    <div>
      <label
        class="block mb-1 text-xs font-medium"
        id={`${id}-example-label`}
        for={`${id}-example`}>Example map</label
      >
      <Select.Root
        type="single"
        items={examples.map(({ annotationUrl, label }) => ({
          value: annotationUrl,
          label
        }))}
        value={selectedExample?.annotationUrl ?? ''}
        onValueChange={(value) => {
          if (value) changeUrl(value)
        }}
      >
        <Select.Trigger
          id={`${id}-example`}
          aria-labelledby={`${id}-example-label`}
        >
          {@render exampleLabel(selectedExample?.label ?? 'Custom URL')}
        </Select.Trigger>
        <Select.Content>
          {#each examples as option (option.annotationUrl)}
            <Select.Item value={option.annotationUrl} label={option.label}>
              {#snippet children()}{@render exampleLabel(
                  option.label
                )}{/snippet}
            </Select.Item>
          {/each}
        </Select.Content>
      </Select.Root>
    </div>
    <div>
      <label class="block mb-1 text-xs font-medium" for={`${id}-url`}
        >Annotation URL</label
      >
      <div class="flex flex-wrap gap-2">
        <input
          class="[font-family:inherit] [font-weight:inherit] [line-height:inherit] border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-lg py-2.5 px-3 flex-1 [min-width:min(100%,14rem)] bg-[color:var(--sl-color-bg,#fff)] text-[color:inherit] font-[family-name:var(--sl-font-mono,monospace)] text-xs focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:#ff56ba] focus-visible:outline-offset-[2px]"
          id={`${id}-url`}
          type="url"
          value={draftUrl}
          oninput={(event) => changeUrl(event.currentTarget.value)}
          required
        />
      </div>
    </div>
    <div
      class="flex flex-wrap gap-4 [&_>_div]:flex-1 [&_>_div]:min-w-24 [&_input]:w-full [&_input]:min-w-0 [&_input]:box-border"
    >
      <div>
        <label
          class="block mb-1 text-xs font-medium"
          id={`${id}-format-label`}
          for={`${id}-format`}>Format</label
        >
        <Select.Root
          type="single"
          items={[...formats]}
          value={format}
          onValueChange={(value) => {
            if (value === 'png' || value === 'webp' || value === 'jpeg') {
              format = value
              reset()
            }
          }}
        >
          <Select.Trigger
            id={`${id}-format`}
            aria-labelledby={`${id}-format-label`}
          >
            {formats.find((option) => option.value === format)?.label}
          </Select.Trigger>
          <Select.Content>
            {#each formats as option (option.value)}
              <Select.Item value={option.value} label={option.label}>
                {option.label}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
      <div>
        <label class="block mb-1 text-xs font-medium" for={`${id}-width`}
          >Width (pixels)</label
        ><input
          class="[font-family:inherit] [font-weight:inherit] [line-height:inherit] border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-lg py-2.5 px-3 flex-1 [min-width:min(100%,14rem)] bg-[color:var(--sl-color-bg,#fff)] text-[color:inherit] font-[family-name:var(--sl-font-mono,monospace)] text-xs focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:#ff56ba] focus-visible:outline-offset-[2px]"
          id={`${id}-width`}
          type="number"
          min="64"
          max="2048"
          step="1"
          bind:value={width}
          oninput={reset}
          required
        />
      </div>
      <div>
        <label class="block mb-1 text-xs font-medium" for={`${id}-height`}
          >Height (pixels)</label
        ><input
          class="[font-family:inherit] [font-weight:inherit] [line-height:inherit] border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-lg py-2.5 px-3 flex-1 [min-width:min(100%,14rem)] bg-[color:var(--sl-color-bg,#fff)] text-[color:inherit] font-[family-name:var(--sl-font-mono,monospace)] text-xs focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:#ff56ba] focus-visible:outline-offset-[2px]"
          id={`${id}-height`}
          type="number"
          min="64"
          max="2048"
          step="1"
          bind:value={height}
          oninput={reset}
          required
        />
      </div>
    </div>
    <div class="relative grid min-h-32 place-items-center" aria-busy={loading}>
      <div
        class="relative w-full border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-lg overflow-hidden bg-white"
        class:p-2={!!result}
        data-format={format}
        style:aspect-ratio={previewAspectRatio}
      >
        {#if format !== 'jpeg'}
          <div
            class="pointer-events-none absolute inset-0 bg-[conic-gradient(#e6e6e6_25%,transparent_0_50%,#e6e6e6_0_75%,transparent_0)] [background-size:20px_20px]"
            aria-hidden="true"
            transition:fade={{ duration: 150 }}
          ></div>
        {/if}
        {#if result}
          <img
            class="relative block w-full h-full object-contain"
            src={result.url}
            width={result.settings.width}
            height={result.settings.height}
            alt={`Rendered georeferenced map: ${examples.find((example) => example.annotationUrl === result?.settings.annotationUrl)?.label ?? 'Custom annotation'}`}
          />
        {/if}
      </div>
      {#if !result}
        <div
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg p-4 text-center data-[loading=true]:bg-[color:color-mix(in_srgb,var(--sl-color-bg,#fff)_85%,transparent)]"
          data-loading={loading}
        >
          {#if loading}
            <div
              class="grid justify-items-center gap-1.5"
              role="status"
              aria-live="polite"
              transition:fade={{ duration: 150 }}
            >
              <div class="flex items-center gap-2 text-sm font-medium">
                <div
                  class="shrink-0 [&_img]:block [[data-theme='dark']_&]:invert"
                  aria-hidden="true"
                >
                  <LoadingSmall />
                </div>
                <span>Rendering image…</span>
              </div>
              <span class="text-xs text-[color:var(--sl-color-gray-2,#495c62)]"
                >{status === 'Loading IIIF tiles and rendering image…'
                  ? 'Loading IIIF tiles…'
                  : status}</span
              >
            </div>
            <button
              class="cursor-pointer rounded-sm border-0 bg-transparent px-2 py-1 text-xs text-[color:var(--sl-color-gray-2,#495c62)] underline decoration-transparent underline-offset-4 hover:text-[#ff56ba] hover:decoration-current focus-visible:outline-2 focus-visible:outline-[#ff56ba] focus-visible:outline-offset-2"
              type="button"
              onclick={() => {
                stop()
                status = 'Rendering cancelled.'
              }}>Cancel</button
            >
          {:else}
            <button
              class="[font-family:inherit] [line-height:inherit] border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] rounded-lg py-2.5 px-3 cursor-pointer text-sm font-semibold text-[color:#ff56ba] border-[color:color-mix(in_srgb,#ff56ba_55%,var(--sl-color-gray-5,#bac4c8))] bg-[color:color-mix(in_srgb,#ff56ba_10%,var(--sl-color-bg,#fff))] hover:bg-[color:color-mix(in_srgb,#ff56ba_20%,var(--sl-color-bg,#fff))] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:#ff56ba] focus-visible:outline-offset-[2px] shadow-sm"
              type="submit">Render image</button
            >
            {#if error}
              <p
                class="m-0 rounded-lg bg-[color:var(--sl-color-bg,#fff)] px-3 py-2 text-sm text-[color:var(--sl-color-red-high,#b91c1c)]"
                role="alert"
              >
                {error}
              </p>
            {:else if status}
              <p
                class="m-0 rounded-lg bg-[color:var(--sl-color-bg,#fff)] px-3 py-2 text-sm"
                role="status"
              >
                {status}
              </p>
            {/if}
          {/if}
        </div>
      {/if}
      {#if result}
        <div
          class="pointer-events-none absolute inset-x-3 bottom-3 flex justify-end"
        >
          <div
            class="flex max-w-full flex-wrap items-center justify-end gap-x-3 gap-y-1 rounded-md border border-solid border-[color:var(--sl-color-gray-5,#bac4c8)] bg-[color:color-mix(in_srgb,var(--sl-color-bg,#fff)_95%,transparent)] px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm"
          >
            <span
              >{result.settings.width.toLocaleString('en-US')} × {result.settings.height.toLocaleString(
                'en-US'
              )} pixels · {(result.blob.size / 1024).toFixed(0)} KB</span
            >
            <button
              class="pointer-events-auto inline-flex cursor-pointer items-center gap-1.5 rounded-sm border-0 bg-transparent px-1 py-1.5 text-xs font-semibold text-[#ff56ba] hover:underline hover:underline-offset-3 focus-visible:outline-2 focus-visible:outline-[#ff56ba] focus-visible:outline-offset-2"
              type="button"
              onclick={download}
            >
              <svg
                class="size-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6" />
              </svg>
              Download {result.settings.format === 'webp'
                ? 'WebP'
                : result.settings.format.toUpperCase()}
            </button>
          </div>
        </div>
        <span class="sr-only" role="status">{status}</span>
      {/if}
    </div>
  </form>
  <div
    class="p-5 border-t border-solid border-t-[color:var(--sl-color-gray-5,#bac4c8)] [--allmaps-code-max-height:30rem]"
  >
    <CodeBlock
      code={imageExampleSource({
        annotationUrl: draftUrl.trim(),
        width,
        height,
        format
      })}
      language="javascript"
      theme={codeTheme}
      title="Render a map image"
    />
  </div>
</div>
