<script lang="ts">
  import { CloudCheck as CloudCheckIcon } from 'phosphor-svelte'

  import { green } from '@allmaps/tailwind'
</script>

<p class="cloud text-sm text-green" style="--green: {green}">
  <CloudCheckIcon class="size-5" weight="duotone" />

  <span>All edits are automatically saved in the Allmaps database</span>
</p>

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
