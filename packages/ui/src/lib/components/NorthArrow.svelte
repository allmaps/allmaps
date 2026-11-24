<script lang="ts">
  import { Button } from '@ui-sdk/svelte/button'

  let {
    rotation = 0,
    imageUpRotation,
    followOrientation = false,
    'aria-label': label,
    onclick
  }: {
    rotation?: number
    imageUpRotation?: number
    followOrientation?: boolean
    'aria-label'?: string
    onclick?: () => void
  } = $props()

  const descriptionId = $props.id()

  function clockwise(angle: number) {
    return ((angle % 360) + 360) % 360
  }

  function direction(angle: number) {
    const degrees = Math.round(clockwise(angle)) % 360
    return degrees === 0 ? 'up' : `${degrees}° clockwise from up`
  }

  const north = $derived(Number.isFinite(rotation) ? rotation : 0)
  const imageUp = $derived(
    imageUpRotation !== undefined && Number.isFinite(imageUpRotation)
      ? imageUpRotation
      : undefined
  )
  const showImageUp = $derived(
    imageUp !== undefined &&
      Math.abs(clockwise(imageUp - north + 180) - 180) > 10
  )
  const description = $derived(
    [
      `North points ${direction(north)}.`,
      imageUp !== undefined && `Image top points ${direction(imageUp)}.`,
      followOrientation && 'Following device orientation.'
    ]
      .filter(Boolean)
      .join(' ')
  )
</script>

{#snippet compass()}
  <svg
    aria-hidden="true"
    focusable="false"
    class="block size-full"
    viewBox="0 0 800 800"
  >
    <circle class="fill-white" cx="400" cy="400" r="400" />
    <g transform={`rotate(${north} 400 400)`}>
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
    {#if showImageUp}
      <line
        transform={`rotate(${imageUp} 400 400)`}
        class="stroke-black opacity-50"
        x1="400"
        y1="70"
        x2="400"
        y2="188"
        stroke-width="50"
        stroke-linecap="round"
      />
    {/if}
  </svg>
{/snippet}

{#if onclick}
  <Button
    type="button"
    aria-label={label ?? 'Change map orientation'}
    aria-describedby={descriptionId}
    class="block aspect-square h-auto w-full cursor-pointer delay-0 rounded-full border-0 bg-white p-0 shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
    {onclick}
  >
    {@render compass()}
  </Button>
{:else}
  <span
    role="img"
    aria-label={label ?? 'Map orientation'}
    aria-describedby={descriptionId}
    class="block aspect-square w-full rounded-full bg-white shadow-md"
  >
    {@render compass()}
  </span>
{/if}
<span id={descriptionId} class="sr-only">{description}</span>
