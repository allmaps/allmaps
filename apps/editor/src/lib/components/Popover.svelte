<script lang="ts">
  import { beforeNavigate } from '$app/navigation'
  import { fade } from 'svelte/transition'

  import { X as XIcon } from 'phosphor-svelte'

  import { Popover } from 'bits-ui'

  import type { Snippet } from 'svelte'

  type Props = {
    button: Snippet
    title?: Snippet
    contents: Snippet
    open?: boolean
    contentsWidth?: number
  }

  let {
    button,
    title,
    contents,
    open = $bindable(false),
    contentsWidth
  }: Props = $props()

  beforeNavigate(() => (open = false))
</script>

<Popover.Root bind:open>
  <Popover.Trigger class="min-w-0 rounded-full cursor-pointer">
    {@render button()}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content
      forceMount
      sideOffset={5}
      class="z-50 outline-0 max-w-screen w-2xl px-3"
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps} transition:fade={{ duration: 100 }}>
            <!-- <Popover.Arrow
              width={16}
              height={10}
              class="text-white drop-shadow-md"
            /> -->

            <div
              {...props}
              style:width={contentsWidth ? `${contentsWidth}px` : 'auto'}
              class="px-2 min-w-lvw lg:min-w-0 max-w-full z-50"
            >
              <div
                class="bg-white p-2 shadow-lg rounded-md
                border-1 border-gray-200"
              >
                {#if title}
                  <div class="flex items-center justify-between">
                    {@render title()}
                    <Popover.Close
                      class="cursor-pointer rounded-full p-1 bg-white hover:bg-gray-100/80 transition-colors duration-200"
                    >
                      <span class="sr-only">Close</span>
                      <XIcon class="size-5" size="100%" weight="bold" />
                    </Popover.Close>
                  </div>
                {/if}
                {@render contents()}
              </div>
            </div>
          </div>
        {/if}
      {/snippet}
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
