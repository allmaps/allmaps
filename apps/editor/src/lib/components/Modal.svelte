<script lang="ts">
  import { Dialog } from 'bits-ui'

  import type { Snippet } from 'svelte'

  type Props = {
    open: boolean
    children: Snippet
  }

  let { open = $bindable(false), children }: Props = $props()
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed inset-0 z-50 bg-[rgba(0,0,0,0.75)] p-4
      data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
    />
    <Dialog.Content
      class="fixed left-[50%] top-[10%] max-h-[85%] sm:top-[20%] sm:max-h-[75%] z-50 w-full max-w-[94%] translate-x-[-50%] rounded-lg
       bg-white shadow-lg outline-none border-gray-100
       sm:max-w-[490px] md:w-full p-2 sm:p-4 flex flex-col gap-2 sm:gap-4 overflow-auto"
    >
      {@render children()}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
