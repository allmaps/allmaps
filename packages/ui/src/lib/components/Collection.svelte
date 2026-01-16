<script lang="ts">
  // TODO: upgrade to Svelte 5, count chilren props
  export let childrenCount = 0
  export let minItemWidth = 250
</script>

<div class="w-full">
  {#if childrenCount !== 1}
    <ol class="grid gap-3" style="--min-item-width: {minItemWidth}px">
      <slot />
    </ol>
  {:else}
    <ol class="flex flex-col gap-3 items-center">
      <slot />
    </ol>
  {/if}
</div>

<style scoped>
  ol {
    grid-template-columns: repeat(auto-fit, minmax(var(--min-item-width), 1fr));
  }
</style>
