<script lang="ts">
  import { Switch, Label } from 'bits-ui'

  import type { Snippet } from 'svelte'

  type Props = {
    checked?: boolean
    children: Snippet
  }

  let { checked = $bindable(false), children }: Props = $props()

  const uid = $props.id()
</script>

<div class="inline-flex items-center space-x-3">
  <Switch.Root
    bind:checked
    id={uid}
    class="focus-visible:ring-foreground focus-visible:ring-offset-background
      data-[state=checked]:bg-pink data-[state=unchecked]:bg-gray data-[state=unchecked]:shadow-md
      inset-shadow-md
      focus-visible:outline-hidden peer inline-flex h-6 min-h-6
      w-10 shrink-0 cursor-pointer items-center rounded-full px-[3px] transition-colors focus-visible:ring-2
      focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <Switch.Thumb
      class="bg-white data-[state=unchecked]:shadow-md
        pointer-events-none block size-4 shrink-0 rounded-full transition-transform data-[state=checked]:translate-x-4
        data-[state=unchecked]:translate-x-0"
    />
  </Switch.Root>
  <Label.Root for={uid} class="text-sm font-medium"
    >{@render children()}</Label.Root
  >
</div>
