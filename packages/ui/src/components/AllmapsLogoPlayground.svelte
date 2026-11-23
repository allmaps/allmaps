<script lang="ts">
  import AllmapsLogo from '$lib/components/AllmapsLogo.svelte'
  import Playground from './Playground.svelte'

  let inverted = $state(false)
</script>

<Playground>
  {#snippet preview()}
    <AllmapsLogo {inverted} class="size-16" />
  {/snippet}
  {#snippet controls()}
    <label><input type="checkbox" bind:checked={inverted} /> Inverted</label>
  {/snippet}
</Playground>
