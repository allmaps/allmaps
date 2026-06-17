<script lang="ts">
  import { LoadingSmall } from '@allmaps/components'

  type Props = {
    alt: string
    src: string
    class?: string | (string | false | null | undefined)[]
  }

  let { alt, src, class: className }: Props = $props()

  let imageElement = $state<HTMLImageElement>()
  let loadedSrc = $state<string>()
  let loading = $derived(loadedSrc !== src)

  $effect(() => {
    const currentSrc = src

    if (imageElement?.complete) {
      loadedSrc = currentSrc
    }
  })

  function handleLoad() {
    loadedSrc = src
  }

  function handleError() {
    loadedSrc = src
  }
</script>

<div class="relative size-full">
  {#if loading}
    <div class="absolute inset-0 z-10 grid place-items-center">
      <LoadingSmall />
    </div>
  {/if}

  <img
    bind:this={imageElement}
    {alt}
    class={[className, 'size-full object-cover', loading && 'opacity-0']}
    {src}
    onerror={handleError}
    onload={handleLoad}
  />
</div>
