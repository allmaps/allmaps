<script lang="ts">
  import { page } from '$app/state'
  import * as publicEnv from '$env/static/public'

  import { Stats } from '@allmaps/ui'

  import { Latest } from '@allmaps/ui/latest'

  const DEFAULT_LIMIT = 100
  const mapsApiBaseUrl =
    (publicEnv as Record<string, string>).PUBLIC_REST_BASE_URL ??
    'https://api.allmaps.org'

  let urlLimit = $derived(
    Number(page.url.searchParams.get('limit')) || DEFAULT_LIMIT
  )
  let limit = $derived(Math.max(1, urlLimit))
</script>

<Stats />
<main class="p-3">
  <Latest
    count={limit}
    {mapsApiBaseUrl}
    showHeader={true}
  />
</main>
