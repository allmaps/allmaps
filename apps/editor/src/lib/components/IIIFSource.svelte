<script lang="ts">
  import IIIFLogo from '$lib/components/images/IIIFLogo.svelte'

  import { formatSourceType } from '$lib/shared/metadata.js'

  import type { SourceType } from '$lib/types/shared.js'

  type Props = {
    sourceType: SourceType
    plural?: boolean
  }

  let { sourceType, plural = false }: Props = $props()

  const colorClasses: Record<SourceType, string> = {
    image: 'text-yellow-600 fill-yellow-600 bg-yellow-100 border-yellow-600',
    manifest: 'text-orange fill-orange bg-orange-100 border-orange',
    collection: 'text-purple fill-purple bg-purple-100 border-purple'
  }
</script>

<span
  class={[
    'border-1 inline-flex items-center gap-1 rounded-md px-1 py-0 text-xs',
    colorClasses[sourceType]
  ]}
>
  <span class="size-3">
    <IIIFLogo />
  </span>
  <span>{formatSourceType(sourceType, plural)}</span>
</span>
