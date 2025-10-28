<script lang="ts">
  import IIIFLogo from '$lib/components/images/IIIFLogo.svelte'

  import { formatSourceType } from '$lib/shared/metadata.js'

  import type { SourceType } from '$lib/types/shared.js'

  type Props = {
    sourceType: SourceType
  }

  let { sourceType }: Props = $props()

  const colorClasses: Record<SourceType, string> = {
    image: 'text-yellow fill-yellow bg-yellow-100/50 border-yellow',
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
  <span>{formatSourceType(sourceType)}</span>
</span>
