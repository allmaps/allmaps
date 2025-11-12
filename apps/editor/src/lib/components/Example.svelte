<script lang="ts">
  import { Thumbnail } from '@allmaps/components'

  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  import { truncate } from '$lib/shared/strings.js'

  import type { Example } from '$lib/types/shared.js'

  const imageInfoState = getImageInfoState()

  let { example }: { example: Example } = $props()

  let exampleUrl = $derived(
    example.manifestId && example.manifestId.length
      ? example.manifestId
      : `${example.imageId}/info.json`
  )
</script>

{#await imageInfoState.fetchImageInfo(example.imageId)}
  <li
    class="flex aspect-square animate-pulse items-center justify-center space-y-2 rounded-md bg-[#fafafa]
text-xs text-gray-500 transition-colors hover:text-gray-800"
  >
    <p>Loading…</p>
  </li>
{:then imageInfo}
  <li
    class="flex aspect-square items-center justify-center space-y-2 rounded-md bg-[#fafafa]
text-xs text-gray-500 transition-colors
hover:text-gray-800"
  >
    <a
      href={`/images?url=${encodeURIComponent(exampleUrl)}`}
      class="relative inline-block w-full space-y-2 overflow-hidden rounded-md p-4"
    >
      <Thumbnail {imageInfo} width={300} mode="contain" alt={example.title} />
      <div class="inline-block w-full text-center">
        {truncate(example.title)}
      </div>
    </a>
  </li>
{/await}
