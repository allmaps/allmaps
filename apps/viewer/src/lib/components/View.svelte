<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    header: Snippet
    controls?: Snippet
    children: Snippet
    floatingHeader?: boolean
  }

  const { header, controls, children, floatingHeader = true }: Props = $props()
</script>

<div class="grid grid-rows-[min-content_1fr] grid-cols-1 h-dvh w-full">
  <div
    class={floatingHeader
      ? 'row-span-full col-span-full'
      : 'row-2 col-span-full'}
  >
    {@render children()}
  </div>
  <div class="row-1 col-span-full z-10 pointer-events-none">
    {@render header()}
  </div>
  {#if controls}
    <div class="row-2 col-span-full z-10 pointer-events-none">
      {@render controls()}
    </div>
  {/if}
</div>
