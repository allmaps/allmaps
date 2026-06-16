<script lang="ts">
  import { Checkbox } from 'bits-ui'
  import { MagicWand as MagicWandIcon } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()

  let disabled = $derived(uiState.view !== 'map')
</script>

<Checkbox.Root
  bind:checked={uiState.removeBackground}
  {disabled}
  class={[
    'relative flex size-8 items-center justify-center rounded-full transition-colors not-disabled:cursor-pointer disabled:text-gray hover:bg-pink/10 hover:text-pink group',
    uiState.removeBackground ? 'bg-pink/5 text-pink' : 'bg-white'
  ]}
  aria-label="Remove background color"
>
  {#snippet children()}
    <MagicWandIcon class="size-6" />
  {/snippet}
</Checkbox.Root>
