<script lang="ts">
  import { Button } from '$lib/button.js'
  import { ListDialog, type ListDialogState } from '$lib/list-dialog.js'

  let { listState }: { listState: ListDialogState } = $props()
  let open = $state(false)
  let trigger = $state<HTMLButtonElement | HTMLAnchorElement | null>(null)
</script>

<Button bind:ref={trigger} aria-haspopup="dialog" onclick={() => (open = true)}>
  View starred maps…
</Button>
<ListDialog
  bind:open
  title="Starred maps"
  emptyMessage="You don’t have any starred maps yet."
  state={listState}
  returnFocus={trigger}
/>
