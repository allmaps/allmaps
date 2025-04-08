<script lang="ts">
  import Controls from '$lib/components/Controls.svelte'

  import type { Snippet } from 'svelte'

  import type { LayoutProps } from './$types.js'

  interface Props {
    children?: Snippet
  }

  let { data }: LayoutProps & Props = $props()
</script>

<div class="absolute z-50 bottom-0 w-full p-2 pointer-events-none">
  <Controls selectedMapId={data.selectedMapId} />
</div>
