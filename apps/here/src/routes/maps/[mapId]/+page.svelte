<script lang="ts">
  import ShareButton from '$lib/components/ShareButton.svelte'

  import type { LayoutProps } from './$types.js'

  let { data }: LayoutProps = $props()
</script>

<ShareButton mapId={data.mapId} />
