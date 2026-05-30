<script lang="ts">
  import { NorthArrow } from '@allmaps/components'

  import MapControls from '$lib/components/MapControls.svelte'
  import SelectView from '$lib/components/SelectView.svelte'
  import OpacityControl from '$lib/components/OpacityControl.svelte'
  import BackgroundColorControl from '$lib/components/BackgroundColorControl.svelte'
  import PrevNext from '$lib/components/PrevNext.svelte'

  type Props = {
    onZoomIn: () => void
    onZoomOut: () => void
    onZoomToExtent: () => void
    mapBearing: number
    imageUpBearing?: number
    onResetBearing: () => void
  }

  let {
    onZoomIn,
    onZoomOut,
    onZoomToExtent,
    mapBearing,
    imageUpBearing,
    onResetBearing
  }: Props = $props()

  let imageUpRotation = $derived(
    imageUpBearing === undefined ? undefined : imageUpBearing - mapBearing
  )
</script>

<div
  class="w-full h-full grid grid-cols-[auto_auto_auto] sm:grid-cols-3 grid-rows-3 gap-4 p-2"
>
  <div class="col-3 row-1 self-start place-self-end">
    <MapControls {onZoomIn} {onZoomOut} {onZoomToExtent} />
  </div>

  <div class="col-1 row-3 self-end place-self-start flex flex-row gap-2">
    <SelectView />
    <div class="self-center">
      <PrevNext />
    </div>
  </div>
  <div class="col-2 row-3 self-end place-self-center flex flex-row gap-1">
    <div>
      <OpacityControl />
    </div>
    <div>
      <BackgroundColorControl />
    </div>
  </div>
  <div
    class="col-3 row-3 place-self-end flex flex-row gap-2 *:pointer-events-auto"
  >
    <div class="size-10 *:pointer-events-auto">
      <NorthArrow
        rotation={-mapBearing}
        {imageUpRotation}
        onclick={onResetBearing}
      />
    </div>
  </div>
</div>
