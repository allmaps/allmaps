<script lang="ts">
  import { SealWarning as SealWarningIcon } from 'phosphor-svelte'

  type Props = {
    title: string
    errorTitle: string
    errorMessage?: string
  }

  let { title, errorTitle, errorMessage }: Props = $props()
</script>

<div
  class="flex min-w-0 flex-1 flex-col gap-2 border border-red-200 p-2 rounded-lg bg-white text-red text-sm"
>
  <div class="flex min-w-0 items-center gap-2">
    <SealWarningIcon class="size-5 shrink-0" weight="bold" />
    <h4
      class="truncate text-sm font-medium flex items-center gap-2 transition-all"
    >
      {title}
    </h4>
  </div>

  <p>{errorTitle}</p>

  {#if errorMessage}
    <p class="wrap-break-word text-xs">
      {errorMessage}
    </p>
  {/if}
</div>
