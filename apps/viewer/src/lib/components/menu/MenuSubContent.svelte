<script lang="ts">
  import { DropdownMenu } from 'bits-ui'

  import { menuContentClass, menuContentWidthClass } from './classes.js'

  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
  }

  let { children }: Props = $props()
</script>

<DropdownMenu.SubContent class={[menuContentClass, menuContentWidthClass]}>
  {@render children()}
</DropdownMenu.SubContent>
