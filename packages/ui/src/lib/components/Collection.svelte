<script lang="ts">
  // TODO: upgrade to Svelte 5, count chilren props
  export let childrenCount = 0
</script>

<div class="w-full @container">
  {#if childrenCount !== 1}
    <ol
      class="grid gap-3 grid-cols-1 @xs:grid-cols-2 @lg:grid-cols-3 @5xl:grid-cols-[repeat(auto-fit,_minmax(16rem,_1fr))]"
    >
      <slot />
    </ol>
  {:else}
    <ol class="flex flex-col gap-3 items-center">
      <slot />
    </ol>
  {/if}
</div>
