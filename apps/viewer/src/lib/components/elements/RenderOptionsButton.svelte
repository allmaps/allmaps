<script lang="ts">
  import {
    renderOptionsAll,
    renderOptionsByMapId,
    renderOptionsScope,
  } from '$lib/shared/stores/render-options.js'

  let backgroundColorValue: string
  let colorizeColorValue: string

  // backgroundColor.subscribe((value) => (backgroundColorValue = value))
  // colorizeColor.subscribe((value) => (colorizeColorValue = value))
</script>

<svg
  class="w-5 h-5"
  aria-hidden="true"
  fill="currentColor"
  viewBox="0 0 120 120"
  xmlns="http://www.w3.org/2000/svg"
>
  <path d=" M 60 110 A 50 50 0 0 1 60 10" fill={backgroundColorValue} />
  <path d=" M 60 10 A 50 50 0 0 1 60 110" fill={colorizeColorValue} />

  <circle cx="60" cy="60" r="50" fill="none" stroke="black" stroke-width="10" />
</svg>
