<script lang="ts">
  import { Modal } from '@allmaps/components'

  import { getIiifState } from '$lib/state/iiif.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import {
    getGeoreferencedMapAttributionGroups,
    type AttributionPart
  } from '$lib/shared/attribution.js'

  type Props = {
    includeGeoreferencedMaps?: boolean
  }

  let { includeGeoreferencedMaps = true }: Props = $props()

  function getAttributionIiifState() {
    return includeGeoreferencedMaps ? getIiifState() : undefined
  }

  function getAttributionMapsState() {
    return includeGeoreferencedMaps ? getMapsState() : undefined
  }

  const iiifState = getAttributionIiifState()
  const mapsState = getAttributionMapsState()
  const uiState = getUiState()

  let georeferencedMapAttributionGroups = $derived(
    mapsState && iiifState
      ? getGeoreferencedMapAttributionGroups(
          mapsState.maps,
          (manifestId) => iiifState.getParsedManifest(manifestId),
          (manifestId) => iiifState.isManifestLoading(manifestId)
        )
      : []
  )

  $effect(() => {
    if (uiState.modalOpen.attribution && iiifState) {
      for (const manifestId of iiifState.manifestIds) {
        iiifState.fetchManifest(manifestId)
      }
    }
  })
</script>

{#snippet attributionPart(part: AttributionPart)}
  {#if part.type === 'link'}
    <a
      href={part.href}
      target="_blank"
      rel="noopener noreferrer"
      class="text-pink underline"
    >
      {part.label}
    </a>
  {:else if part.type === 'break'}
    <br />
  {:else}
    {part.value}
  {/if}
{/snippet}

{#snippet attributionParts(parts?: AttributionPart[])}
  {#if parts}
    {#each parts as part, index (index)}
      {@render attributionPart(part)}
    {/each}
  {:else}
    <span class="text-gray-400">-</span>
  {/if}
{/snippet}

<Modal bind:open={uiState.modalOpen.attribution}>
  {#snippet title()}
    Attribution & Licenses
  {/snippet}

  <div class="flex sm:w-xl max-w-full flex-col gap-4 text-gray-700">
    <section class="space-y-4">
      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt class="font-medium">Allmaps</dt>
        <dd>
          Allmaps Viewer is licensed under the <a
            href="https://opensource.org/licenses/GPL-3.0"
            class="text-pink underline">GPL-3.0 license</a
          >. Other parts of Allmaps are published under
          <a
            href="https://github.com/allmaps/allmaps#license"
            class="text-pink underline">other open source licenses</a
          >. The source code of Allmaps is
          <a
            class="text-pink underline"
            href="https://github.com/allmaps/allmaps">available on GitHub</a
          >.
        </dd>
        <dt class="font-medium">Base map</dt>
        <dt>
          ©
          <a
            href="https://www.openstreetmap.org/copyright"
            class="text-pink underline">OpenStreetMap</a
          >, rendered with
          <a href="https://protomaps.com/" class="text-pink underline"
            >Protomaps</a
          >,
          <a href="https://maplibre.org/" class="text-pink underline"
            >MapLibre</a
          >
          and the
          <a
            href="https://github.com/allmaps/allmaps/tree/main/packages/maplibre"
            class="text-pink underline">Allmaps plugin for MapLibre</a
          >.
        </dt>
        <dt class="font-medium">Data</dt>
        <dd>
          All Georeference Annotations published through the Allmaps API are
          licensed under the <a
            class="text-pink underline"
            href="https://creativecommons.org/publicdomain/zero/1.0/"
            >CC0 license</a
          >.
        </dd>

        <!--   <a
    href={attribution.href}
    target="_blank"
    rel="noopener noreferrer"
    class="text-pink underline"
  >
    {attribution.label}
  </a> -->

        <!--
export const softwareAttributions: AttributionLink[] = [
  {
    label: 'Allmaps',
    href: 'https://allmaps.org/'
  },
  {
    label: 'MapLibre',
    href: 'https://maplibre.org/'
  }
]

export const basemapAttributions: AttributionLink[] = [
  {
    label: 'Protomaps',
    href: 'https://protomaps.com/'
  },
  {
    label: 'OpenStreetMap',
    href: 'https://www.openstreetmap.org/copyright'
  }
] -->
      </dl>
    </section>

    <section class="space-y-4">
      <h4 class="font-semibold text-gray-900">Georeferenced maps</h4>
      {#if georeferencedMapAttributionGroups.length > 0}
        <div
          class="overflow-auto rounded border bg-gray-100/30 inset-shadow-xs border-gray-200 text-sm"
        >
          {#each georeferencedMapAttributionGroups as group (group.key)}
            <section class="border-t border-gray-200 first:border-t-0">
              {#if group.rows.length > 1 || (group.key.startsWith('manifest:') && group.rows[0]?.label !== group.label)}
                <h5
                  class="truncate px-2 py-1.5 font-semibold"
                  title={group.label}
                >
                  {group.label}
                </h5>
              {/if}

              <div class="divide-y divide-gray-100">
                {#each group.rows as row (row.key)}
                  <div class="px-2 py-1.5">
                    {#if row.label !== group.label || group.rows.length === 1}
                      <h6
                        class="mb-1.5 truncate font-medium text-gray-700"
                        title={row.label}
                      >
                        {row.label}
                      </h6>
                    {/if}

                    <dl
                      class="grid gap-x-3 gap-y-1 sm:grid-cols-[8rem_minmax(0,1fr)]"
                    >
                      <dt class="font-medium text-gray-500">Organization</dt>
                      <dd class="min-w-0 wrap-break-word">
                        {@render attributionParts(row.organization)}
                      </dd>

                      <dt class="font-medium text-gray-500">Attribution</dt>
                      <dd class="min-w-0 wrap-break-word">
                        {@render attributionParts(row.attribution)}
                      </dd>
                    </dl>
                  </div>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      {:else if iiifState?.hasLoadingManifests}
        <p class="text-gray-500">Loading attribution…</p>
      {:else}
        <p class="text-gray-500">No attribution available.</p>
      {/if}
    </section>
  </div>
</Modal>
