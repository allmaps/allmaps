<script lang="ts">
  import { Crosshair as CrosshairIcon } from 'phosphor-svelte'

  import Control from './Control.svelte'

  type Props = {
    onLocateUser: () => void
    active?: boolean
  }

  let { onLocateUser, active = false }: Props = $props()

  function handleClick() {
    onLocateUser()
  }
</script>

<Control
  ariaLabel="Find my location"
  title="Find my location"
  {active}
  pressed={active}
  onclick={handleClick}
>
  <CrosshairIcon class="size-full" />
</Control>
