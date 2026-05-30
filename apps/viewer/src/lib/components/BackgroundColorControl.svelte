<script lang="ts">
  import { fade } from 'svelte/transition'

  import { Checkbox } from 'bits-ui'
  import { MagicWand as MagicWandIcon } from 'phosphor-svelte'

  import ControlContainer from '$lib/components/ControlContainer.svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()

  let disabled = $derived(uiState.view !== 'map')
</script>

<ControlContainer roundedFull>
  <Checkbox.Root
    bind:checked={uiState.removeBackground}
    {disabled}
    class="relative flex size-7 items-center justify-center rounded-full bg-white transition-colors not-disabled:cursor-pointer disabled:text-gray
      hover:bg-pink/10 hover:text-pink group"
    aria-label="Remove background color"
  >
    {#snippet children({ checked })}
      <MagicWandIcon class="size-5" />
      {#if checked}
        <span
          class="pointer-events-none absolute h-0.75 w-7 rotate-45 rounded-full bg-red group-disabled:bg-gray"
          transition:fade={{ duration: 100 }}
        ></span>
      {/if}
    {/snippet}
  </Checkbox.Root>
</ControlContainer>
