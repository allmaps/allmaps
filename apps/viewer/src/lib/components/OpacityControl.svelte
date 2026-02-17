<script lang="ts">
  import { scale } from 'svelte/transition'

  import { Popover } from 'bits-ui'

  import type { Snippet } from 'svelte'

  import { Drop as DropIcon } from 'phosphor-svelte'

  import OpacitySlider from '$lib/components/OpacitySlider.svelte'
  import ControlContainer from '$lib/components/ControlContainer.svelte'
  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()

  let disabled = $derived(uiState.view !== 'map')
</script>

<ControlContainer roundedFull>
  <Popover.Root>
    <Popover.Trigger
      {disabled}
      class="min-w-0 runded-md not-disabled:cursor-pointer disabled:text-gray group"
    >
      <div class="bg-white"><DropIcon class="size-7" /></div>
    </Popover.Trigger>
    <Popover.Portal>
      <Popover.Content forceMount sideOffset={18}>
        {#snippet child({ wrapperProps, props, open })}
          {#if open}
            <div {...wrapperProps}>
              <div transition:scale={{ start: 0.95, duration: 75 }}>
                <OpacitySlider
                  bind:x={uiState.removeColorThreshold}
                  bind:y={uiState.opacity}
                />
              </div>
            </div>
          {/if}
        {/snippet}
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
</ControlContainer>
