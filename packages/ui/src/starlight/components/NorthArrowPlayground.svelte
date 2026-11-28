<script module lang="ts">
  import { svelteExample } from './playground-usage.js'

  const initialRotation = 30
  const initialImageUpRotation = 0

  export function formatUsage(
    {
      rotation = 0,
      imageUpRotation,
      followOrientation = false
    }: {
      rotation?: number
      imageUpRotation?: number
      followOrientation?: boolean
    } = { rotation: initialRotation, imageUpRotation: initialImageUpRotation }
  ) {
    const script = [
      "import { NorthArrow } from '@allmaps/ui/north-arrow'",
      '',
      `let rotation = $state(${rotation})`
    ]
    const props = ['aria-label="Point north up"', '{rotation}']
    if (imageUpRotation !== undefined) {
      script.push(`let imageUpRotation = $state(${imageUpRotation})`)
      props.push('{imageUpRotation}')
    }
    script.push('', 'function pointNorthUp() {')
    if (imageUpRotation !== undefined)
      script.push('  imageUpRotation -= rotation')
    script.push('  rotation = 0', '}')
    if (followOrientation) props.push('followOrientation')
    props.push('onclick={pointNorthUp}')

    return svelteExample(
      script,
      `<div class="size-12">
  <NorthArrow
    ${props.join('\n    ')}
  />
</div>`
    )
  }
</script>

<script lang="ts">
  import { Checkbox } from '$lib/checkbox.js'
  import { NorthArrow } from '$lib/north-arrow.js'
  import Playground from './Playground.svelte'

  const inputClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-ring'

  let rotation = $state<number | undefined>(initialRotation)
  let imageUpRotation = $state<number | undefined>(initialImageUpRotation)
  let followOrientation = $state(false)

  function pointNorthUp() {
    if (imageUpRotation != null) imageUpRotation -= rotation ?? 0
    rotation = 0
  }
</script>

<Playground
  usage={formatUsage({
    rotation: rotation ?? 0,
    imageUpRotation: imageUpRotation ?? undefined,
    followOrientation
  })}
>
  {#snippet preview()}
    <div class="size-12">
      <NorthArrow
        aria-label="Point north up"
        {rotation}
        {imageUpRotation}
        {followOrientation}
        onclick={pointNorthUp}
      />
    </div>
  {/snippet}
  {#snippet controls()}
    <label class="grid gap-1.5 text-sm"
      >North rotation (degrees)
      <input class={inputClass} type="number" bind:value={rotation} />
    </label>
    <label class="grid gap-1.5 text-sm"
      >Image-up rotation (degrees)
      <input
        class={inputClass}
        type="number"
        placeholder="No marker"
        bind:value={imageUpRotation}
      />
    </label>
    <Checkbox bind:checked={followOrientation}>Follow orientation</Checkbox>
  {/snippet}
</Playground>
