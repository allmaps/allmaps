<script lang="ts">
  import { renderOptions } from '$lib/shared/stores/render-options.js'
  import { opacity } from '$lib/shared/stores/opacity.js'

  import { Slider } from '@allmaps/ui'

  let opacityActive = false
  let removeBackgroundActive = false

  let opacityDisableTooltip = false
  let removeBackgroundDisableTooltip = false

  $: {
    opacityDisableTooltip = removeBackgroundActive
    removeBackgroundDisableTooltip = opacityActive
  }
</script>

<div class="inline-flex items-end space-x-1 md:space-x-3">
  <Slider
    bind:value={$opacity}
    bind:active={opacityActive}
    keyCode="Space"
    label="Opacity"
  >
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
    >
  </Slider>
  <Slider
    bind:value={$renderOptions.removeBackground.threshold}
    bind:active={removeBackgroundActive}
    keyCode="KeyB"
    label="Remove background"
    invert
    toggleValue={0.2}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon icon-tabler icon-tabler-droplet-half-filled fill-white z-10"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
      ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
        d="M12 2l.07 .003a2.41 2.41 0 0 1 1.825 .907l.108 .148l4.92 7.306c1.952 3.267 1.191 7.42 -1.796 9.836c-2.968 2.402 -7.285 2.402 -10.254 0c-2.917 -2.36 -3.711 -6.376 -1.901 -9.65l.134 -.232l4.893 -7.26c.185 -.275 .426 -.509 .709 -.686a2.426 2.426 0 0 1 1.066 -.36l.226 -.012zm-1 3.149l-4.206 6.24c-1.44 2.41 -.88 5.463 1.337 7.257a6.101 6.101 0 0 0 2.869 1.276v-14.773z"
        stroke-width="1"
        stroke="black"
        fill="white"
      /></svg
    >
  </Slider>
</div>
