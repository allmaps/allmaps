<script lang="ts">
  import { X as XIcon, Check as CheckIcon } from 'phosphor-svelte'

  import { red, green } from '@allmaps/tailwind'

  type Props = {
    yes?: string
    no?: string
    onYes?: () => void
    onNo?: () => void
    noDisabled?: boolean
    yesDisabled?: boolean
  } & Record<string, unknown>

  let {
    yes = 'Yes',
    no = 'No',
    onYes,
    onNo,
    noDisabled = false,
    yesDisabled = false,
    ...restProps
  }: Props = $props()
</script>

<div class="flex flex-row gap-2 items-center" {...restProps}>
  <button
    onclick={onNo}
    disabled={noDisabled}
    class="bg-red-100 p-2 rounded-md text-sm flex items-center gap-1
      cursor-pointer hover:bg-red-100/70
      transition-all disabled:opacity-50"
  >
    <XIcon class="size-4" weight="bold" color={red} />
    <span>{no}</span>
  </button>

  <button
    onclick={onYes}
    disabled={yesDisabled}
    class="bg-green-100 p-2 rounded-md text-sm flex items-center gap-1
      cursor-pointer hover:bg-green-100/70
      transition-all disabled:opacity-50"
  >
    <CheckIcon class="size-4" weight="bold" color={green} />
    <span>{yes}</span>
  </button>
</div>
