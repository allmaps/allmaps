export type TileBand = {
  id: string
  layer: string
  minArea: number
  maxArea: number
  minzoom: number
  maxzoom: number
}

export const tileBands = [
  {
    id: 'global',
    layer: 'masks_global',
    minArea: 10_000_000_000_000,
    maxArea: Infinity,
    minzoom: 0,
    maxzoom: 6
  },
  {
    id: 'continent',
    layer: 'masks_continent',
    minArea: 1_000_000_000_000,
    maxArea: 10_000_000_000_000,
    minzoom: 2,
    maxzoom: 8
  },
  {
    id: 'country',
    layer: 'masks_country',
    minArea: 10_000_000_000,
    maxArea: 1_000_000_000_000,
    minzoom: 4,
    maxzoom: 10
  },
  {
    id: 'region',
    layer: 'masks_region',
    minArea: 100_000_000,
    maxArea: 10_000_000_000,
    minzoom: 6,
    maxzoom: 12
  },
  {
    id: 'city',
    layer: 'masks_city',
    minArea: 1_000_000,
    maxArea: 100_000_000,
    minzoom: 8,
    maxzoom: 14
  },
  {
    id: 'local',
    layer: 'masks_local',
    minArea: 0,
    maxArea: 1_000_000,
    minzoom: 10,
    maxzoom: 14
  }
] as const satisfies readonly TileBand[]

export function getTileBand(area: number | undefined): TileBand {
  if (typeof area !== 'number' || !Number.isFinite(area)) {
    return tileBands.at(-1) as TileBand
  }

  const tileBand = tileBands.find(
    (tileBand) => area >= tileBand.minArea && area < tileBand.maxArea
  )

  if (!tileBand) {
    throw new Error(`No tile band found for area ${area}`)
  }

  return tileBand
}
