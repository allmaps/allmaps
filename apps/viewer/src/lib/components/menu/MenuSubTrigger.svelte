<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import { CaretRight as CaretRightIcon } from 'phosphor-svelte'

  import { menuItemClass } from './classes.js'

  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
  }

  let { children }: Props = $props()
</script>

<DropdownMenu.SubTrigger class={menuItemClass}>
  {@render children()}
  <CaretRightIcon class="ml-auto size-4" />
</DropdownMenu.SubTrigger>
