<script lang="ts">
  // TODO: upgrade to Svelte 5, count chilren props
  export let childrenCount = 0
</script>

<div class="w-full @container">
  {#if childrenCount !== 1}
    <ol class="collection grid gap-3">
      <slot />
    </ol>
  {:else}
    <ol class="flex flex-col gap-3 items-center">
      <slot />
    </ol>
  {/if}
</div>

<style scoped>
  .collection {
    grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
  }
</style>
