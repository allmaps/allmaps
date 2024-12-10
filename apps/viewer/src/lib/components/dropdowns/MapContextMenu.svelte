<script lang="ts">
  import ContextMenu from '$lib/components/elements/ContextMenu.svelte'

  import MenuItem from '$lib/components/menu/MenuItem.svelte'

  // import MenuSeparator from '$lib/components/menu/MenuSeparator.svelte'

  import { mapWarpedMapLayer } from '$lib/shared/stores/openlayers.js'
  // import { hideMaps } from '$lib/shared/stores/visible.js'
  // import { mapsById } from '$lib/shared/stores/maps.js'
  // import { setCustomResourceMask } from '$lib/shared/stores/maps.js'

  // import { getFullResourceMask } from '@allmaps/stdlib'

  import {
    BringMapsToFront,
    BringMapsForward,
    SendMapsBackward,
    SendMapsToBack
  } from '@allmaps/ui'

  import type { FeatureContextMenu } from '$lib/shared/types.js'

  export let featureContextMenu: FeatureContextMenu

  const mapId = String(featureContextMenu.feature.getId())
  // const viewerMap = $mapsById.get(mapId)

  // function handleHideMap() {
  //   if (mapId) {
  //     hideMaps([mapId])
  //   }
  // }

  // function handleUseMask() {
  //   if (viewerMap) {
  //     const fullResourceMask = getFullResourceMask(
  //       viewerMap.map.resource.width,
  //       viewerMap.map.resource.height
  //     )
  //     setCustomResourceMask(mapId, fullResourceMask)
  //   }
  // }

  function handleBringMapsToFront() {
    mapWarpedMapLayer.bringMapsToFront([mapId])
  }

  function handleBringMapsForward() {
    mapWarpedMapLayer.bringMapsForward([mapId])
  }

  function handleSendMapsBackward() {
    mapWarpedMapLayer.sendMapsBackward([mapId])
  }

  function handleSendMapsToBack() {
    mapWarpedMapLayer.sendMapsToBack([mapId])
  }
</script>

<ContextMenu event={featureContextMenu.event}>
  <ol class="flex flex-col gap-1">
    <!-- <MenuItem label="Hide map" on:click={handleHideMap} />
    <MenuItem label="Use mask" on:click={handleUseMask} />

    <MenuSeparator /> -->
    <MenuItem label="Bring to Front" on:click={handleBringMapsToFront}
      ><BringMapsToFront /></MenuItem
    >
    <MenuItem label="Bring Forward" on:click={handleBringMapsForward}
      ><BringMapsForward /></MenuItem
    >
    <MenuItem label="Send Backward" on:click={handleSendMapsBackward}
      ><SendMapsBackward /></MenuItem
    >
    <MenuItem label="Send to Back" on:click={handleSendMapsToBack}
      ><SendMapsToBack /></MenuItem
    >
  </ol>
</ContextMenu>
