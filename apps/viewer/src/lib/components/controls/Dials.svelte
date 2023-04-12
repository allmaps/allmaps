<script lang="ts">
  import { renderOptions } from '$lib/shared/stores/render-options.js'

  import { Dial } from '@allmaps/ui'

  let opacityActive = false
  let removeBackgroundActive = false

  let opacityDisableTooltip = false
  let removeBackgroundDisableTooltip = false

  $: {
    opacityDisableTooltip = removeBackgroundActive
    removeBackgroundDisableTooltip = opacityActive
  }
</script>

<div class="inline-flex items-center space-x-1 md:space-x-3">
  <Dial
    bind:value={$renderOptions.opacity}
    bind:active={opacityActive}
    disableTooltip={opacityDisableTooltip}
    keyCode="Space"
    label="Opacity"
  />
  <Dial
    bind:value={$renderOptions.removeBackground.threshold}
    bind:active={removeBackgroundActive}
    disableTooltip={removeBackgroundDisableTooltip}
    keyCode="KeyB"
    label="Remove background"
    invert
    toggleValue={0.2}
  />
</div>
