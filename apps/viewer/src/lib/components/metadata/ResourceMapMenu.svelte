<script lang="ts">
  import { onMount } from 'svelte'
  import { resolve } from '$app/paths'
  import * as DropdownMenu from '@allmaps/ui/dropdown-menu'
  import CaretDownIcon from 'phosphor-svelte/lib/CaretDownIcon'
  import { generateId } from '@allmaps/id/sync'
  import { Logo } from '@allmaps/ui'
  import AnnotationMenuContent from '$lib/components/menu/AnnotationMenuContent.svelte'
  import { copyPublishedAnnotation } from '$lib/shared/map-actions.js'
  import { annotationsBaseUrl } from '$lib/shared/auth.js'
  import { getIiifState } from '$lib/state/iiif.svelte.js'

  let { kind, uri }: { kind: 'manifest' | 'image'; uri: string } = $props()
  const iiifState = getIiifState()
  let anchor: HTMLSpanElement
  let visible = $state(false)
  let path = $derived(`${kind}s/${generateId(uri)}`)
  let annotationUrl = $derived(`${annotationsBaseUrl}/${path}`)
  let href = $derived(
    `${resolve('/(app)')}?${new URLSearchParams({ url: annotationUrl })}`
  )

  let editorHref = $derived(
    kind === 'manifest'
      ? `https://editor.allmaps.org/images?${new URLSearchParams({ url: uri })}`
      : `https://editor.allmaps.org/mask?${new URLSearchParams({ url: `${uri}/info.json` })}`
  )

  onMount(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        visible = true
        observer.disconnect()
      }
    })
    observer.observe(anchor)
    return () => observer.disconnect()
  })
</script>

<span
  bind:this={anchor}
  class="pointer-events-none absolute size-px"
  aria-hidden="true"
></span>
{#if visible}
  {#await iiifState.getPublishedMapCount(path) then count}
    {#if count}
      {@const countLabel = count === 1 ? '1 map' : `${count} maps`}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="relative z-10 inline-flex shrink-0 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-pink"
          aria-label={`${countLabel} — ${kind} map options`}
        >
          <span class="size-3.5" aria-hidden="true"><Logo /></span>
          {countLabel}
          <CaretDownIcon class="size-3 shrink-0" aria-hidden="true" />
        </DropdownMenu.Trigger>
        <AnnotationMenuContent
          align="end"
          viewerHref={href}
          viewerLabel={count === 1
            ? `Open ${kind}`
            : count === 2
              ? 'Open both maps'
              : `Open all ${count} maps`}
          {editorHref}
          {annotationUrl}
          copyAnnotation={() => copyPublishedAnnotation(annotationUrl)}
        >
          {count} georeferenced {count === 1 ? 'map' : 'maps'}
          {kind === 'manifest' ? 'in this IIIF Manifest' : 'on this image'}
        </AnnotationMenuContent>
      </DropdownMenu.Root>
    {/if}
  {/await}
{/if}
