<script lang="ts">
  import { onDestroy, untrack } from 'svelte'
  import { fade } from 'svelte/transition'
  import { FileImage, ArrowUpRight } from 'phosphor-svelte'
  import * as Select from '../ui/select/index.js'
  import CodeBlock from '../CodeBlock.svelte'
  import LoadingSmall from '../LoadingSmall.svelte'
  import { annotationExamples } from '../../examples/annotations.js'
  import { fetchAnnotation } from '../../examples/annotation.js'
  import { validateAnnotationUrl } from '../../examples/source.js'
  import type { CodeThemeConfig, RenderedCodeBlock } from '../../code/types.js'
  import type { MapExampleOption } from '../../examples/types.js'
  import type { generateGeotiffExample } from '../../examples/geotiff.js'

  let {
    annotationUrl = annotationExamples[0].annotationUrl,
    examples = annotationExamples,
    codeTheme
  }: {
    annotationUrl?: string
    examples?: MapExampleOption[]
    codeTheme?: CodeThemeConfig
  } = $props()

  const id = $props.id()
  let draftUrl = $state(untrack(() => annotationUrl))
  let result = $state.raw<
    Awaited<ReturnType<typeof generateGeotiffExample>> & {
      highlighted: RenderedCodeBlock
    }
  >()
  let loading = $state(false)
  let error = $state('')
  let controller: AbortController | undefined
  const selectedExample = $derived(
    examples.find((option) => option.annotationUrl === draftUrl.trim())
  )

  function changeUrl(value: string) {
    controller?.abort()
    draftUrl = value
    result = undefined
    loading = false
    error = ''
  }

  async function generate() {
    controller?.abort()
    const request = new AbortController()
    controller = request
    error = ''
    loading = true
    try {
      const url = validateAnnotationUrl(draftUrl.trim())
      const [annotation, { generateGeotiffExample }] = await Promise.all([
        fetchAnnotation(url, request.signal),
        import('../../examples/geotiff.js')
      ])
      request.signal.throwIfAborted()
      const generated = await generateGeotiffExample(annotation)
      const { renderCode } = await import('../../code/renderer.js')
      const highlighted = await renderCode({
        code: generated.script,
        language: 'bash',
        folds: generated.folds,
        theme: codeTheme
      })
      if (!request.signal.aborted) result = { ...generated, highlighted }
    } catch (cause) {
      if (!request.signal.aborted) {
        result = undefined
        error =
          cause instanceof Error
            ? cause.message
            : 'Could not generate the script.'
      }
    } finally {
      if (!request.signal.aborted) loading = false
    }
  }

  function download() {
    if (!result) return
    const url = URL.createObjectURL(
      new Blob([result.script], { type: 'text/x-shellscript;charset=utf-8' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'allmaps-geotiff.sh'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  onDestroy(() => controller?.abort())
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

<div class="geotiff-example not-content">
  <form
    onsubmit={(event) => {
      event.preventDefault()
      void generate()
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
        <button type="submit" disabled={loading}>Generate script</button>
      </div>
    </div>
    <div class="status" role="status" aria-live="polite">
      {#if loading}
        <span class="loading" transition:fade={{ duration: 150 }}
          ><LoadingSmall /> Generating script…</span
        >
      {:else if error}
        <span class="error">{error}</span>
      {:else if result}
        <span
          >Script ready for {result.mapCount}
          {result.mapCount === 1 ? 'map' : 'maps'}.</span
        >
      {:else}
        <span
          >Choose a map or enter an annotation URL, then generate its script.</span
        >
      {/if}
    </div>
  </form>
  {#if result}
    <div class="result">
      <div class="result-header">
        <span>allmaps-geotiff.sh</span>
        <button type="button" onclick={download}>Download script</button>
      </div>
      <div class="script">
        <CodeBlock
          code={result.script}
          folds={result.folds}
          language="bash"
          theme={codeTheme}
          initial={result.highlighted}
          title="GeoTIFF script"
        />
      </div>
      <details>
        <summary>Required source images ({result.images.length})</summary>
        <p>
          Save each full-resolution JPEG alongside the script with the filename
          shown.
        </p>
        <ul class="source-images" role="list">
          {#each result.images as image (image.url)}
            <li>
              <span class="file-icon"
                ><FileImage size={22} aria-hidden="true" /></span
              >
              <div class="image-info">
                <code>{image.filename}</code>
                <span class="image-dimensions"
                  >JPEG · {image.width?.toLocaleString('en-US')} × {image.height?.toLocaleString(
                    'en-US'
                  )} pixels</span
                >
              </div>
              <a
                class="image-link"
                href={`${image.url}/info.json`}
                aria-label={`IIIF details for ${image.filename}`}
              >
                IIIF details <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </li>
          {/each}
        </ul>
      </details>
    </div>
  {/if}
</div>

<style>
  .geotiff-example {
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
  .status,
  details {
    font-size: 0.875rem;
  }
  .status {
    display: grid;
    min-height: 1.5rem;
    align-items: center;
  }
  .status > span {
    grid-area: 1 / 1;
  }
  .loading {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  .loading :global(img) {
    display: block;
    width: 1rem;
    height: 1rem;
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
  .script {
    --allmaps-code-max-height: 30rem;
  }
  details {
    margin-top: 1rem;
  }
  summary {
    cursor: pointer;
    font-weight: 500;
  }
  details p {
    margin-block: 0.75rem;
    color: var(--sl-color-gray-2, #495c62);
    font-size: 0.8125rem;
  }
  .source-images {
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--sl-color-gray-5, #bac4c8);
    border-radius: 8px;
    background: color-mix(
      in srgb,
      var(--sl-color-text, #182a2f) 3%,
      var(--sl-color-bg, #fff)
    );
  }
  .source-images li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
  }
  .source-images li + li {
    border-top: 1px solid var(--sl-color-gray-5, #bac4c8);
  }
  .file-icon {
    display: flex;
    color: var(--sl-color-gray-3, #495c62);
  }
  .image-info {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.75rem;
    flex: 1;
    min-width: min(100%, 12rem);
  }
  .image-info code {
    font-size: 0.8125rem;
    overflow-wrap: anywhere;
  }
  .image-dimensions {
    font-size: 0.75rem;
    color: var(--sl-color-gray-2, #495c62);
  }
  .image-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    text-decoration: none;
    white-space: nowrap;
  }
  .image-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .image-link:focus-visible {
    outline: 2px solid #ff56ba;
    outline-offset: 3px;
  }
  a {
    color: #ff56ba;
    text-decoration: underline;
  }
  code {
    font-family: var(--sl-font-mono, monospace);
  }
</style>
