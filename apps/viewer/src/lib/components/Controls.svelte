<script lang="ts">
  import MapControls from '$lib/components/MapControls.svelte'
  import SelectView from '$lib/components/SelectView.svelte'
  import OpacityControl from '$lib/components/OpacityControl.svelte'
  import SelectMap from '$lib/components/SelectMap.svelte'
  import ZoomToExtent from '$lib/components/ZoomToExtent.svelte'

  type Props = {
    onZoomIn: () => void
    onZoomOut: () => void
    mapBearing: number
    onResetBearing: () => void
  }

  let { onZoomIn, onZoomOut, mapBearing, onResetBearing }: Props = $props()
</script>

<div class="w-full h-full grid grid-cols-3 grid-rows-3 gap-4 p-2">
  <div class="col-3 row-1 self-start place-self-end">
    <MapControls {onZoomIn} {onZoomOut} {mapBearing} {onResetBearing} />
  </div>

  <div class="col-1 row-3 self-end place-self-start">
    <SelectView />
  </div>
  <div class="col-2 row-3 self-end place-self-center">
    <OpacityControl />
  </div>
  <div class="col-3 row-3 place-self-end flex flex-row gap-2">
    <ZoomToExtent />
    <SelectMap />
  </div>
</div>
