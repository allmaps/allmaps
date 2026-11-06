<script lang="ts">
  import { toolIdentities } from '$lib/data/tool-identities.js'
  import type { PartnerPreviewData } from '$lib/partner-preview.js'
  import type { HighlightedPartnerMap } from '$lib/data/partners.js'

  let {
    map,
    preview,
    institution
  }: {
    map: HighlightedPartnerMap
    preview: PartnerPreviewData
    institution: string
  } = $props()

  const viewerUrl = $derived(
    `${toolIdentities.viewer.href}/?url=${encodeURIComponent(preview.annotationUrl)}`
  )
</script>

<figure class="m-0 w-full min-w-0 max-w-lg justify-self-center">
  <a
    class="block focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#d63fa7]"
    href={viewerUrl}
    aria-label={`View ${map.title} in Allmaps`}
  >
    <img
      class="block aspect-[1.8] h-auto w-full rounded-sm object-cover"
      src={preview.imageUrl}
      srcset={preview.imageSrcset}
      sizes="auto, (min-width: 1024px) 280px, (min-width: 768px) 32vw, (min-width: 544px) 512px, calc(100vw - 32px)"
      alt={`${map.title} — near ${institution}`}
      width={preview.intrinsicWidth}
      height={preview.intrinsicHeight}
      loading="lazy"
      decoding="async"
    />
  </a>
</figure>
