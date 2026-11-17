<script lang="ts">
  import LatestPage from '$lib/components/LatestPage.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<LatestPage organization={data.organization} />
