<script lang="ts">
  import { onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import * as Select from '@allmaps/ui/select'
  import { CodeBlock } from '@allmaps/ui/code'
  import { LoadingSmall } from '@allmaps/ui'
  import { annotationExamples } from '@allmaps/ui/examples/data'
  import { validateImageSettings, imageExampleSource } from '../lib/image.ts'
  import type { ImageSettings, ImageWorkerResponse } from '../lib/image.ts'
  import type { CodeThemeConfig } from '@allmaps/ui/code'

  let { codeTheme }: { codeTheme?: CodeThemeConfig } = $props()
  const id = $props.id()
  const examples = annotationExamples
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
  let status = $state('Ready to render.')
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
    status = 'Ready to render.'
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
      // No worker, renderer, WASM, or IIIF requests until this button is clicked.
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
  <span class="example-label"
    ><strong>{separator === -1 ? label : label.slice(0, separator)}</strong
    >{#if separator !== -1}<span class="institution"
        >{label.slice(separator)}</span
      >{/if}</span
  >
{/snippet}

<div class="image-example not-content">
  <form
    onsubmit={(event) => {
      event.preventDefault()
      renderImage()
    }}
  >
    <div>
      <label id={`${id}-example-label`} for={`${id}-example`}>Example map</label
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
      <label for={`${id}-url`}>Annotation URL</label>
      <div class="url-input">
        <input
          id={`${id}-url`}
          type="url"
          value={draftUrl}
          oninput={(event) => changeUrl(event.currentTarget.value)}
          required
        />
      </div>
    </div>
    <div class="options">
      <div>
        <label id={`${id}-format-label`} for={`${id}-format`}>Format</label>
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
        <label for={`${id}-width`}>Width (pixels)</label><input
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
        <label for={`${id}-height`}>Height (pixels)</label><input
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
    <div class="actions">
      <button type="submit" disabled={loading}>Render image</button>
      <div class="status" role="status" aria-live="polite">
        {#if loading}<span class="loading" transition:fade={{ duration: 150 }}>
            <LoadingSmall />
            <span class="status-text" title={status}
              >{status === 'Loading IIIF tiles and rendering image…'
                ? 'Loading tiles and rendering…'
                : status}</span
            >
          </span>
        {:else if error}<span class="error">{error}</span>
        {:else}<span>{status}</span>{/if}
      </div>
      {#if loading}<button
          class="cancel"
          type="button"
          onclick={() => {
            stop()
            status = 'Rendering cancelled.'
          }}>Cancel</button
        >{/if}
    </div>
  </form>
  {#if result}
    <div class="result">
      <div class="result-header">
        <span
          >{result.settings.width.toLocaleString('en-US')} × {result.settings.height.toLocaleString(
            'en-US'
          )} pixels · {(result.blob.size / 1024).toFixed(0)} KB</span
        ><button type="button" onclick={download}
          >Download {result.settings.format === 'webp'
            ? 'WebP'
            : result.settings.format.toUpperCase()}</button
        >
      </div>
      <div class="preview">
        <img
          style:max-width={`${(30 * result.settings.width) / result.settings.height}rem`}
          src={result.url}
          width={result.settings.width}
          height={result.settings.height}
          alt={`Rendered georeferenced map: ${examples.find((example) => example.annotationUrl === result?.settings.annotationUrl)?.label ?? 'Custom annotation'}`}
        />
      </div>
    </div>
  {/if}
  <div class="code">
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

<style>
  .image-example {
    border: 1px solid var(--sl-color-gray-5, #bac4c8);
    border-radius: 14px;
    background: var(--sl-color-bg, #fff);
    color: var(--sl-color-text, #182a2f);
    overflow: hidden;
  }
  form,
  .result {
    padding: 1.25rem;
  }
  form {
    display: grid;
    gap: 1rem;
  }
  label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    font-weight: 500;
  }
  .url-input {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  input,
  button {
    font: inherit;
    border: 1px solid var(--sl-color-gray-5, #bac4c8);
    border-radius: 8px;
    padding: 0.625rem 0.75rem;
  }
  input {
    flex: 1;
    min-width: min(100%, 14rem);
    background: var(--sl-color-bg, #fff);
    color: inherit;
    font-family: var(--sl-font-mono, monospace);
    font-size: 0.75rem;
  }
  button {
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    color: #ff56ba;
    border-color: color-mix(
      in srgb,
      #ff56ba 55%,
      var(--sl-color-gray-5, #bac4c8)
    );
    background: color-mix(in srgb, #ff56ba 10%, var(--sl-color-bg, #fff));
  }
  button:hover {
    background: color-mix(in srgb, #ff56ba 20%, var(--sl-color-bg, #fff));
  }
  button:disabled {
    cursor: wait;
    opacity: 0.5;
  }
  input:focus-visible,
  button:focus-visible {
    outline: 2px solid #ff56ba;
    outline-offset: 2px;
  }
  form :global([data-slot='select-trigger']) {
    width: 100%;
    min-width: 0;
    height: auto;
    padding: 0.625rem 0.75rem;
    border-radius: 8px;
    font-size: 0.875rem;
  }
  .example-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .example-label strong {
    font-weight: 600;
  }
  .institution {
    font-weight: 400;
    opacity: 0.75;
  }
  .status {
    display: grid;
    flex: 1;
    min-width: 0;
    min-height: 1.5rem;
    align-items: center;
    font-size: 0.8125rem;
    color: var(--sl-color-gray-2, #495c62);
  }
  .status > span {
    grid-area: 1 / 1;
    min-width: 0;
  }
  .status-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .loading {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  .loading :global(img) {
    display: block;
    flex-shrink: 0;
    width: 0.875rem;
    height: 0.875rem;
  }
  :global([data-theme='dark']) .loading :global(img) {
    filter: invert(1);
  }
  .error {
    color: var(--sl-color-red-high, #b91c1c);
  }
  .result {
    border-top: 1px solid var(--sl-color-gray-5, #bac4c8);
  }
  .result-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }
  .options {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .options > div {
    flex: 1;
    min-width: 6rem;
  }
  .options input {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .actions > button {
    flex-shrink: 0;
  }
  button.cancel {
    padding: 0.375rem 0.25rem;
    border-color: transparent;
    background: transparent;
    color: var(--sl-color-gray-2, #495c62);
    font-size: 0.8125rem;
    font-weight: 400;
  }
  button.cancel:hover {
    color: #ff56ba;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .preview {
    width: 100%;
    margin-inline: auto;
    border: 1px solid var(--sl-color-gray-5, #bac4c8);
    border-radius: 8px;
    overflow: hidden;
    background-color: #fff;
    background-image: conic-gradient(
      #e6e6e6 25%,
      transparent 0 50%,
      #e6e6e6 0 75%,
      transparent 0
    );
    background-size: 20px 20px;
  }
  .preview img {
    display: block;
    width: 100%;
    height: auto;
    margin-inline: auto;
  }
  .code {
    padding: 1.25rem;
    border-top: 1px solid var(--sl-color-gray-5, #bac4c8);
    --allmaps-code-max-height: 30rem;
  }
</style>
