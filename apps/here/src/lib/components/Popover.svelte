<script lang="ts">
  import { beforeNavigate } from '$app/navigation'
  import { scale } from 'svelte/transition'

  import { Popover } from 'bits-ui'

  import type { Snippet } from 'svelte'

  type Props = {
    button: Snippet
    contents: Snippet
    open?: boolean
  }

  let { button, contents, open = $bindable(false) }: Props = $props()

  beforeNavigate(() => (open = false))
</script>

<Popover.Root bind:open>
  <Popover.Trigger class="min-w-0 rounded-full">
    {@render button()}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content
      forceMount
      sideOffset={12}
      class="z-50 outline-0 max-w-screen w-2xl px-3"
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div transition:scale={{ start: 0.95, duration: 75 }}>
              <Popover.Arrow
                width={16}
                height={10}
                class="text-white drop-shadow-md"
              />
              <div {...props}>
                <div class="bg-white shadow-lg rounded-md">
                  {@render contents()}
                </div>
              </div>
            </div>
          </div>
        {/if}
      {/snippet}
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
