<script module lang="ts">
  import { createContext } from 'svelte'

  export const [getDialogEntered, setDialogEntered] =
    createContext<() => boolean>()
</script>

<script lang="ts">
  import { untrack, type ComponentProps } from 'svelte'
  import { Dialog } from '@ui-sdk/svelte/dialog'

  let {
    open = $bindable(false),
    onOpenChangeComplete,
    ...restProps
  }: ComponentProps<typeof Dialog> = $props()

  let entered = $state(untrack(() => open))
  setDialogEntered(() => entered)

  $effect.pre(() => {
    if (!open) entered = false
  })
</script>

<Dialog
  bind:open
  {...restProps}
  onOpenChangeComplete={(next) => {
    entered = next
    onOpenChangeComplete?.(next)
  }}
/>
