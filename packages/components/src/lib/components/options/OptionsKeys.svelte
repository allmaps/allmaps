<script lang="ts">
  import { WebGL2WarpedMap } from '@allmaps/render'

  import { nextTransformationType } from '$lib/shared/options/options'

  import type { LayerOptionsState } from './OptionsState.svelte'

  let defaultWebGL2Options = WebGL2WarpedMap.getDefaultOptions()

  let {
    layerOptionsState = $bindable()
  }: {
    layerOptionsState: LayerOptionsState
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
      layerOptionsState.visible = !(
        layerOptionsState.visible ?? defaultWebGL2Options.visible
      )
    } else if (e.key === 'f') {
      layerOptionsState.applyMask = !(
        layerOptionsState.applyMask ?? defaultWebGL2Options.applyMask
      )
    } else if (e.key === 'm') {
      layerOptionsState.renderAppliableMask = !(
        layerOptionsState.renderAppliableMask ??
        defaultWebGL2Options.renderAppliableMask
      )
    } else if (e.key === 'p') {
      layerOptionsState.renderGcps = !(
        layerOptionsState.renderGcps ?? defaultWebGL2Options.renderGcps
      )
    } else if (e.key === 't') {
      layerOptionsState.transformationType = nextTransformationType(
        layerOptionsState.transformationType
      )
    } else if (e.key === 'g') {
      layerOptionsState.renderGrid = !layerOptionsState.renderGrid
      // } else if (e.key === 'd') {
      //   layerOptionsState.distortionMeasure = nextDistortionMeasure(
      //     layerOptionsState.distortionMeasure
      //   )
    } else if (e.key === ' ') {
      if (layerOptionsState.opacity !== 0) {
        backupOpacity = layerOptionsState.opacity
      }
      layerOptionsState.opacity = 0
    } else if (e.key === 'b') {
      if (layerOptionsState.removeColorThreshold !== 0.7) {
        backupRemoveColorThreshold = layerOptionsState.removeColorThreshold
      }
      layerOptionsState.removeColorThreshold = 0.7
    } else if (e.key === 'c') {
      layerOptionsState.colorize = !(
        layerOptionsState.colorize ?? defaultWebGL2Options.colorize
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
      layerOptionsState.opacity = backupOpacity
    } else if (e.key === 'b') {
      layerOptionsState.removeColorThreshold = backupRemoveColorThreshold
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} onkeyup={onKeyUp} />
