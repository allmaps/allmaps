<script lang="ts">
  import { Plus as PlusIcon, Minus as MinusIcon } from 'phosphor-svelte'

  import ControlContainer from './ControlContainer.svelte'
  import Control from './Control.svelte'
  import ZoomToExtent from './ZoomToExtent.svelte'
  import LocateUser from './LocateUser.svelte'

  type Props = {
    onZoomIn: () => void
    onZoomOut: () => void
    onZoomToExtent: () => void
    onLocateUser: () => void
    locateUserActive: boolean
  }

  let {
    onZoomIn,
    onZoomOut,
    onZoomToExtent,
    onLocateUser,
    locateUserActive
  }: Props = $props()
</script>

<div class="flex flex-col gap-2">
  <ControlContainer direction="column">
    <Control ariaLabel="Zoom in" title="Zoom in" onclick={onZoomIn}>
      <PlusIcon class="size-full" weight="bold" />
    </Control>
    <Control ariaLabel="Zoom out" title="Zoom out" onclick={onZoomOut}>
      <MinusIcon class="size-full" weight="bold" />
    </Control>
  </ControlContainer>

  <ControlContainer>
    <ZoomToExtent {onZoomToExtent} />
  </ControlContainer>

  <ControlContainer>
    <LocateUser {onLocateUser} active={locateUserActive} />
  </ControlContainer>
</div>
