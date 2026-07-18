<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    childrenCount?: number
    children?: Snippet
  }

  let { childrenCount = 0, children }: Props = $props()
</script>

<div class="w-full @container">
  {#if childrenCount !== 1}
    <ol
      class="grid gap-3
        grid-cols-[repeat(auto-fit,_minmax(min(160px,_100%),_1fr))]
        sm:grid-cols-[repeat(auto-fit,_minmax(min(250px,_100%),_1fr))]"
    >
      {@render children?.()}
    </ol>
  {:else}
    <ol class="flex flex-col gap-3 items-center">
      {@render children?.()}
    </ol>
  {/if}
</div>
