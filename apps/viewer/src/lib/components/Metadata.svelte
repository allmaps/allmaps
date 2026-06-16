<script lang="ts">
  import { parseLanguageString } from '@allmaps/iiif-inspector'

  import type {
    Canvas as IIIFCanvas,
    Manifest as IIIFManifest,
    Metadata
  } from '@allmaps/iiif-parser'

  type MetadataResource = IIIFManifest | IIIFCanvas
  type LinkItem = {
    id: string
    label?: Parameters<typeof parseLanguageString>[0]
    format?: string
  }
  type LinkItems = LinkItem[]
  type ParsedAnchor = {
    href: string
    label: string
  }
  type MetadataValuePart =
    | {
        type: 'text'
        value: string
      }
    | {
        type: 'link'
        href: string
        label: string
      }
    | {
        type: 'break'
      }

  const METADATA_GRID_CLASS =
    'grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 overflow-auto text-xs'

  type Props = {
    resource?: MetadataResource
    loading?: boolean
    uri?: string
    uriLabel?: string
    label?: string
    width?: number
    height?: number
    class?: string
  }

  let {
    resource,
    loading = false,
    uri,
    uriLabel,
    label,
    width,
    height,
    class: className = ''
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
  let resourceLabel = $derived(label ?? parseText(resource?.label))
  let resourceWidth = $derived(isCanvas(resource) ? resource.width : width)
  let resourceHeight = $derived(isCanvas(resource) ? resource.height : height)
  let dimensions = $derived(formatDimensions(resourceWidth, resourceHeight))
  let hasMetadataItemsValue = $derived(hasMetadataItems(resource?.metadata))
  let hasNormalMetadata = $derived(
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

  function formatDate(date?: Date) {
    if (!date) {
      return
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date)
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

  function decodeHtmlEntities(value: string) {
    return value
      .replaceAll('&amp;', '&')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&quot;', '"')
      .replaceAll('&#39;', "'")
  }

  function isSafeHref(href: string) {
    try {
      const url = new URL(href)
      return ['http:', 'https:', 'mailto:'].includes(url.protocol)
    } catch {
      return false
    }
  }

  function parseAnchor(value: string): ParsedAnchor | undefined {
    const match = value.trim().match(/^<a\s+([^>]*)>([^<>]*)<\/a>$/i)

    if (!match) {
      return
    }

    const [, attributes, label] = match
    const hrefMatch = attributes.match(
      /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
    )
    const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3]

    if (!href || !isSafeHref(href)) {
      return
    }

    return {
      href,
      label: decodeHtmlEntities(label.trim()) || href
    }
  }

  function parseUrl(value: string) {
    const trimmedValue = value.trim()

    return isSafeHref(trimmedValue) ? trimmedValue : undefined
  }

  function parseMetadataHtml(value: string): MetadataValuePart[] | undefined {
    const trimmedValue = value.trim()

    if (!/<[^>]+>/.test(trimmedValue)) {
      return
    }

    const parts: MetadataValuePart[] = []
    const tagPattern = /<[^>]+>/g
    let lastIndex = 0
    let spanDepth = 0
    let activeLink:
      | {
          href: string
          label: string
        }
      | undefined

    const appendText = (text: string) => {
      if (!text) {
        return
      }

      const decodedText = decodeHtmlEntities(text)

      if (activeLink) {
        activeLink.label += decodedText
      } else if (decodedText) {
        parts.push({
          type: 'text',
          value: decodedText
        })
      }
    }

    for (const match of trimmedValue.matchAll(tagPattern)) {
      appendText(trimmedValue.slice(lastIndex, match.index))

      const tag = match[0].slice(1, -1).trim()

      if (/^span$/i.test(tag)) {
        spanDepth += 1
      } else if (/^\/span$/i.test(tag)) {
        if (spanDepth === 0 || activeLink) {
          return
        }

        spanDepth -= 1
      } else if (/^br\s*\/?$/i.test(tag)) {
        if (activeLink) {
          return
        }

        parts.push({ type: 'break' })
      } else if (/^a(?:\s|$)/i.test(tag)) {
        if (activeLink) {
          return
        }

        const hrefMatch = tag.match(
          /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
        )
        const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3]

        if (!href || !isSafeHref(href)) {
          return
        }

        activeLink = {
          href,
          label: ''
        }
      } else if (/^\/a$/i.test(tag)) {
        if (!activeLink) {
          return
        }

        parts.push({
          type: 'link',
          href: activeLink.href,
          label: activeLink.label.trim() || activeLink.href
        })
        activeLink = undefined
      } else {
        return
      }

      lastIndex = match.index + match[0].length
    }

    appendText(trimmedValue.slice(lastIndex))

    if (spanDepth !== 0 || activeLink) {
      return
    }

    return parts.length > 0 ? parts : undefined
  }
</script>

{#snippet metadataLink(href: string, label: string, mono = false)}
  <!-- eslint-disable svelte/no-navigation-without-resolve -->
  <a
    {href}
    target="_blank"
    rel="noopener noreferrer"
    class={[
      'inline-flex max-w-full items-center gap-1.5 text-pink underline decoration-pink/30 underline-offset-2 hover:text-black',
      mono ? 'font-mono' : ''
    ]}
  >
    <span class="truncate">{label}</span>
  </a>
  <!-- eslint-enable svelte/no-navigation-without-resolve -->
{/snippet}

{#snippet metadataValue(value: string)}
  {@const anchor = parseAnchor(value)}
  {@const htmlParts = parseMetadataHtml(value)}
  {@const url = parseUrl(value)}
  {#if htmlParts}
    {#each htmlParts as part, index (index)}
      {#if part.type === 'link'}
        {@render metadataLink(part.href, part.label)}
      {:else if part.type === 'break'}
        <br />
      {:else}
        {part.value}
      {/if}
    {/each}
  {:else if anchor}
    {@render metadataLink(anchor.href, anchor.label)}
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

{#if loading && !hasMetadata}
  <p class={['text-xs text-gray-500', className]}>Loading IIIF metadata…</p>
{:else if hasMetadata}
  <div class={['text-sm text-gray-700', className]}>
    {#if hasNormalMetadata}
      <dl class={METADATA_GRID_CLASS}>
        {#if resourceUri}
          <dt class="max-w-32 truncate font-medium text-gray-500">ID</dt>
          <dd class="min-w-0 overflow-auto wrap-break-word text-gray-700">
            {@render metadataLink(resourceUri, resourceUriLabel, true)}
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
          <dt class="max-w-32 truncate font-medium text-gray-500">See also</dt>
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
          METADATA_GRID_CLASS,
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
