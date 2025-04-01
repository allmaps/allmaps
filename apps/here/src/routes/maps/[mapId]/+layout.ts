import type { LayoutLoad } from './$types.js'

export const load: LayoutLoad = async ({ parent, params }) => {
  const { geojsonRoute, from } = await parent()

  const { mapId } = params

  return {
    selectedMapId: `https://annotations.allmaps.org/maps/${mapId}`,
    allmapsMapId: mapId,
    geojsonRoute,
    from
  }
}
