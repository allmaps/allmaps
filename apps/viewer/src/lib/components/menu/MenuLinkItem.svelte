<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import { ArrowSquareOut as ArrowSquareOutIcon } from 'phosphor-svelte'

  import { menuItemClass } from './classes.js'

  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
    href: string | undefined
    icon?: Snippet
    textValue?: string
  }

  let { children, href, icon, textValue }: Props = $props()
</script>

<DropdownMenu.Item {textValue} disabled={!href}>
  {#snippet child({ props })}
    {#if href}
      <a
        {...props}
        class={menuItemClass}
        {href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {#if icon}
          {@render icon()}
        {:else}
          <ArrowSquareOutIcon class="size-4" />
        {/if}
        <span>{@render children()}</span>
      </a>
    {:else}
      <span {...props} class={menuItemClass}>
        {#if icon}
          {@render icon()}
        {:else}
          <ArrowSquareOutIcon class="size-4" />
        {/if}
        <span>{@render children()}</span>
      </span>
    {/if}
  {/snippet}
</DropdownMenu.Item>
