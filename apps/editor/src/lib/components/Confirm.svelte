<script lang="ts">
  import { Popover } from 'bits-ui'

  import type { Snippet } from 'svelte'

  type Props = {
    question?: string
    children: Snippet
    onconfirm?: () => void
  }

  let { question, children, onconfirm }: Props = $props()

  let isOpen = $state(false)

  function handleYesClick() {
    onconfirm?.()
    isOpen = false
  }

  function handleNoClick() {
    isOpen = false
  }
</script>

<Popover.Root bind:open={isOpen}>
  <Popover.Trigger>
    {#snippet child({ props }: { props: Record<string, unknown> })}
      <button {...props} class="cursor-pointer">
        {@render children?.()}
      </button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content
      class="border-gray-100 bg-white shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out
        data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
        z-30 w-52 rounded-md border p-4 space-y-2"
      sideOffset={8}
    >
      <div>
        {#if question}
          {question}
        {:else}
          Are you sure?
        {/if}
      </div>
      <div class="grid grid-cols-2 gap-2">
        <button
          class="cursor-pointer border border-red-600 rounded-sm bg-red hover:opacity-80"
          onclick={handleNoClick}>No</button
        >
        <button
          class="cursor-pointer border border-green-600 rounded-sm bg-green hover:opacity-80"
          onclick={handleYesClick}>Yes</button
        >
      </div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
