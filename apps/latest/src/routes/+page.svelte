<script lang="ts">
  import { page } from '$app/state'

  import { Stats } from '@allmaps/ui'

  import Latest from '$lib/components/Latest.svelte'

  const DEFAULT_LIMIT = 100

  let urlLimit = $derived(
    Number(page.url.searchParams.get('limit')) || DEFAULT_LIMIT
  )
  let limit = $derived(Math.max(1, urlLimit))
</script>

<Stats />
<main class="p-3">
  <Latest count={limit} showHeader={true} />
</main>
