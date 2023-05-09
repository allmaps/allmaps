<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  import type { SelectEvent } from 'ol/interaction/Select.js'

  import {
    mapOl,
    mapWarpedMapSource,
    mapVectorSource,
    mapSelect
  } from '$lib/shared/stores/openlayers.js'
  import { sourceLoading, sourcesCount } from '$lib/shared/stores/sources.js'
  import { activeMap } from '$lib/shared/stores/active.js'
  import {
    selectedMaps,
    updateSelectedMaps
  } from '$lib/shared/stores/selected.js'

  import { idsFromFeatures } from '$lib/shared/openlayers.js'

  import { computeBBox } from '@allmaps/stdlib'

  import ContextMenu from '$lib/components/elements/ContextMenu.svelte'
  import HiddenWarpedMap from '$lib/components/elements/HiddenWarpedMap.svelte'

  import type { ShowContextMenu } from '$lib/shared/types.js'

  let ol: HTMLElement
  let showContextMenu: ShowContextMenu | undefined

  function fitExtent() {
    const extent = mapWarpedMapSource.getExtent()
    if (extent && mapOl) {
      mapOl.getView().fit(extent, {
        padding: [25, 25, 25, 25]
      })
    }
  }

  $: {
    if (!$sourceLoading && $sourcesCount > 0) {
      fitExtent()
    }
  }

  $: {
    if (mapOl && $activeMap && $activeMap.updateView) {
      const warpedMap = mapWarpedMapSource?.getMap($activeMap.viewerMap.mapId)
      if (warpedMap) {
        const bbox = computeBBox(warpedMap.geoMask.coordinates[0])
        mapOl.getView().fit(bbox, {
          duration: 200,
          padding: [25, 25, 25, 25]
        })
      }
    }
  }

  function handleSelect(event: SelectEvent) {
    const selectedMapIds = idsFromFeatures(event.selected)
    const deselectedMapIds = idsFromFeatures(event.deselected)

    updateSelectedMaps(selectedMapIds, deselectedMapIds, false)
  }

  onMount(async () => {
    mapOl?.setTarget(ol)
    mapSelect?.on('select', handleSelect)

    ol.addEventListener('contextmenu', (event) => {
      if (mapOl) {
        event.preventDefault()

        // TODO: use selected maps
        const feature = mapOl.forEachFeatureAtPixel(
          mapOl.getEventPixel(event),
          (feature) => feature
        )

        if (feature) {
          console.log('show context menu', feature)
          showContextMenu = {
            event,
            feature
          }
        }
      }
    })

    fitExtent()
  })

  onDestroy(() => {
    mapSelect?.un('select', handleSelect)
    mapOl?.setTarget()
  })
</script>

<div id="ol" bind:this={ol} class="w-full h-full" />
{#if showContextMenu}
    <MapContextMenu show={showContextMenu} />
{/if}
{#if mapVectorSource && mapSelect}
  <div class="hidden">
    <ol>
      {#each $selectedMaps as viewerMap (viewerMap.mapId)}
        <li>
          <HiddenWarpedMap
            vectorSource={mapVectorSource}
            select={mapSelect}
            {viewerMap}
          />
        </li>
      {/each}
    </ol>
  </div>
{/if}
