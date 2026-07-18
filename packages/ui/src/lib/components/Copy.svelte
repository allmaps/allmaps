<script lang="ts">
  import { onDestroy } from 'svelte'
  import { Tooltip } from 'bits-ui'
  import { Check as CheckIcon, Copy as CopyIcon } from 'phosphor-svelte'

  type Props = {
    string: string
  }

  let { string }: Props = $props()

  let input = $state<HTMLInputElement>()
  let tooltipOpen = $state(false)
  let copySucceeded = $state(false)
  let tooltipMessage = $state('Copied!')
  let tooltipTimeout: ReturnType<typeof setTimeout> | undefined

  const tooltipDuration = 2000

  async function handleCopy() {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout)
    }

    try {
      await navigator.clipboard.writeText(string)
      copySucceeded = true
      tooltipMessage = 'Copied!'
    } catch {
      copySucceeded = false
      tooltipMessage = 'Copy failed'
    }

    tooltipOpen = true
    tooltipTimeout = setTimeout(() => {
      tooltipOpen = false
      copySucceeded = false
      tooltipTimeout = undefined
    }, tooltipDuration)
  }

  function handleFocus() {
    input?.setSelectionRange(0, string.length)
  }

  function handleMouseup(event: Event) {
    event.preventDefault()
  }

  onDestroy(() => {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout)
    }
  })
</script>

<div class="relative flex h-8 w-full flex-row">
  <input
    type="text"
    bind:this={input}
    onfocus={handleFocus}
    onmouseup={handleMouseup}
    ontouchend={handleMouseup}
    class="block h-8 w-full resize-none overflow-hidden rounded-l-lg border
      border-gray-300 bg-gray-50 p-1 text-sm leading-5 whitespace-nowrap
      text-gray-900 text-ellipsis focus:border-blue-500 focus:ring-blue-500"
    readonly
    value={string}
  />

  <Tooltip.Provider>
    <Tooltip.Root
      open={tooltipOpen}
      disabled={!tooltipOpen}
      disableCloseOnTriggerClick
    >
      <Tooltip.Trigger
        aria-label="Copy to clipboard"
        class="flex size-8 shrink-0 items-center justify-center rounded-r-lg
          border-2 border-gray-100 text-gray-900
          focus:ring-4 focus:ring-blue-300 focus:outline-none"
        onclick={handleCopy}
      >
        {#if copySucceeded}
          <CheckIcon class="text-green" size={20} />
        {:else}
          <CopyIcon size={20} />
        {/if}
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          class="z-50 rounded bg-gray-900 px-2 py-1 text-xs text-white shadow-sm"
        >
          {tooltipMessage}
          <Tooltip.Arrow class="fill-gray-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  </Tooltip.Provider>
</div>
