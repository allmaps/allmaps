<script lang="ts">
  import { page } from '$app/stores'

  import { Stats } from '@allmaps/ui'

  import Latest from '$lib/components/Latest.svelte'

  const DEFAULT_COUNT = 250
  const MAX_COUNT = 1000

  const urlCount = Number($page.url.searchParams.get('count')) || DEFAULT_COUNT

  const count = Math.max(1, Math.min(MAX_COUNT, urlCount))
</script>

<Stats />
<main class="p-3">
  <Latest {count} showHeader={true} />
</main>
