<script lang="ts">
  import { shades } from '@allmaps/tailwind'

  import SpeechBalloon from '$lib/components/SpeechBalloon.svelte'
  import {
    mapMonsterFaces,
    mapMonsterShapes
  } from '$lib/components/map-monster/registry.js'

  import type { Snippet } from 'svelte'

  import type { MapMonsterColor, MapMonsterMood } from '$lib/shared/types.js'

  type Props = {
    color?: MapMonsterColor
    mood?: MapMonsterMood
    shape?: number
    speechBalloonBackgroundColor?: string
    speechBalloonTextColor?: string
    children?: Snippet
  }

  let {
    color = 'green',
    mood = 'happy',
    shape = 0,
    speechBalloonBackgroundColor = '',
    speechBalloonTextColor = '',
    children
  }: Props = $props()

  const shapeDefinition = $derived(
    mapMonsterShapes[
      Math.max(Math.min(Math.trunc(shape), mapMonsterShapes.length - 1), 0)
    ]
  )
  const Shape = $derived(shapeDefinition.component)
  const Face = $derived(mapMonsterFaces[mood])
  const resolvedColor = $derived(shades[color][4])
  const resolvedFillColor = $derived(shades[color][1])
</script>

{#snippet monster()}
  <svg
    class="block h-auto max-h-full max-w-full"
    width={shapeDefinition.width}
    height={shapeDefinition.height}
    viewBox={shapeDefinition.viewBox}
    color={resolvedColor}
    style="--map-monster-fill-color: {resolvedFillColor}"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Shape />
    <Face />
  </svg>
{/snippet}

{#if children}
  <div class="flex w-full flex-col items-end justify-end gap-8">
    <SpeechBalloon
      backgroundColor={speechBalloonBackgroundColor}
      textColor={speechBalloonTextColor}
    >
      {@render children?.()}
    </SpeechBalloon>
    {@render monster()}
  </div>
{:else}
  {@render monster()}
{/if}
