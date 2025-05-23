<script lang="ts">
  import { fade } from 'svelte/transition'

  import { ArrowSquareOut as ArrowSquareOutIcon } from 'phosphor-svelte'

  import Popover from '$lib/components/Popover.svelte'

  import { truncate } from '$lib/shared/strings.js'

  import {
    findCanvases,
    findManifests,
    labelFromPartOfItem
  } from '$lib/shared/iiif.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  type Props = {
    map: GeoreferencedMap
  }

  let { map: propMap }: Props = $props()

  // Somehow, directly using map sometimes results in a map is undefined error
  // This happens when switching between layouts
  // This solves it. Maybe a bug in Svelte? Or I'm doing something wrong?
  let map = $state.raw<GeoreferencedMap>()
  $effect.pre(() => {
    if (propMap) {
      map = propMap
    }
  })

  const manifests = $derived(map ? findManifests(map.resource.partOf) : [])
  const canvases = $derived(map ? findCanvases(map.resource.partOf) : [])

  const firstCanvasWithManifestLabel = $derived.by(() =>
    canvases
      .map((canvas) => ({
        canvas,
        label: labelFromPartOfItem(canvas),
        manifests: findManifests(canvas.partOf)
          .map((manifest) => ({
            manifest,
            label: labelFromPartOfItem(manifest)
          }))
          .filter((manifest) => manifest.label)
      }))
      .find((canvas) => canvas.label && canvas.manifests.length > 0)
  )

  const firstCanvasLabel = $derived.by(() =>
    canvases
      .map((canvas) => ({
        canvas,
        label: labelFromPartOfItem(canvas)
      }))
      .find((canvas) => canvas.label)
  )
  const firstManifestLabel = $derived.by(() =>
    manifests
      .map((manifest) => ({
        manifest,
        label: labelFromPartOfItem(manifest)
      }))
      .find((manifest) => manifest.label)
  )

  let labels = $derived.by(() => {
    if (firstCanvasWithManifestLabel) {
      const canvasLabel = firstCanvasWithManifestLabel.label
      const manifestLabel = firstCanvasWithManifestLabel.manifests[0].label

      return [canvasLabel, manifestLabel]
    } else if (firstCanvasLabel) {
      return [firstCanvasLabel.label]
    } else if (firstManifestLabel) {
      return [firstManifestLabel.label]
    } else if (map?.resource.id) {
      return [`Map from ${new URL(map.resource.id).host}`]
    }
  })

  let title = $derived(labels?.map((label) => truncate(label)).join(' / '))
</script>

{#if title}
  <Popover>
    {#snippet button()}
      <div
        class="max-w-lg min-w-0 truncate shadow hover:shadow-lg inset-shadow-none hover:inset-shadow-sm
      transition-shadow duration-1000 bg-white rounded-md px-3 py-2 cursor-pointer text-xs"
      >
        {title}
      </div>
    {/snippet}
    {#snippet contents()}
      {#if map}
        <div
          transition:fade
          class="bg-white rounded p-2 shadow flex flex-col gap-2"
        >
          <input class="w-full" readonly value={map.id} />

          <!-- annotation URL -->
          <!-- metadata -->

          <div class="flex gap-2">
            <a
              class="flex gap-1 items-center bg-orange px-2 py-1 rounded-lg"
              href="https://viewer.allmaps.org/?url={map.id}"
            >
              <ArrowSquareOutIcon size="16" weight="bold" />
              Allmaps Viewer
            </a>
            <a
              class="flex gap-1 items-center bg-yellow px-2 py-1 rounded-lg"
              href="https://editor.allmaps.org/images?url={map.resource
                .id}/info.json"
            >
              <ArrowSquareOutIcon size="16" weight="bold" />
              Allmaps Editor
            </a>
          </div>
        </div>
      {/if}
    {/snippet}
  </Popover>
{/if}
