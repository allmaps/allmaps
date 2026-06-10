<script lang="ts">
  type Props = {
    thumbnail?: ImageBitmap
  }

  let { thumbnail }: Props = $props()

  let canvas = $state<HTMLCanvasElement>()

  $effect(() => {
    if (!canvas || !thumbnail) {
      return
    }

    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    canvas.width = thumbnail.width
    canvas.height = thumbnail.height
    context.clearRect(0, 0, thumbnail.width, thumbnail.height)
    context.drawImage(thumbnail, 0, 0)
  })
</script>

<div
  class="flex aspect-square size-14 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50"
>
  {#if thumbnail}
    <canvas bind:this={canvas} class="h-full w-full object-cover"></canvas>
  {:else}
    <div class="size-5 rounded bg-gray-200"></div>
  {/if}
</div>
