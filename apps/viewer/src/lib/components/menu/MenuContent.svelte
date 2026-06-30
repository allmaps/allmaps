<script lang="ts">
  import { DropdownMenu } from 'bits-ui'

  import { menuContentClass, menuContentWidthClass } from './classes.js'

  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
    sideOffset?: number
  }

  let {
    children,
    side = 'bottom',
    align = 'start',
    sideOffset = 0
  }: Props = $props()
</script>

<DropdownMenu.Content
  class={[menuContentClass, menuContentWidthClass]}
  {side}
  {align}
  {sideOffset}
>
  {@render children()}
</DropdownMenu.Content>
