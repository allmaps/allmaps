<script lang="ts">
  import { scale } from 'svelte/transition'

  import { X as XIcon } from 'phosphor-svelte'

  import { Popover } from 'bits-ui'

  import type { Snippet } from 'svelte'

  type Props = {
    button: Snippet
    title?: Snippet
    contents: Snippet
    open?: boolean
    contentsWidth?: number
    disabled?: boolean
    interactOutsideBehavior?: 'ignore' | 'close'
    customAnchor?: HTMLElement
  }

  let {
    button,
    title,
    contents,
    open = $bindable(false),
    contentsWidth,
    disabled = false,
    interactOutsideBehavior = 'close',
    customAnchor
  }: Props = $props()
</script>

<Popover.Root bind:open>
  <Popover.Trigger
    class="min-w-0 rounded-md not-disabled:cursor-pointer disabled:text-gray group"
    {disabled}
  >
    {@render button()}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content
      forceMount
      sideOffset={4}
      {interactOutsideBehavior}
      {customAnchor}
    >
      {#snippet child({ wrapperProps, props, open })}
        {#if open}
          <div {...wrapperProps}>
            <div transition:scale={{ start: 0.95, duration: 75 }}>
              <Popover.Arrow
                width={10}
                height={6}
                class="text-white drop-shadow-md
                data-[side=top]:translate-y-[-1px] data-[side=bottom]:translate-y-[1px]"
              />
              <div
                {...props}
                style:width={contentsWidth ? `${contentsWidth}px` : 'auto'}
                class="px-2 max-w-screen"
              >
                <div
                  class="bg-white p-2 shadow-lg rounded-md
                    border-1 border-gray-200 overflow-auto
                    max-h-[calc((var(--bits-popover-content-available-height))-(--spacing(2)))]"
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
          </div>
        {/if}
      {/snippet}
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
