<script lang="ts">
  import { CloudCheck as CloudCheckIcon } from 'phosphor-svelte'

  import { green } from '@allmaps/tailwind'
</script>

<div
  class="cloud flex items-center justify-center gap-2 text-sm text-green"
  style="--green: {green}"
>
  <CloudCheckIcon class="size-5" weight="duotone" />

  <p>All edits are automatically saved in the Allmaps database</p>
</div>

<style>
  :global(.cloud path:first-of-type) {
    opacity: 0;
    transition: all 0.5s;
  }

  :global(.cloud path:first-of-type) {
    opacity: 0;
    fill: var(--green);
  }

  :global(.cloud:hover path:first-of-type) {
    opacity: 0.2;
    fill: var(--green);
  }
</style>
