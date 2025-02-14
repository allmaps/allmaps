<script lang="ts">
  import { Popover } from 'bits-ui'

  import { CloudCheck as CloudCheckIcon } from 'phosphor-svelte'

  import { green } from '@allmaps/tailwind'
</script>

<div class="contents" style="--green: {green}">
  <Popover.Root>
    <Popover.Trigger class="cloud cursor-pointer">
      <CloudCheckIcon class="size-5" weight="duotone" />
    </Popover.Trigger>
    <Popover.Content
      class="z-30 bg-white p-2 shadow-xl border-gray-100 border-1 rounded-xl
      data-[state=open]:animate-scale-in"
      sideOffset={8}
    >
      <h2 class="max-w-3xs">
        All edits are automatically saved in the Allmaps database
      </h2>
    </Popover.Content>
  </Popover.Root>
</div>

<style>
  :global(.cloud path:first-of-type) {
    opacity: 0;
    transition: all 0.5s;
  }

  :global(.cloud path:first-of-type) {
    opacity: 1;
    fill: white;
  }

  :global(.cloud:hover path:first-of-type) {
    opacity: 0.5;
    fill: var(--green);
  }
</style>
