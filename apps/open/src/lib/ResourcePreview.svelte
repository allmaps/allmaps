<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { ResourcePreview } from './preview.ts'

  let {
    preview,
    loading,
    overlay
  }: { preview?: ResourcePreview; loading: boolean; overlay?: Snippet } =
    $props()
  let loadedImageUrl = $state<string>()
  let failedImageUrl = $state<string>()
</script>

<section
  aria-label="IIIF resource preview"
  class="col-span-full grid grid-cols-subgrid self-center *:p-3 max-sm:contents"
>
  <div class="max-sm:[grid-area:thumbnail] max-sm:pb-0">
    <div
      class="relative grid aspect-4/3 max-h-44 w-full place-items-center overflow-hidden rounded-md bg-pink-100/50 p-2"
    >
      {#if preview?.imageUrl && failedImageUrl !== preview.imageUrl}
        <img
          src={preview.imageUrl}
          alt={preview.imageLabel || preview.title}
          class={[
            'h-full min-h-0 w-full object-contain motion-safe:transition-opacity motion-safe:duration-200 motion-safe:starting:opacity-0',
            loadedImageUrl === preview.imageUrl ? 'opacity-100' : 'opacity-0'
          ]}
          referrerpolicy="strict-origin"
          onload={(event) =>
            (loadedImageUrl =
              event.currentTarget.getAttribute('src') ?? undefined)}
          onerror={() => (failedImageUrl = preview.imageUrl)}
        />
      {:else if preview || !loading}
        <p class="px-4 text-center text-sm text-gray-800">
          Preview unavailable
        </p>
      {/if}
      {#if overlay}
        <div class="absolute inset-x-2 bottom-2 flex">
          {@render overlay()}
        </div>
      {/if}
    </div>
  </div>
  <div class="min-w-0 space-y-2 max-sm:[grid-area:title]">
    {#if preview}
      <h2
        class="line-clamp-3 text-lg leading-tight font-bold wrap-anywhere sm:line-clamp-4 sm:text-xl"
        title={preview.title}
      >
        {preview.title}
      </h2>
    {:else if loading}
      <div class="space-y-3" aria-hidden="true">
        <div class="h-5 w-full rounded bg-pink-100"></div>
        <div class="h-5 w-3/4 rounded bg-pink-100"></div>
        <div class="h-3 w-1/3 rounded bg-pink-100"></div>
      </div>
    {/if}
  </div>
</section>
