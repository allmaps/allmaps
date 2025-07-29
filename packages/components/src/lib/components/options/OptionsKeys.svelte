<script lang="ts">
  import { WebGL2WarpedMap } from '@allmaps/render'

  import { nextTransformationType } from '$lib/shared/options/options'

  import type { LayerOptionsState } from './OptionsState.svelte'

  let defaultWebGL2Options = WebGL2WarpedMap.getDefaultOptions()

  let {
    optionsState = $bindable()
  }: {
    optionsState: LayerOptionsState
  } = $props()

  let backupOpacity: number | undefined
  let backupRemoveColorThreshold: number | undefined

  let keyPressed = $state(false)

  function onKeyDown(e: KeyboardEvent) {
    const targetElement = e.target as HTMLElement

    if (
      targetElement.tagName === 'INPUT' ||
      targetElement.tagName === 'TEXTAREA' ||
      targetElement.tagName === 'SELECT'
    ) {
      return
    }

    if (keyPressed == true) {
      return
    }
    keyPressed = true

    if (e.key === 'h') {
      optionsState.visible = !(
        optionsState.visible ?? defaultWebGL2Options.visible
      )
    } else if (e.key === 'f') {
      optionsState.applyMask = !(
        optionsState.applyMask ?? defaultWebGL2Options.applyMask
      )
    } else if (e.key === 'm') {
      optionsState.renderAppliableMask = !(
        optionsState.renderAppliableMask ??
        defaultWebGL2Options.renderAppliableMask
      )
    } else if (e.key === 'p') {
      optionsState.renderGcps = !(
        optionsState.renderGcps ?? defaultWebGL2Options.renderGcps
      )
    } else if (e.key === 't') {
      optionsState.transformationType = nextTransformationType(
        optionsState.transformationType
      )
    } else if (e.key === 'g') {
      optionsState.renderGrid = !optionsState.renderGrid
      // } else if (e.key === 'd') {
      //   optionsState.distortionMeasure = nextDistortionMeasure(
      //     optionsState.distortionMeasure
      //   )
    } else if (e.key === ' ') {
      if (optionsState.opacity !== 0) {
        backupOpacity = optionsState.opacity
      }
      optionsState.opacity = 0
    } else if (e.key === 'b') {
      if (optionsState.removeColorThreshold !== 0.7) {
        backupRemoveColorThreshold = optionsState.removeColorThreshold
      }
      optionsState.removeColorThreshold = 0.7
    } else if (e.key === 'c') {
      optionsState.colorize = !(
        optionsState.colorize ?? defaultWebGL2Options.colorize
      )
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    const targetElement = e.target as HTMLElement

    if (
      targetElement.tagName === 'INPUT' ||
      targetElement.tagName === 'TEXTAREA' ||
      targetElement.tagName === 'SELECT'
    ) {
      return
    }

    keyPressed = false

    if (e.key === ' ') {
      optionsState.opacity = backupOpacity
    } else if (e.key === 'b') {
      optionsState.removeColorThreshold = backupRemoveColorThreshold
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} />
