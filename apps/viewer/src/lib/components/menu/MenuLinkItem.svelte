<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import {
    ArrowSquareOut as ArrowSquareOutIcon,
    ArrowRightIcon
  } from 'phosphor-svelte'

  import { menuItemClass } from './classes.js'

  import type { Snippet } from 'svelte'

  type Props = {
    children: Snippet
    href: string | undefined
    sameTab?: boolean
    icon?: Snippet
    textValue?: string
  }

  let { children, href, icon, textValue, sameTab = false }: Props = $props()
</script>

<DropdownMenu.Item {textValue} disabled={!href}>
  {#snippet child({ props })}
    {#if href}
      <a
        {...props}
        class={menuItemClass}
        {href}
        target={sameTab ? undefined : '_blank'}
        rel={sameTab ? undefined : 'noopener noreferrer'}
      >
        {#if icon}
          {@render icon()}
        {:else if sameTab}
          <ArrowRightIcon class="size-4" />
        {:else}
          <ArrowSquareOutIcon class="size-4" />
        {/if}
        <span>{@render children()}</span>
      </a>
    {:else}
      <span {...props} class={menuItemClass}>
        {#if icon}
          {@render icon()}
        {:else if sameTab}
          <ArrowRightIcon class="size-4" />
        {:else}
          <ArrowSquareOutIcon class="size-4" />
        {/if}
        <span>{@render children()}</span>
      </span>
    {/if}
  {/snippet}
</DropdownMenu.Item>
