<script lang="ts">
  import { Banner } from '@allmaps/components'

  import { getVarsState } from '$lib/state/vars.svelte.js'

  import type { Snippet } from 'svelte'

  import type { Env } from '$lib/types/env.js'

  const { children }: { children: Snippet } = $props()

  const varsState = getVarsState<Env>()

  const bannerEnabled = varsState.get('VITE_BANNER_ENABLED')
  const bannerText = varsState.get('VITE_BANNER_TEXT')
</script>

<!-- TODO: add head tags -->
<Banner bannerTextEnabled={bannerEnabled} {bannerText} />
{@render children()}
