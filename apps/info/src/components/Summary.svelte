<script lang="ts">
  import type { Image as IIIFImage, Manifest as IIIFManifest } from '@allmaps/iiif-parser'

  export let id: string
  export let parsedIiif: IIIFImage | IIIFManifest
</script>

<div>
  <div>
    This is a IIIF {parsedIiif.type === 'image' ? 'Image' : 'Manifest'}.
  </div>
  <div>
    Its URI is <code>{parsedIiif.uri}</code>.
  </div>
  <div>
    Its Allmaps ID is <code>{id}</code>. This ID is computed by taking the first 16 hexadecimal characters of the <a href="https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest">SHA-1 hash</a> of the URI.
  </div>
</div>
