<script lang="ts">
  import { renderOptions } from '$lib/shared/stores/render-options.js'
  import { opacity } from '$lib/shared/stores/opacity.js'
  import experimentalFeatures from '$lib/shared/experimental-features.js'

  import { Slider, Dial } from '@allmaps/ui'

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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-droplet-filled fill-white z-10"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
          d="M10.708 2.372a2.382 2.382 0 0 0 -.71 .686l-4.892 7.26c-1.981 3.314 -1.22 7.466 1.767 9.882c2.969 2.402 7.286 2.402 10.254 0c2.987 -2.416 3.748 -6.569 1.795 -9.836l-4.919 -7.306c-.722 -1.075 -2.192 -1.376 -3.295 -.686z"
          stroke-width="1"
          stroke="black"
          fill="white"
        /></svg
      >{/if}
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="icon icon-tabler icon-tabler-eye-filled fill-white z-10"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
          d="M12 4c4.29 0 7.863 2.429 10.665 7.154l.22 .379l.045 .1l.03 .083l.014 .055l.014 .082l.011 .1v.11l-.014 .111a.992 .992 0 0 1 -.026 .11l-.039 .108l-.036 .075l-.016 .03c-2.764 4.836 -6.3 7.38 -10.555 7.499l-.313 .004c-4.396 0 -8.037 -2.549 -10.868 -7.504a1 1 0 0 1 0 -.992c2.831 -4.955 6.472 -7.504 10.868 -7.504zm0 5a3 3 0 1 0 0 6a3 3 0 0 0 0 -6z"
          stroke-width="1"
          fill="white"
        /></svg
      >{/if}
  </svelte:component>
</div>
