<script lang="ts">
  import loadingSmall from '$lib/images/loading-small.webp?url'

  let { color }: { color?: string } = $props()
</script>

<span class="inline-flex" role="status">
  {#if color}
    <span
      aria-hidden="true"
      style:color
      style:--loader-image={`url("${loadingSmall}")`}
      class="size-4 bg-(image:--loader-image) bg-contain bg-center bg-no-repeat supports-[mask-image:url(x)]:bg-none supports-[mask-image:url(x)]:bg-current supports-[mask-image:url(x)]:[mask:var(--loader-image)_center/contain_no-repeat]"
    ></span>
  {:else}
    <img alt="Loading…" aria-hidden="true" class="size-4" src={loadingSmall} />
  {/if}
  <span class="sr-only">Loading…</span>
</span>
