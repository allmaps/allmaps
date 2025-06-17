<script lang="ts">
  import { beforeNavigate } from '$app/navigation'

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
  <Popover.Trigger class="min-w-0">
    {@render button()}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content
      sideOffset={8}
      class="outline-0 max-w-screen w-2xl px-2 sm:px-4 md:px-8 lg:px-16
        starting:opacity-0 opacity-100 transition-opacity duration-75 z-50"
    >
      <div>
        {@render contents()}
      </div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
