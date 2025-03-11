<script lang="ts">
  import { Thumbnail } from '@allmaps/ui'

  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  import type { Example } from '$lib/types/shared.js'

  const imageInfoState = getImageInfoState()

  const MAX_POPUP_TEXT_LENGTH = 64

  let { example }: { example: Example } = $props()

  let exampleUrl = $derived(
    example.manifestId && example.manifestId.length
      ? example.manifestId
      : `${example.imageId}/info.json`
  )

  function truncate(text: string) {
    return text.length > MAX_POPUP_TEXT_LENGTH
      ? `${text.slice(0, MAX_POPUP_TEXT_LENGTH)}…`
      : text
  }
</script>

{#await imageInfoState.fetchImageInfo(example.imageId)}
  <li
    class="bg-[#fafafa] animate-pulse aspect-square space-y-2 text-gray-500 hover:text-gray-800 rounded-md text-xs
flex items-center justify-center transition-colors"
  >
    <p>Loading…</p>
  </li>
{:then imageInfo}
  <li
    class="bg-[#fafafa] aspect-square space-y-2 text-gray-500 hover:text-gray-800 rounded-md text-xs
flex items-center justify-center
transition-colors"
  >
    <a
      href={`/images?url=${encodeURIComponent(exampleUrl)}`}
      class="w-full inline-block rounded-md relative overflow-hidden space-y-2 p-4"
    >
      <Thumbnail {imageInfo} width={300} mode="contain" alt={example.title} />
      <div class="text-center inline-block w-full">
        {truncate(example.title)}
      </div>
    </a>
  </li>
{/await}
