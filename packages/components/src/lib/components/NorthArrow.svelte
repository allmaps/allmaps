<script lang="ts">
  import { fade } from 'svelte/transition'

  type Props = {
    onclick?: () => void
    rotation?: number
    imageUpRotation?: number
    followOrientation?: boolean
  }

  let {
    onclick,
    rotation = 0,
    imageUpRotation,
    followOrientation = false
  }: Props = $props()

  const MIN_ANGLE_FOR_IMAGE_UP_MARKER = 10

  let showImageUpMarker = $derived(
    imageUpRotation !== undefined &&
      Math.abs(imageUpRotation - rotation) > MIN_ANGLE_FOR_IMAGE_UP_MARKER
  )
</script>

<div class="w-12 md:w-14 max-w-full rounded-full shadow-md">
  <button class="contents cursor-pointer" {onclick}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style="
        --rotation: {rotation}deg;
        --image-up-rotation: {imageUpRotation ?? 0}deg;
      "
      viewBox="0 0 800 800"
    >
      <circle class="fill-white" cx="400" cy="400" r="400" />
      <g class="north-arrow">
        <path class="fill-red-500" d="M310.3,400L400,79l89.7,321" />
        <path class="fill-gray-400" d="M489.7,400L400,721l-89.7-321" />
        {#if followOrientation}
          <circle
            class="fill-red-500 stroke-white"
            stroke-width="10"
            cx="400"
            cy="50"
            r="50"
          />
        {/if}
      </g>
      {#if showImageUpMarker}
        <g class="image-up-marker opacity-50" transition:fade>
          <line
            class="stroke-black"
            x1="400"
            y1="70"
            x2="400"
            y2="188"
            stroke-width="50"
            stroke-linecap="round"
          />
        </g>
      {/if}
    </svg>
  </button>
</div>

<style scoped>
  svg .north-arrow {
    /* transition: transform 0.1s linear; */
    transform-origin: center;
    transform: rotate(var(--rotation));
  }

  svg .image-up-marker {
    transform-origin: center;
    transform: rotate(var(--image-up-rotation));
  }
</style>
