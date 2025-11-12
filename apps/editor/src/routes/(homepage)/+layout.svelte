<script lang="ts">
  import { Banner } from '@allmaps/components'

  import type { Snippet } from 'svelte'

  const { children }: { children: Snippet } = $props()
</script>

<!-- TODO: add head tags -->
<Banner />
{@render children()}
