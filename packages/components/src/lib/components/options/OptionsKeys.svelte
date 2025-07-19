<script lang="ts">
  import type { OptionsState } from './OptionsState.svelte'

  let {
    optionsState = $bindable()
  }: {
    optionsState: OptionsState
  } = $props()

  let backupOpacity: number

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'o') {
      if (optionsState.opacity !== 0) {
        backupOpacity = optionsState.opacity
      }
      optionsState.opacity = 0
    } else if (e.key === 't') {
      optionsState.nextTransformationType()
    } else if (e.key === 'p') {
      optionsState.renderTransformedGcps = !optionsState.renderTransformedGcps
    } else if (e.key === 'm') {
      optionsState.renderAppliableMask = !optionsState.renderAppliableMask
    } else if (e.key === 'd') {
      optionsState.nextDistortionMeasure()
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.key === 'o') {
      optionsState.opacity = backupOpacity
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} />
