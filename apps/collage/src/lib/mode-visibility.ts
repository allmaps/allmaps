type VisibilityLayer = {
  getWarpedMap: (id: string) => { visible: boolean } | undefined
  setMapOptions: (
    id: string,
    options: { visible: boolean },
    animation: { animate: false }
  ) => unknown
}

/** Remember the current scope, including maps hidden by group editing. */
export function modeVisibility(
  layer: VisibilityLayer,
  ids: string[],
  activeIds: string | string[]
) {
  const active = new Set(
    typeof activeIds === 'string' ? [activeIds] : activeIds
  )
  const original = ids.flatMap((id) => {
    const map = layer.getWarpedMap(id)
    return map ? [{ id, visible: map.visible }] : []
  })
  function apply(showOthers: boolean) {
    for (const { id, visible } of original) {
      if (!layer.getWarpedMap(id)) continue
      layer.setMapOptions(
        id,
        { visible: visible && (showOthers || active.has(id)) },
        { animate: false }
      )
    }
  }
  return {
    showOthers: (show: boolean) => apply(show),
    restore: () => apply(true)
  }
}
