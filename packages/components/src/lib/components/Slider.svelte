<script lang="ts">
  import { Slider } from 'bits-ui'

  type Props = {
    value?: number
    min?: number
    max?: number
    step?: number
    id?: string
  }

  let {
    value = $bindable(0),
    min = 0,
    max = 1,
    step = 0.01,
    id
  }: Props = $props()
</script>

<Slider.Root
  type="single"
  bind:value
  {min}
  {max}
  {step}
  class="relative flex w-full h-6 touch-none select-none items-center"
>
  <span
    class="bg-pink/20 relative h-2 w-full grow cursor-pointer overflow-hidden rounded-full"
  >
    <Slider.Range class="bg-pink absolute h-full" />
  </span>
  <Slider.Thumb
    index={0}
    class="bg-white block size-6 cursor-pointer rounded-full
      border-pink/80 border-4 hover:border-pink
      shadow-sm transition-colors
      focus-visible:ring-foreground focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:pointer-events-none disabled:opacity-50"
  />
  <input type="hidden" bind:value {id} />
</Slider.Root>
