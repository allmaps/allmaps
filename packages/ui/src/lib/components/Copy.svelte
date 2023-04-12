<script lang="ts">
  import { onMount } from 'svelte'

  import { Tooltip } from 'flowbite'
  import type { TooltipOptions, TooltipInterface } from 'flowbite'

  export let string: string

  let textarea: HTMLTextAreaElement

  let tooltipTarget: HTMLElement
  let tooltipTrigger: HTMLElement
  let tooltip: TooltipInterface

  let copying = false

  const copyingTimeout = 2000

  function copy() {
    copying = true
    navigator.clipboard.writeText(string)
    tooltip.show()

    setTimeout(() => {
      copying = false
      tooltip.hide()
    }, copyingTimeout)
  }

  function handleFocus() {
    textarea.select()
  }

  onMount(() => {
    const options: TooltipOptions = {
      triggerType: 'none'
    }

    tooltip = new Tooltip(tooltipTarget, tooltipTrigger, options)
  })
</script>

<div class="relative w-full h-8 flex flex-row">
  <div
    role="tooltip"
    bind:this={tooltipTarget}
    class="absolute z-10 invisible inline-block px-2 py-1 text-xs text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip"
  >
    Copied!
    <div class="tooltip-arrow" data-popper-arrow />
  </div>

  <textarea
    bind:this={textarea}
    on:focus={handleFocus}
    class="block p-1 resize-none whitespace-nowrap leading-5 w-full h-8 overflow-hidden text-sm text-gray-900 bg-gray-50 rounded-l-lg border-gray-100 border-2 border-gray-300 focus:ring-blue-500 focus:border-blue-500"
    readonly>{string}</textarea
  >
  <button
    class="top-0 right-0 p-1 text-sm font-medium text-white rounded-r-lg border border-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300"
    bind:this={tooltipTrigger}
    on:click={copy}
    ><svg
      class="w-full h-full"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <svg
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {#if copying}
          <path
            d="M4.5 12.75l6 6 9-13.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke="green"
          />
        {:else}
          <path
            d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke="black"
          />
        {/if}
      </svg>
    </svg></button
  >
  <!-- </div> -->
</div>
