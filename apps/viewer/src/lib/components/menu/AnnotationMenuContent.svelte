<script lang="ts">
  import type { Snippet } from 'svelte'
  import * as DropdownMenu from '@allmaps/ui/dropdown-menu'
  import {
    ArrowRightIcon,
    ArrowSquareOutIcon,
    CopyIcon,
    PencilSimpleIcon
  } from 'phosphor-svelte'

  let {
    children,
    viewerHref,
    viewerLabel,
    editorHref,
    annotationUrl,
    copyAnnotation,
    align = 'start'
  }: {
    children: Snippet
    viewerHref?: string
    viewerLabel: string
    editorHref?: string
    annotationUrl?: string
    copyAnnotation: () => Promise<void>
    align?: 'start' | 'end'
  } = $props()
</script>

{#snippet copyItem(label: string, copy: () => Promise<void>, disabled = false)}
  <DropdownMenu.Item onSelect={copy} {disabled}>
    {#snippet child({ props, state })}
      <div {...props}><CopyIcon aria-hidden="true" />{label}</div>
      {#if state.error}
        <p role="alert" class="px-2 py-1 text-sm text-destructive">
          Could not copy. Please try again.
        </p>
      {/if}
    {/snippet}
  </DropdownMenu.Item>
{/snippet}

<DropdownMenu.Content
  {align}
  onkeydown={(event) => {
    if (event.key === 'Escape') event.stopPropagation()
  }}
  sideOffset={4}
  class="pointer-events-auto w-64 max-w-[calc(100vw-1rem)]"
>
  <DropdownMenu.Group>
    <DropdownMenu.GroupHeading
      class="mb-1 rounded-sm bg-gray-100/50 px-2 py-2 text-xs leading-snug font-medium"
    >
      {@render children()}
    </DropdownMenu.GroupHeading>

    {#if viewerHref}
      <DropdownMenu.Item>
        {#snippet child({ props })}
          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- The caller supplies the resolved Viewer route. -->
          <a {...props} href={viewerHref}
            ><ArrowRightIcon aria-hidden="true" />{viewerLabel}</a
          >
        {/snippet}
      </DropdownMenu.Item>
    {/if}
    {#if editorHref}
      <DropdownMenu.Item>
        {#snippet child({ props })}
          <!-- eslint-disable svelte/no-navigation-without-resolve -- The Editor link opens an external application. -->
          <a
            {...props}
            href={editorHref}
            target="_blank"
            rel="noopener noreferrer"
            ><PencilSimpleIcon aria-hidden="true" />Edit in Allmaps Editor</a
          >
          <!-- eslint-enable svelte/no-navigation-without-resolve -->
        {/snippet}
      </DropdownMenu.Item>
    {/if}

    <DropdownMenu.Separator />
    <DropdownMenu.Item disabled={!annotationUrl}>
      {#snippet child({ props })}
        <!-- eslint-disable svelte/no-navigation-without-resolve -- This is the annotation document's URL. -->
        <a
          {...props}
          href={annotationUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ArrowSquareOutIcon aria-hidden="true" />Open annotation
        </a>
        <!-- eslint-enable svelte/no-navigation-without-resolve -->
      {/snippet}
    </DropdownMenu.Item>
    {@render copyItem(
      'Copy annotation URL',
      () => navigator.clipboard.writeText(annotationUrl!),
      !annotationUrl
    )}
    {@render copyItem('Copy annotation', copyAnnotation)}
  </DropdownMenu.Group>
</DropdownMenu.Content>
