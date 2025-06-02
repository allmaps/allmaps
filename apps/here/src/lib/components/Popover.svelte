<script lang="ts">
  import { beforeNavigate } from '$app/navigation'

  import { Popover } from 'bits-ui'

  import type { Snippet } from 'svelte'

  type Props = {
    button: Snippet
    contents: Snippet
  }

  let { button, contents }: Props = $props()

  let open = $state(false)

  beforeNavigate(() => (open = false))
</script>

<Popover.Root bind:open>
  <Popover.Trigger class="min-w-0">
    {@render button()}
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content sideOffset={8} class="outline-0">
      <div>
        {@render contents()}
      </div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
