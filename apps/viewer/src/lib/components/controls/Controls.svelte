<script lang="ts">
  import { NorthArrow } from '@allmaps/components'

  import MapControls from './MapControls.svelte'
  import SelectView from './SelectView.svelte'
  import OpacityControl from './OpacityControl.svelte'
  import BackgroundColorControl from './BackgroundColorControl.svelte'
  import PrevNext from './PrevNext.svelte'
  import ControlContainer from './ControlContainer.svelte'

  type Props = {
    onZoomIn: () => void
    onZoomOut: () => void
    onZoomToExtent: () => void
    onLocateUser: () => void
    onResetBearing: () => void
    locateUserActive: boolean
    mapBearing: number
    imageUpBearing?: number
  }

  let {
    onZoomIn,
    onZoomOut,
    onZoomToExtent,
    onLocateUser,
    onResetBearing,
    locateUserActive,
    mapBearing,
    imageUpBearing
  }: Props = $props()

  let imageUpRotation = $derived(
    imageUpBearing === undefined ? undefined : imageUpBearing - mapBearing
  )
</script>

<div
  class="w-full h-full grid grid-cols-[auto_auto_auto] sm:grid-cols-3 grid-rows-3 gap-4 p-2"
>
  <div class="col-3 row-1 self-start place-self-end">
    <MapControls
      {onZoomIn}
      {onZoomOut}
      {onZoomToExtent}
      {onLocateUser}
      {locateUserActive}
    />
  </div>

  <div class="col-1 row-3 self-end place-self-start flex flex-row gap-2">
    <SelectView />
    <div class="self-center">
      <PrevNext />
    </div>
  </div>
  <div class="col-2 row-3 self-end place-self-center flex flex-row">
    <ControlContainer roundedFull>
      <OpacityControl />
      <BackgroundColorControl />
    </ControlContainer>
  </div>

  <div
    class="col-3 row-3 place-self-end flex flex-row gap-2 *:pointer-events-auto"
  >
    <div class="size-12 pointer-coarse:size-14 *:pointer-events-auto">
      <NorthArrow
        rotation={-mapBearing}
        {imageUpRotation}
        onclick={onResetBearing}
      />
    </div>
  </div>
</div>
