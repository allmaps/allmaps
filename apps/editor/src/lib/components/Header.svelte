<script lang="ts">
  import { Header } from '@allmaps/components'

  import Toolbar from '$lib/components/Toolbar.svelte'
  import Info from '$lib/components/Info.svelte'
</script>

<Header appName="Editor">
  <div class="grid w-full grid-cols-[1fr_max-content] items-center gap-2">
    <Info />
    <Toolbar />
  </div>
</Header>
