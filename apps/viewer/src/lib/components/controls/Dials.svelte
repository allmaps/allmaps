<script lang="ts">
  import { renderOptions } from '$lib/shared/stores/render-options.js'
  import { opacity } from '$lib/shared/stores/opacity.js'
  import experimentalFeatures from '$lib/shared/experimental-features.js'

  import { Slider, Dial, Mask, Opacity } from '@allmaps/ui'

  let opacityActive = false
  let removeBackgroundActive = false
</script>

<div class="inline-flex items-end space-x-1 md:space-x-3">
  <svelte:component
    this={experimentalFeatures ? Slider : Dial}
    bind:value={$opacity}
    bind:active={opacityActive}
    keyCode="Space"
    label="Opacity"
  >
    {#if experimentalFeatures}
      <Opacity />
    {/if}
  </svelte:component>
  <svelte:component
    this={experimentalFeatures ? Slider : Dial}
    bind:value={$renderOptions.removeBackground.threshold}
    bind:active={removeBackgroundActive}
    keyCode="KeyB"
    label="Remove background"
    invert
    toggleValue={0.2}
  >
    {#if experimentalFeatures}
      <Mask />
    {/if}
  </svelte:component>
</div>
