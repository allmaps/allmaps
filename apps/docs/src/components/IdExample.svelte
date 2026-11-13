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
    class="[font-family:inherit] [font-weight:inherit] [line-height:inherit] cursor-pointer focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--sl-color-accent)] focus-visible:outline-offset-[3px] flex items-center justify-center gap-1.5 min-w-20 min-h-8 py-1 px-2 text-xs text-[color:var(--sl-color-accent)] bg-[color:var(--accent-fill)] border border-solid border-[color:var(--accent-border)] rounded hover:bg-[color:color-mix(in_srgb,var(--sl-color-accent)_12%,var(--sl-color-bg))]"
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
  <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
    <span class="font-semibold"
      >{separator === -1 ? label : label.slice(0, separator)}</span
    >{#if separator !== -1}<span class="font-normal opacity-75"
        >{label.slice(separator)}</span
      >{/if}
  </span>
{/snippet}

<section
  class="[--panel-fill:color-mix(in_srgb,var(--sl-color-gray-6)_42%,var(--sl-color-bg))] [--accent-fill:color-mix(in_srgb,var(--sl-color-accent)_6%,var(--sl-color-bg))] [--accent-border:color-mix(in_srgb,var(--sl-color-accent)_45%,var(--sl-color-gray-5))] border border-solid border-[color:var(--sl-color-gray-5)] rounded-xl text-[color:var(--sl-color-text)] bg-[color:var(--sl-color-bg)] text-sm leading-[1.5] overflow-hidden"
  aria-label="Compute Allmaps IDs"
>
  <div
    class="p-5 bg-[color:var(--panel-fill)] border-b border-solid border-b-[color:var(--sl-color-gray-5)] max-[40rem]:p-4"
  >
    <label
      class="block text-[0.8125rem] font-semibold mb-2"
      id={`${componentId}-example-label`}
      for={`${componentId}-example`}>Choose an example</label
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
      class="mt-4"
      onsubmit={(event) => {
        event.preventDefault()
        load()
      }}
    >
      <label
        class="block text-[0.8125rem] font-semibold mb-2"
        for={`${componentId}-url`}>Or enter a IIIF URL</label
      >
      <div class="flex gap-2 [&_input]:text-[0.8125rem] max-[40rem]:flex-col">
        <input
          class="[font-family:inherit] [font-size:inherit] [font-weight:inherit] [line-height:inherit] box-border w-full min-w-0 min-h-11 py-2.5 px-3 border border-solid border-[color:var(--sl-color-gray-5)] rounded-md text-[color:inherit] bg-[color:var(--sl-color-bg)] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--sl-color-accent)] focus-visible:outline-offset-[3px]"
          id={`${componentId}-url`}
          type="url"
          required
          bind:value={draftUrl}
          aria-describedby={`${componentId}-hint`}
          spellcheck="false"
        />
        <button
          class="[font-family:inherit] [font-size:inherit] [line-height:inherit] cursor-pointer flex items-center justify-center gap-3 shrink-0 py-2.5 px-3.5 border-0 rounded-md bg-[color:var(--sl-color-text)] text-[color:var(--sl-color-bg)] font-medium focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--sl-color-accent)] focus-visible:outline-offset-[3px] hover:opacity-85"
          type="submit">Show IDs <span aria-hidden="true">→</span></button
        >
      </div>
      <p
        id={`${componentId}-hint`}
        class="text-xs text-[color:var(--sl-color-gray-2)] [margin:0.5rem_0_0]"
      >
        Manifest, Collection, or image info.json
      </p>
    </form>
  </div>

  <div class="p-5 max-[40rem]:p-4">
    <div class="flex items-baseline justify-between gap-2 mb-2 [&_label]:m-0">
      <label
        class="block text-[0.8125rem] font-semibold mb-2"
        id={`${componentId}-resource-label`}
        for={`${componentId}-resource`}>Inspect an ID</label
      >
      <span role="status" class="text-xs text-[color:var(--sl-color-gray-2)]">
        {loading
          ? 'Loading…'
          : error
            ? ''
            : `${resources.length} ${resources.length === 1 ? 'resource' : 'resources'}`}
      </span>
    </div>
    {#if error}
      <p
        class="border-l-[2px] border-solid border-l-[color:var(--sl-color-accent)] pl-3"
        role="alert"
      >
        {error}
      </p>
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
          <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
            >{resourceOptions[selectedIndex]?.label}</span
          >
        </Select.Trigger>
        <Select.Content>
          {#each resourceOptions as option (option.index)}
            <Select.Item value={String(option.index)} label={option.label} />
          {/each}
        </Select.Content>
      </Select.Root>

      <div class="mt-6" aria-live="polite" aria-atomic="true">
        <ol
          class="list-none p-0 m-0"
          aria-label="From IIIF ID to annotation URL"
        >
          <li
            class="[ol_&]:grid [ol_&]:grid-cols-[1.75rem_minmax(0,1fr)] [ol_&]:gap-3 [ol_&]:relative [ol_&]:pb-6 [ol_&:last-child]:pb-0 [ol_&:not(:last-child)::before]:[content:''] [ol_&:not(:last-child)::before]:absolute [ol_&:not(:last-child)::before]:top-7 [ol_&:not(:last-child)::before]:bottom-0 [ol_&:not(:last-child)::before]:left-[0.84375rem] [ol_&:not(:last-child)::before]:w-[1px] [ol_&:not(:last-child)::before]:bg-[color:var(--sl-color-gray-5)]"
          >
            <span
              class="grid place-items-center w-7 h-7 box-border border border-solid border-[color:var(--sl-color-gray-5)] rounded-full text-xs tabular-nums text-[color:var(--sl-color-gray-2)] [[data-part~=result-step]_&]:bg-[color:var(--accent-fill)] [[data-part~=result-step]_&]:border-[color:var(--accent-border)] [[data-part~=result-step]_&]:text-[color:var(--sl-color-accent)]"
              aria-hidden="true">1</span
            >
            <div>
              <div
                class="flex items-center gap-3 min-h-7 mb-2 max-[40rem]:flex-wrap max-[40rem]:gap-y-1 max-[40rem]:gap-x-2"
              >
                <h3 class="text-sm font-semibold m-0">IIIF ID</h3>
                <span
                  class="text-[0.6875rem] [padding:0.1rem_0.4rem] rounded bg-[color:var(--panel-fill)] capitalize"
                  >{selectedResource.type}</span
                >
              </div>
              <code
                class="font-[family-name:var(--sl-font-mono)] text-[0.8125rem] leading-[1.7] wrap-anywhere block p-3 rounded-md bg-[color:var(--panel-fill)]"
                >{selectedResource.uri}</code
              >
              <p
                class="text-xs text-[color:var(--sl-color-gray-2)] [margin:0.5rem_0_0]"
              >
                Use this exact string as the input.
              </p>
            </div>
          </li>
          <li
            class="[ol_&]:grid [ol_&]:grid-cols-[1.75rem_minmax(0,1fr)] [ol_&]:gap-3 [ol_&]:relative [ol_&]:pb-6 [ol_&:last-child]:pb-0 [ol_&:not(:last-child)::before]:[content:''] [ol_&:not(:last-child)::before]:absolute [ol_&:not(:last-child)::before]:top-7 [ol_&:not(:last-child)::before]:bottom-0 [ol_&:not(:last-child)::before]:left-[0.84375rem] [ol_&:not(:last-child)::before]:w-[1px] [ol_&:not(:last-child)::before]:bg-[color:var(--sl-color-gray-5)]"
          >
            <span
              class="grid place-items-center w-7 h-7 box-border border border-solid border-[color:var(--sl-color-gray-5)] rounded-full text-xs tabular-nums text-[color:var(--sl-color-gray-2)] [[data-part~=result-step]_&]:bg-[color:var(--accent-fill)] [[data-part~=result-step]_&]:border-[color:var(--accent-border)] [[data-part~=result-step]_&]:text-[color:var(--sl-color-accent)]"
              aria-hidden="true">2</span
            >
            <div>
              <div
                class="flex items-center gap-3 min-h-7 mb-2 max-[40rem]:flex-wrap max-[40rem]:gap-y-1 max-[40rem]:gap-x-2"
              >
                <h3 class="text-sm font-semibold m-0">SHA-1 hash</h3>
                <span class="text-xs text-[color:var(--sl-color-gray-2)]"
                  >40 characters</span
                >
              </div>
              <code
                class="font-[family-name:var(--sl-font-mono)] text-[0.8125rem] leading-[1.7] wrap-anywhere rounded-md bg-[color:var(--panel-fill)] flex items-baseline flex-wrap gap-1.5 py-2.5 px-3 border border-solid border-[color:var(--sl-color-gray-5)] select-all"
                ><mark
                  class="text-[color:var(--sl-color-accent)] bg-[color:var(--accent-fill)] border border-solid border-[color:var(--accent-border)] rounded py-0.5 px-1.5 whitespace-nowrap"
                  >{selectedResource.allmapsId}</mark
                ><span class="text-[color:var(--sl-color-gray-2)] min-w-0"
                  >{selectedResource.hash.slice(16)}</span
                ></code
              >
              <p
                class="text-xs text-[color:var(--sl-color-gray-2)] [margin:0.5rem_0_0]"
              >
                The <span class="text-[color:var(--sl-color-text)] font-medium"
                  >first 16 characters</span
                > form the Allmaps ID.
              </p>
            </div>
          </li>
          <li
            class="[ol_&]:grid [ol_&]:grid-cols-[1.75rem_minmax(0,1fr)] [ol_&]:gap-3 [ol_&]:relative [ol_&]:pb-6 [ol_&:last-child]:pb-0 [ol_&:not(:last-child)::before]:[content:''] [ol_&:not(:last-child)::before]:absolute [ol_&:not(:last-child)::before]:top-7 [ol_&:not(:last-child)::before]:bottom-0 [ol_&:not(:last-child)::before]:left-[0.84375rem] [ol_&:not(:last-child)::before]:w-[1px] [ol_&:not(:last-child)::before]:bg-[color:var(--sl-color-gray-5)]"
            data-part="result-step"
          >
            <span
              class="grid place-items-center w-7 h-7 box-border border border-solid border-[color:var(--sl-color-gray-5)] rounded-full text-xs tabular-nums text-[color:var(--sl-color-gray-2)] [[data-part~=result-step]_&]:bg-[color:var(--accent-fill)] [[data-part~=result-step]_&]:border-[color:var(--accent-border)] [[data-part~=result-step]_&]:text-[color:var(--sl-color-accent)]"
              aria-hidden="true">3</span
            >
            <div>
              <div
                class="flex items-center gap-3 min-h-7 mb-2 max-[40rem]:flex-wrap max-[40rem]:gap-y-1 max-[40rem]:gap-x-2"
              >
                <h3 class="text-sm font-semibold m-0">Allmaps ID</h3>
              </div>
              <div
                class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 bg-[color:var(--accent-fill)] border border-solid border-[color:var(--accent-border)] rounded-md"
              >
                <code
                  class="font-[family-name:var(--sl-font-mono)] text-[0.8125rem] leading-[1.7] wrap-anywhere min-w-0 font-normal text-[color:var(--sl-color-accent)] select-all"
                  >{selectedResource.allmapsId}</code
                >
                {@render copyButton(selectedResource.allmapsId, 'Allmaps ID')}
              </div>
            </div>
          </li>
          <li
            class="[ol_&]:grid [ol_&]:grid-cols-[1.75rem_minmax(0,1fr)] [ol_&]:gap-3 [ol_&]:relative [ol_&]:pb-6 [ol_&:last-child]:pb-0 [ol_&:not(:last-child)::before]:[content:''] [ol_&:not(:last-child)::before]:absolute [ol_&:not(:last-child)::before]:top-7 [ol_&:not(:last-child)::before]:bottom-0 [ol_&:not(:last-child)::before]:left-[0.84375rem] [ol_&:not(:last-child)::before]:w-[1px] [ol_&:not(:last-child)::before]:bg-[color:var(--sl-color-gray-5)]"
            data-part="result-step"
          >
            <span
              class="grid place-items-center w-7 h-7 box-border border border-solid border-[color:var(--sl-color-gray-5)] rounded-full text-xs tabular-nums text-[color:var(--sl-color-gray-2)] [[data-part~=result-step]_&]:bg-[color:var(--accent-fill)] [[data-part~=result-step]_&]:border-[color:var(--accent-border)] [[data-part~=result-step]_&]:text-[color:var(--sl-color-accent)]"
              aria-hidden="true">4</span
            >
            <div>
              <div
                class="flex items-center gap-3 min-h-7 mb-2 max-[40rem]:flex-wrap max-[40rem]:gap-y-1 max-[40rem]:gap-x-2"
              >
                <h3 class="text-sm font-semibold m-0">Annotation URL</h3>
              </div>
              {#if annotationUrl}
                <div
                  class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 bg-[color:var(--accent-fill)] border border-solid border-[color:var(--accent-border)] rounded-md"
                >
                  <a
                    class="min-w-0 text-[color:var(--sl-color-accent)] underline [text-underline-offset:0.2em] hover:[text-decoration-thickness:2px] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-[color:var(--sl-color-accent)] focus-visible:outline-offset-[3px]"
                    href={annotationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <code
                      class="font-[family-name:var(--sl-font-mono)] text-[0.8125rem] leading-[1.7] wrap-anywhere min-w-0 font-normal text-[color:var(--sl-color-accent)] select-all"
                      >{annotationUrl}</code
                    >
                  </a>
                  {@render copyButton(annotationUrl, 'annotation URL')}
                </div>
              {:else}
                <p
                  class="text-xs text-[color:var(--sl-color-gray-2)] [margin:0.5rem_0_0]"
                >
                  Collections do not have an annotation endpoint. Select a
                  Manifest, Canvas, or image to get its annotation URL.
                </p>
              {/if}
            </div>
          </li>
        </ol>
      </div>
      {#if copyError}<p
          class="border-l-[2px] border-solid border-l-[color:var(--sl-color-accent)] pl-3"
          role="alert"
        >
          {copyError}
        </p>{/if}
    {/if}
  </div>
</section>
