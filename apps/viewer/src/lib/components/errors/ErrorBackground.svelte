<script lang="ts">
  import { shades } from '@allmaps/tailwind'

  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
  }

  let { children }: Props = $props()

  let mousePosition = $state<[number, number]>([0, 0])
  let clientWidth = $state(0)
  let clientHeight = $state(0)

  let backgroundRotate = $derived.by(() => {
    const [x, y] = mousePosition
    const centerX = clientWidth / 2
    const centerY = clientHeight / 2

    const deltaX = x / 7 - centerX
    const deltaY = y / 7 - centerY

    const angle = Math.atan2(deltaY, deltaX)

    return (angle * 180) / Math.PI + 45
  })

  function handleMousemove(event: MouseEvent) {
    mousePosition = [event.clientX, event.clientY]
  }
</script>

<svelte:body onmousemove={handleMousemove} bind:clientWidth bind:clientHeight />

<div
  class="background flex h-full min-h-svh w-full items-center justify-center p-4"
  style="--background-color: {shades
    .red[1]}; --background-rotate: {backgroundRotate}deg;"
>
  {@render children()}
</div>

<style scoped>
  .background {
    --lighter-color: color-mix(in srgb, var(--background-color), white 10%);

    background: repeating-linear-gradient(
      var(--background-rotate),
      var(--background-color),
      var(--background-color) 10px,
      var(--lighter-color) 10px,
      var(--lighter-color) 20px
    );
  }
</style>
