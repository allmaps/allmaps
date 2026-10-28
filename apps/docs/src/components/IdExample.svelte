<script lang="ts">
  import * as Select from '@allmaps/ui/select'
  import { getResourceIds, type ResourceId } from '../lib/iiif-ids'

  // The same maps as the viewing-maps guide, using their original IIIF URLs.
  const examples = [
    {
      label: 'Saigon — Bibliothèque nationale de France',
      url: 'https://gallica.bnf.fr/iiif/ark:/12148/btv1b530297676/manifest.json'
    },
    {
      label: 'Amsterdam — Universiteitsbibliotheek van Amsterdam',
      url: 'https://uvaerfgoed.nl/viewer/api/v1/records/11245_3_40101/manifest/'
    },
    {
      label: 'Rotterdam, 10 sheets — Stadsarchief Rotterdam',
      url: 'https://sammeltassen.nl/iiif-manifests/stadsarchief-rotterdam/NL-RtSA_4201_I-118.json'
    },
    {
      label: 'Saigon — IIIF image',
      url: 'https://gallica.bnf.fr/iiif/ark:/12148/btv1b530297676/f1/info.json'
    }
  ]

  const componentId = $props.id()
  let draftUrl = $state(examples[0].url)
  let submittedUrl = $state(examples[0].url)
  let attempt = $state(0)
  let resources = $state<ResourceId[]>([])
  let selectedIndex = $state(0)
  let loading = $state(true)
  let error = $state('')
  let copiedValue = $state('')
  let copyError = $state('')
  const selectedResource = $derived(resources[selectedIndex])
  const annotationUrl = $derived.by(() => {
    if (!selectedResource) return
    const paths: Record<string, string> = {
      image: 'images',
      canvas: 'canvases',
      manifest: 'manifests'
    }
    const path = paths[selectedResource.type]
    if (path) {
      return `https://annotations.allmaps.org/${path}/${selectedResource.allmapsId}`
    }
  })
  const selectedExample = $derived(
    examples.find((example) => example.url === draftUrl)?.url ?? ''
  )
  const resourceOptions = $derived.by(() => {
    const counts = new Map<string, number>()
    return resources.map((resource, index) => {
      const count = (counts.get(resource.type) ?? 0) + 1
      counts.set(resource.type, count)
      const name = resource.uri.split('/').filter(Boolean).at(-1)
      const type = resource.type[0].toUpperCase() + resource.type.slice(1)
      return { index, label: `${type} ${count} · ${name}` }
    })
  })

  async function copyValue(value: string) {
    copyError = ''
    try {
      await navigator.clipboard.writeText(value)
      copiedValue = value
    } catch {
      copyError = 'Could not copy. Select the value to copy it manually.'
    }
  }

  function load() {
    submittedUrl = draftUrl.trim()
    attempt += 1
  }

  $effect(() => {
    const url = submittedUrl
    void attempt
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)
    let active = true
    loading = true
    error = ''
    resources = []
    selectedIndex = 0
    copiedValue = ''
    copyError = ''

    async function fetchIds() {
      try {
        const parsedUrl = new URL(url)
        if (
          !['http:', 'https:'].includes(parsedUrl.protocol) ||
          parsedUrl.username ||
          parsedUrl.password
        ) {
          throw new Error('Enter an HTTP or HTTPS URL without credentials.')
        }
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`The resource returned HTTP ${response.status}.`)
        }
        let result: ResourceId[]
        try {
          const document = await response.json()
          result = getResourceIds(document)
        } catch {
          throw new Error(
            'This document could not be read as a IIIF Manifest, Collection, or image info.json.'
          )
        }
        if (active) resources = result
      } catch (cause) {
        if (active) {
          error = controller.signal.aborted
            ? 'Loading timed out. Try again or choose another resource.'
            : cause instanceof TypeError
              ? 'Could not load this URL. Check the address and whether its server allows browser requests (CORS).'
              : cause instanceof Error
                ? cause.message
                : 'Could not load this IIIF resource.'
        }
      } finally {
        clearTimeout(timeout)
        if (active) loading = false
      }
    }

    void fetchIds()
    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  })
</script>

{#snippet copyButton(value: string, label: string)}
  <button
    type="button"
    class="copy-button"
    aria-label={copiedValue === value ? `${label} copied` : `Copy ${label}`}
    onclick={() => copyValue(value)}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </svg>
    {copiedValue === value ? 'Copied' : 'Copy'}
  </button>
{/snippet}

{#snippet exampleLabel(label: string)}
  {@const separator = label.indexOf(' — ')}
  <span class="select-label">
    <span class="example-title"
      >{separator === -1 ? label : label.slice(0, separator)}</span
    >{#if separator !== -1}<span class="example-institution"
        >{label.slice(separator)}</span
      >{/if}
  </span>
{/snippet}

<section class="id-example" aria-label="Compute Allmaps IDs">
  <div class="source-controls">
    <label id={`${componentId}-example-label`} for={`${componentId}-example`}
      >Choose an example</label
    >
    <Select.Root
      type="single"
      items={examples.map(({ url, label }) => ({ value: url, label }))}
      value={selectedExample}
      onValueChange={(value) => {
        if (!value) return
        draftUrl = value
        load()
      }}
    >
      <Select.Trigger
        id={`${componentId}-example`}
        aria-labelledby={`${componentId}-example-label`}
      >
        {@render exampleLabel(
          examples.find((example) => example.url === selectedExample)?.label ??
            'Your own IIIF resource'
        )}
      </Select.Trigger>
      <Select.Content>
        {#each examples as example (example.url)}
          <Select.Item value={example.url} label={example.label}>
            {#snippet children()}
              {@render exampleLabel(example.label)}
            {/snippet}
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>

    <form
      onsubmit={(event) => {
        event.preventDefault()
        load()
      }}
    >
      <label for={`${componentId}-url`}>Or enter a IIIF URL</label>
      <div class="url-input">
        <input
          id={`${componentId}-url`}
          type="url"
          required
          bind:value={draftUrl}
          aria-describedby={`${componentId}-hint`}
          spellcheck="false"
        />
        <button class="load-button" type="submit"
          >Show IDs <span aria-hidden="true">→</span></button
        >
      </div>
      <p id={`${componentId}-hint`} class="hint">
        Manifest, Collection, or image info.json
      </p>
    </form>
  </div>

  <div class="inspector">
    <div class="resource-heading">
      <label
        id={`${componentId}-resource-label`}
        for={`${componentId}-resource`}>Inspect an ID</label
      >
      <span role="status" class="status">
        {loading
          ? 'Loading…'
          : error
            ? ''
            : `${resources.length} ${resources.length === 1 ? 'resource' : 'resources'}`}
      </span>
    </div>
    {#if error}
      <p role="alert">{error}</p>
    {/if}

    {#if selectedResource}
      <Select.Root
        type="single"
        items={resourceOptions.map(({ index, label }) => ({
          value: String(index),
          label
        }))}
        value={String(selectedIndex)}
        onValueChange={(value) => {
          if (!value) return
          selectedIndex = Number(value)
          copiedValue = ''
          copyError = ''
        }}
      >
        <Select.Trigger
          id={`${componentId}-resource`}
          aria-labelledby={`${componentId}-resource-label`}
        >
          <span class="select-label"
            >{resourceOptions[selectedIndex]?.label}</span
          >
        </Select.Trigger>
        <Select.Content>
          {#each resourceOptions as option (option.index)}
            <Select.Item value={String(option.index)} label={option.label} />
          {/each}
        </Select.Content>
      </Select.Root>

      <div class="calculation" aria-live="polite" aria-atomic="true">
        <ol aria-label="From IIIF ID to annotation URL">
          <li>
            <span class="step-number" aria-hidden="true">1</span>
            <div class="step-content">
              <div class="step-heading">
                <h3>IIIF ID</h3>
                <span class="resource-type">{selectedResource.type}</span>
              </div>
              <code class="source-id">{selectedResource.uri}</code>
              <p class="hint">Use this exact string as the input.</p>
            </div>
          </li>
          <li>
            <span class="step-number" aria-hidden="true">2</span>
            <div class="step-content">
              <div class="step-heading">
                <h3>SHA-1 hash</h3>
                <span class="step-detail">40 characters</span>
              </div>
              <code class="hash"
                ><mark>{selectedResource.allmapsId}</mark
                ><span class="hash-remainder"
                  >{selectedResource.hash.slice(16)}</span
                ></code
              >
              <p class="hint">
                The <span class="retained-label">first 16 characters</span> form
                the Allmaps ID.
              </p>
            </div>
          </li>
          <li class="result-step">
            <span class="step-number" aria-hidden="true">3</span>
            <div class="step-content">
              <div class="step-heading"><h3>Allmaps ID</h3></div>
              <div class="result-row">
                <code class="result">{selectedResource.allmapsId}</code>
                {@render copyButton(selectedResource.allmapsId, 'Allmaps ID')}
              </div>
            </div>
          </li>
          <li class="result-step">
            <span class="step-number" aria-hidden="true">4</span>
            <div class="step-content">
              <div class="step-heading"><h3>Annotation URL</h3></div>
              {#if annotationUrl}
                <div class="result-row">
                  <a
                    class="annotation-url"
                    href={annotationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <code class="result">{annotationUrl}</code>
                  </a>
                  {@render copyButton(annotationUrl, 'annotation URL')}
                </div>
              {:else}
                <p class="hint">
                  Collections do not have an annotation endpoint. Select a
                  Manifest, Canvas, or image to get its annotation URL.
                </p>
              {/if}
            </div>
          </li>
        </ol>
      </div>
      {#if copyError}<p role="alert">{copyError}</p>{/if}
    {/if}
  </div>
</section>

<style>
  .id-example {
    --panel-fill: color-mix(
      in srgb,
      var(--sl-color-gray-6) 42%,
      var(--sl-color-bg)
    );
    --accent-fill: color-mix(
      in srgb,
      var(--sl-color-accent) 6%,
      var(--sl-color-bg)
    );
    --accent-border: color-mix(
      in srgb,
      var(--sl-color-accent) 45%,
      var(--sl-color-gray-5)
    );
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 0.75rem;
    color: var(--sl-color-text);
    background: var(--sl-color-bg);
    font-size: 0.875rem;
    line-height: 1.5;
    overflow: hidden;
  }
  .source-controls,
  .inspector {
    padding: 1.25rem;
  }
  .source-controls {
    background: var(--panel-fill);
    border-bottom: 1px solid var(--sl-color-gray-5);
  }
  label {
    display: block;
    font-size: 0.8125rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  input,
  button {
    font: inherit;
  }
  input {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    min-height: 2.75rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 0.375rem;
    color: inherit;
    background: var(--sl-color-bg);
  }
  form {
    margin-top: 1rem;
  }
  .url-input {
    display: flex;
    gap: 0.5rem;
  }
  .url-input input {
    font-size: 0.8125rem;
  }
  button {
    cursor: pointer;
  }
  .load-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    flex-shrink: 0;
    padding: 0.625rem 0.875rem;
    border: 0;
    border-radius: 0.375rem;
    background: var(--sl-color-text);
    color: var(--sl-color-bg);
    font-weight: 500;
  }
  .load-button:hover {
    opacity: 0.85;
  }
  :is(button, input):focus-visible {
    outline: 2px solid var(--sl-color-accent);
    outline-offset: 3px;
  }
  .select-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .example-title {
    font-weight: 600;
  }
  .example-institution {
    font-weight: 400;
    opacity: 0.75;
  }
  .hint {
    font-size: 0.75rem;
    color: var(--sl-color-gray-2);
    margin: 0.5rem 0 0;
  }
  .resource-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .resource-heading label {
    margin: 0;
  }
  .status {
    font-size: 0.75rem;
    color: var(--sl-color-gray-2);
  }
  [role='alert'] {
    border-left: 2px solid var(--sl-color-accent);
    padding-left: 0.75rem;
  }
  .calculation {
    margin-top: 1.5rem;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  ol li {
    display: grid;
    grid-template-columns: 1.75rem minmax(0, 1fr);
    gap: 0.75rem;
    position: relative;
    padding-bottom: 1.5rem;
  }
  ol li:not(:last-child)::before {
    content: '';
    position: absolute;
    top: 1.75rem;
    bottom: 0;
    left: 0.84375rem;
    width: 1px;
    background: var(--sl-color-gray-5);
  }
  ol li:last-child {
    padding-bottom: 0;
  }
  .step-number {
    display: grid;
    place-items: center;
    width: 1.75rem;
    height: 1.75rem;
    box-sizing: border-box;
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 50%;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    color: var(--sl-color-gray-2);
  }
  .step-heading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 1.75rem;
    margin-bottom: 0.5rem;
  }
  h3 {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
  }
  .resource-type {
    font-size: 0.6875rem;
    padding: 0.1rem 0.4rem;
    border-radius: 0.25rem;
    background: var(--panel-fill);
    text-transform: capitalize;
  }
  .step-detail {
    font-size: 0.75rem;
    color: var(--sl-color-gray-2);
  }
  code {
    font-family: var(--sl-font-mono);
    font-size: 0.8125rem;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
  .source-id,
  .hash {
    display: block;
    padding: 0.75rem;
    border-radius: 0.375rem;
    background: var(--panel-fill);
  }
  .hash {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.375rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid var(--sl-color-gray-5);
    user-select: all;
  }
  mark {
    color: var(--sl-color-accent);
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
    border-radius: 0.25rem;
    padding: 0.125rem 0.375rem;
    white-space: nowrap;
  }
  .hash-remainder {
    color: var(--sl-color-gray-2);
    min-width: 0;
  }
  .retained-label {
    color: var(--sl-color-text);
    font-weight: 500;
  }
  .result-step .step-number {
    background: var(--accent-fill);
    border-color: var(--accent-border);
    color: var(--sl-color-accent);
  }
  .result-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
    border-radius: 0.375rem;
  }
  .result {
    min-width: 0;
    font-weight: 400;
    color: var(--sl-color-accent);
    user-select: all;
  }
  .annotation-url {
    min-width: 0;
    color: var(--sl-color-accent);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .annotation-url:hover {
    text-decoration-thickness: 2px;
  }
  .annotation-url:focus-visible {
    outline: 2px solid var(--sl-color-accent);
    outline-offset: 3px;
  }
  .copy-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    min-width: 5rem;
    min-height: 2rem;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    color: var(--sl-color-accent);
    background: var(--accent-fill);
    border: 1px solid var(--accent-border);
    border-radius: 0.25rem;
  }
  .copy-button:hover {
    background: color-mix(
      in srgb,
      var(--sl-color-accent) 12%,
      var(--sl-color-bg)
    );
  }
  @media (max-width: 40rem) {
    .source-controls,
    .inspector {
      padding: 1rem;
    }
    .url-input {
      flex-direction: column;
    }
    .step-heading {
      flex-wrap: wrap;
      gap: 0.25rem 0.5rem;
    }
  }
</style>
