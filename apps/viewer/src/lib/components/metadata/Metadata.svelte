<script lang="ts">
  import { parseLanguageString } from '@allmaps/iiif-inspector'

  import {
    parseSafeHref,
    parseSafeHtmlParts,
    type RichTextPart
  } from '$lib/shared/html.js'

  import MetadataResourceMenu from '../menu/MetadataResourceMenu.svelte'

  import type {
    Canvas as IIIFCanvas,
    Manifest as IIIFManifest,
    Metadata
  } from '@allmaps/iiif-parser'

  type ResourceType = 'manifest' | 'canvas' | 'image-service'
  type MetadataResource = IIIFManifest | IIIFCanvas
  type LinkItem = {
    id: string
    label?: Parameters<typeof parseLanguageString>[0]
    format?: string
  }
  type LinkItems = LinkItem[]

  type Props = {
    resource?: MetadataResource
    loading?: boolean
    uri?: string
    uriLabel?: string
    label?: string
    resourceType?: ResourceType
    width?: number
    height?: number
  }

  const dateLabelFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  let {
    resource,
    loading = false,
    uri,
    uriLabel,
    label,
    resourceType,
    width,
    height
  }: Props = $props()

  let description = $derived(parseText(resource?.description))
  let summary = $derived(parseText(resource?.summary))
  let requiredStatementLabel = $derived(
    parseText(resource?.requiredStatement?.label)
  )
  let requiredStatementValue = $derived(
    parseText(resource?.requiredStatement?.value)
  )
  let resourceUri = $derived(uri ?? resource?.uri)
  let resourceUriLabel = $derived(uriLabel ?? resourceUri ?? '')
  let resourceTypeValue = $derived(resourceType ?? getResourceType(resource))
  let resourceTypeLabel = $derived(getResourceTypeLabel(resourceTypeValue))
  let resourceLabel = $derived(label ?? parseText(resource?.label))
  let resourceWidth = $derived(isCanvas(resource) ? resource.width : width)
  let resourceHeight = $derived(isCanvas(resource) ? resource.height : height)
  let dimensions = $derived(formatDimensions(resourceWidth, resourceHeight))
  let hasMetadataItemsValue = $derived(hasMetadataItems(resource?.metadata))
  let hasNormalMetadata = $derived(
    !!resourceTypeLabel ||
      !!resourceUri ||
      !!resourceLabel ||
      !!dimensions ||
      !!description ||
      !!summary ||
      !!requiredStatementValue ||
      !!resource?.rights ||
      !!resource?.navDate ||
      hasLinks(resource?.homepage) ||
      hasLinks(resource?.seeAlso) ||
      hasLinks(resource?.rendering)
  )
  let hasMetadata = $derived(hasNormalMetadata || hasMetadataItemsValue)

  function parseText(value?: Parameters<typeof parseLanguageString>[0]) {
    if (!value) {
      return
    }

    return parseLanguageString(value, 'en')
  }

  function hasLinks(links?: LinkItems) {
    return links !== undefined && links.length > 0
  }

  function hasMetadataItems(metadata?: Metadata) {
    return metadata !== undefined && metadata.length > 0
  }

  function isCanvas(resource?: MetadataResource): resource is IIIFCanvas {
    return resource?.type === 'canvas'
  }

  function getResourceType(
    resource?: MetadataResource
  ): ResourceType | undefined {
    if (resource?.type === 'manifest') {
      return 'manifest'
    } else if (resource?.type === 'canvas') {
      return 'canvas'
    }
  }

  function getResourceTypeLabel(type?: ResourceType) {
    if (type === 'manifest') {
      return 'IIIF Manifest'
    } else if (type === 'canvas') {
      return 'IIIF Canvas'
    } else if (type === 'image-service') {
      return 'IIIF Image Service'
    }
  }

  function formatDate(date?: Date) {
    if (!date) {
      return
    }

    return dateLabelFormatter.format(date)
  }

  function formatDimensions(width?: number, height?: number) {
    if (width === undefined || height === undefined) {
      return
    }

    return `${Math.round(width)} x ${Math.round(height)} pixels`
  }

  function getLinkLabel(link: LinkItem, fallback: string) {
    if (link.label) {
      return parseText(link.label) || fallback
    }

    if (link.format) {
      return `${link.format} resource`
    }

    return fallback
  }

  function getRichTextPartKey(part: RichTextPart, index: number) {
    if (part.type === 'link') {
      return `${index}:link:${part.href}:${part.label}`
    } else if (part.type === 'text') {
      return `${index}:text:${part.value}`
    }

    return `${index}:break`
  }
</script>

{#snippet metadataLink(href: string, label: string, mono = false)}
  <a
    {href}
    target="_blank"
    rel="noopener noreferrer"
    class={[
      'inline-flex max-w-full items-center gap-1.5 text-pink underline',
      mono ? 'font-mono' : ''
    ]}
  >
    <span class="truncate">{label}</span>
  </a>
{/snippet}

{#snippet metadataValue(value: string)}
  {@const htmlParts = parseSafeHtmlParts(value)}
  {@const url = parseSafeHref(value)}
  {#if htmlParts}
    {#each htmlParts as part, index (getRichTextPartKey(part, index))}
      {#if part.type === 'link'}
        {@render metadataLink(part.href, part.label)}
      {:else if part.type === 'break'}
        <br />
      {:else}
        {part.value}
      {/if}
    {/each}
  {:else if url}
    {@render metadataLink(url, url)}
  {:else}
    {value}
  {/if}
{/snippet}

{#snippet linkItemsValue(links: LinkItems, fallback: string)}
  <ul class="space-y-1">
    {#each links as link (link.id)}
      <li>
        {@render metadataLink(link.id, getLinkLabel(link, fallback))}
      </li>
    {/each}
  </ul>
{/snippet}

<div class="p-2 inset-shadow-xs bg-white border border-gray-200 rounded-lg">
  {#if loading && !hasMetadata}
    <p class="text-xs text-gray-500 mt-2">Loading IIIF metadata…</p>
  {:else if hasMetadata}
    <div class="text-sm text-gray-700 mt-2">
      {#if hasNormalMetadata}
        <dl
          class="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 overflow-auto text-xs"
        >
          {#if resourceTypeLabel}
            <dt class="max-w-32 truncate font-medium text-gray-500">Type</dt>
            <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
              {resourceTypeLabel}
            </dd>
          {/if}

          {#if resourceUri}
            <dt class="max-w-32 truncate font-medium text-gray-500">ID</dt>
            <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
              {#if resourceTypeValue}
                <MetadataResourceMenu
                  id={resourceUriLabel}
                  openUrl={resourceUri}
                  type={resourceTypeValue}
                />
              {:else}
                {@render metadataLink(resourceUri, resourceUriLabel, true)}
              {/if}
            </dd>
          {/if}

          {#if resourceLabel}
            <dt class="max-w-32 truncate font-medium text-gray-500">Label</dt>
            <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
              {resourceLabel}
            </dd>
          {/if}

          {#if dimensions}
            <dt class="max-w-32 truncate font-medium text-gray-500">
              Dimensions
            </dt>
            <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
              {dimensions}
            </dd>
          {/if}

          {#if description}
            <dt class="max-w-32 truncate font-medium text-gray-500">
              Description
            </dt>
            <dd
              class="min-w-0 overflow-auto wrap-break-word leading-relaxed text-gray-700"
            >
              {description}
            </dd>
          {/if}

          {#if summary}
            <dt class="max-w-32 truncate font-medium text-gray-500">Summary</dt>
            <dd
              class="min-w-0 overflow-auto wrap-break-word leading-relaxed text-gray-700"
            >
              {summary}
            </dd>
          {/if}

          {#if resource?.navDate}
            <dt class="max-w-32 truncate font-medium text-gray-500">Date</dt>
            <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
              {formatDate(resource.navDate)}
            </dd>
          {/if}

          {#if requiredStatementValue}
            <dt class="max-w-32 truncate font-medium text-gray-500">
              {requiredStatementLabel ?? 'Required statement'}
            </dt>
            <dd
              class="min-w-0 max-h-24 overflow-auto wrap-break-word leading-relaxed text-gray-700"
            >
              {requiredStatementValue}
            </dd>
          {/if}

          {#if resource?.rights}
            <dt class="max-w-32 truncate font-medium text-gray-500">Rights</dt>
            <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
              {@render metadataLink(resource.rights, resource.rights)}
            </dd>
          {/if}

          {#if resource?.homepage?.length}
            <dt class="max-w-32 truncate font-medium text-gray-500">
              Related links
            </dt>
            <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
              {@render linkItemsValue(resource.homepage, 'Related resource')}
            </dd>
          {/if}

          {#if resource?.seeAlso?.length}
            <dt class="max-w-32 truncate font-medium text-gray-500">
              See also
            </dt>
            <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
              {@render linkItemsValue(resource.seeAlso, 'External resource')}
            </dd>
          {/if}

          {#if resource?.rendering?.length}
            <dt class="max-w-32 truncate font-medium text-gray-500">
              Other versions
            </dt>
            <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
              {@render linkItemsValue(resource.rendering, 'Other version')}
            </dd>
          {/if}
        </dl>
      {/if}

      {#if resource?.metadata?.length}
        <dl
          class={[
            'grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 overflow-auto text-xs',
            hasNormalMetadata ? 'mt-2 border-t border-gray-200 pt-2' : ''
          ]}
        >
          {#each resource.metadata as item, index (index)}
            {@const label = parseText(item.label)}
            {@const value = parseText(item.value)}
            {#if label && value}
              <dt class="max-w-32 truncate font-medium text-gray-500">
                {label}
              </dt>
              <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
                {@render metadataValue(value)}
              </dd>
            {/if}
          {/each}
        </dl>
      {/if}
    </div>
  {/if}
</div>
