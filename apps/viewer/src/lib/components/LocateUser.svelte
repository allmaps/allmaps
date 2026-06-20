<script lang="ts">
  import { Crosshair as CrosshairIcon } from 'phosphor-svelte'

  type Props = {
    onLocateUser: () => void
    active?: boolean
  }

  let { onLocateUser, active = false }: Props = $props()

  function handleClick() {
    onLocateUser()
  }
</script>

<button
  aria-label="Find my location"
  title="Find my location"
  aria-pressed={active}
  onclick={handleClick}
  class={[
    'cursor-pointer rounded transition-colors hover:bg-pink/10 hover:text-pink',
    active && 'bg-pink/10 text-pink'
  ]}
>
  <CrosshairIcon class="size-5" />
</button>
