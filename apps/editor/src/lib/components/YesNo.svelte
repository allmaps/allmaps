<script lang="ts">
  import { X as XIcon, Check as CheckIcon } from 'phosphor-svelte'

  import { red, green } from '@allmaps/tailwind'

  type Color = 'red' | 'green' | 'gray'

  type Props = {
    yes?: string
    no?: string
    yesColor?: Color
    noColor?: Color
    onYes?: () => void
    onNo?: () => void
    noDisabled?: boolean
    yesDisabled?: boolean
  } & Record<string, unknown>

  let {
    yes = 'Yes',
    no = 'No',
    yesColor = 'green',
    noColor = 'red',
    onYes,
    onNo,
    noDisabled = false,
    yesDisabled = false,
    ...restProps
  }: Props = $props()

  let colorClasses: Record<Color, { bg: string; text: string }> = {
    red: { bg: 'bg-red-100 hover:bg-red-100/70', text: 'text-red' },
    green: { bg: 'bg-green-100 hover:bg-green-100/70', text: 'text-green' },
    gray: { bg: 'bg-gray-100 hover:bg-gray-100/70', text: 'text-gray' }
  }

  let noColorClass = $derived(colorClasses[noColor])
  let yesColorClass = $derived(colorClasses[yesColor])
</script>

<div class="flex flex-row items-center gap-2" {...restProps}>
  <button
    onclick={onNo}
    disabled={noDisabled}
    class={[
      noDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
      'flex items-center gap-1 rounded-md p-2 text-sm transition-all disabled:opacity-50',
      noColorClass.bg
    ]}
  >
    <XIcon class={['size-4', noColorClass.text]} weight="bold" />
    <span>{no}</span>
  </button>

  <button
    onclick={onYes}
    disabled={yesDisabled}
    class={[
      yesDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
      'flex items-center gap-1 rounded-md p-2 text-sm transition-all disabled:opacity-50',
      yesColorClass.bg
    ]}
  >
    <CheckIcon class={['size-4', yesColorClass.text]} weight="bold" />
    <span>{yes}</span>
  </button>
</div>
