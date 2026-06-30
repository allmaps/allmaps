<script lang="ts">
  import { Checkbox } from 'bits-ui'
  import { MagicWand as MagicWandIcon } from 'phosphor-svelte'

  import Control from './Control.svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getBackgroundColorsState } from '$lib/state/background-colors.svelte.js'

  const uiState = getUiState()
  const backgroundColorsState = getBackgroundColorsState()

  let disabled = $derived(
    uiState.view !== 'map' || !backgroundColorsState.hasBackgroundColors
  )
</script>

<Checkbox.Root
  bind:checked={uiState.removeBackground}
  {disabled}
  aria-label="Remove background color"
>
  {#snippet child({ props })}
    <Control
      {...props}
      variant="round"
      size="large"
      {disabled}
      active={uiState.removeBackground && !disabled}
      class="group"
    >
      <MagicWandIcon class="size-full" />
    </Control>
  {/snippet}
</Checkbox.Root>
