<script lang="ts">
  import { page } from '$app/state'

  import { Stats } from '@allmaps/ui'

  import Latest from '$lib/components/Latest.svelte'

  const DEFAULT_COUNT = 250
  const MAX_COUNT = 1000

  let urlCount = $derived(
    Number(page.url.searchParams.get('count')) || DEFAULT_COUNT
  )
  let count = $derived(Math.max(1, Math.min(MAX_COUNT, urlCount)))
</script>

<Stats />
<main class="p-3">
  <Latest {count} showHeader={true} />
</main>
