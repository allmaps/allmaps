<script lang="ts">
  import ContextMenu from '$lib/components/elements/ContextMenu.svelte'

  import MenuItem from '$lib/components/menu/MenuItem.svelte'
  import MenuSeparator from '$lib/components/menu/MenuSeparator.svelte'

  import { mapWarpedMapSource } from '$lib/shared/stores/openlayers.js'
  import { hideMaps } from '$lib/shared/stores/visible.js'
  import { mapsById } from '$lib/shared/stores/maps.js'
  import { setCustomResourceMask } from '$lib/shared/stores/maps.js'

  import { getFullResourceMask } from '@allmaps/stdlib'

  import {
    BringToFront,
    BringForward,
    SendBackward,
    SendToBack
  } from '@allmaps/ui'

  import type { FeatureContextMenu } from '$lib/shared/types.js'

  export let featureContextMenu: FeatureContextMenu

  const mapId = String(featureContextMenu.feature.getId())
  const viewerMap = $mapsById.get(mapId)

  function handleHideMap() {
    if (mapId) {
      hideMaps([mapId])
    }
  }

  function handleUseMask() {
    if (viewerMap) {
      const fullResourceMask = getFullResourceMask(
        viewerMap.map.resource.width,
        viewerMap.map.resource.height
      )
      setCustomResourceMask(mapId, fullResourceMask)
    }
  }

  function handleBringToFront() {
    mapWarpedMapSource.bringToFront([mapId])
  }

  function handleBringForward() {
    mapWarpedMapSource.bringForward([mapId])
  }

  function handleSendBackward() {
    mapWarpedMapSource.sendBackward([mapId])
  }

  function handleSendToBack() {
    mapWarpedMapSource.sendToBack([mapId])
  }
</script>

<ContextMenu event={featureContextMenu.event}>
  <ol class="flex flex-col gap-1">
    <MenuItem label="Hide map" on:click={handleHideMap} />
    <MenuItem label="Use mask" on:click={handleUseMask} />

    <MenuSeparator />
    <MenuItem label="Bring to Front" on:click={handleBringToFront}
      ><BringToFront /></MenuItem
    >
    <MenuItem label="Bring Forward" on:click={handleBringForward}
      ><BringForward /></MenuItem
    >
    <MenuItem label="Send Backward" on:click={handleSendBackward}
      ><SendBackward /></MenuItem
    >
    <MenuItem label="Send to Back" on:click={handleSendToBack}
      ><SendToBack /></MenuItem
    >
  </ol>
</ContextMenu>
