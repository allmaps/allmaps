<script lang="ts">
  import { Label, Switch } from 'bits-ui'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()
</script>

<div class="flex items-center space-x-3">
  <Switch.Root
    bind:checked={uiState.followPosition}
    id="follow"
    class="focus-visible:ring-foreground focus-visible:ring-offset-background data-[state=checked]:bg-foreground
    data-[state=unchecked]:bg-dark-10 data-[state=unchecked]:shadow-mini-inset dark:data-[state=checked]:bg-foreground
    focus-visible:outline-hidden peer inline-flex h-4 min-h-4 w-[60px]
    shrink-0 cursor-pointer items-center rounded-full px-[3px]
    transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  >
    <Switch.Thumb
      class="bg-black data-[state=unchecked]:shadow-mini dark:border-background/30 dark:bg-foreground dark:shadow-popover
      pointer-events-none block size-4 shrink-0 rounded-full transition-transform data-[state=checked]:translate-x-6
      data-[state=unchecked]:translate-x-0 dark:border dark:data-[state=unchecked]:border"
    />
  </Switch.Root>
  <Label.Root for="follow" class="text-sm font-medium"
    >Automatically follow position</Label.Root
  >
</div>
