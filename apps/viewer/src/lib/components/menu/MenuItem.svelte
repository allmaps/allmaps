<script lang="ts">
  import { DropdownMenu } from 'bits-ui'

  import { menuItemClass } from './classes.js'

  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
    disabled?: boolean
    onSelect?: () => void | Promise<void>
    textValue?: string
  }

  let { children, disabled = false, onSelect, textValue }: Props = $props()
</script>

<DropdownMenu.Item class={menuItemClass} {disabled} {onSelect} {textValue}>
  {@render children()}
</DropdownMenu.Item>
