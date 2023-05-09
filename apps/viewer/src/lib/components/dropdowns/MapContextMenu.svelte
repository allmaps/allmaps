<script lang="ts">
  import ContextMenu from '$lib/components/elements/ContextMenu.svelte'

  import type { ShowContextMenu } from '$lib/shared/types.js'

  export let show: ShowContextMenu
</script>

<ContextMenu {show}>
  <ol>
    <li>hoi</li>
    <li>hoi</li>
    <li>hoi</li>
  </ol>
</ContextMenu>
