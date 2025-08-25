export function parseCoordinates(
  coordinates: string,
  options?: Partial<{
    resourceHeight: number
  }>
): number[][] {
  const lines = coordinates.trim().split('\n')

  if (lines.length == 0) {
    throw new Error('No coordinates')
  }

  // For more about these datatypes, see https://observablehq.com/d/50deb2a74a628292

  if (lines.find((line) => line.slice(0, 4) === 'mapX') != undefined) {
    return parseQgisCoordinates(lines, options)
  } else if (lines[0].split(',').length >= 5) {
    return parseArcGisCsvCoordinates(lines, options)
  } else if (lines[0].split(/\t+/).length >= 4) {
    return parseArcGisTsvCoordinates(lines, options)
  } else if (lines[0].split(/\ +/).length >= 2) {
    // Note: split on spaces specifically instead of /\s+/
    // to prevent false positive of ArcGIS TSV file
    return parseGdalCoordinates(lines)
  } else {
    throw 'Unrecognised GCP type'
  }
}

export function parseQgisCoordinates(
  lines: string[],
  options?: Partial<{
    resourceHeight: number
  }>
): number[][] {
  if (!options || !options.resourceHeight) {
    throw new Error('Resource height required when parsing QGIS coordinates')
  }
  const resourceHeight = options.resourceHeight

  const coordinates = lines
    .filter(
      (line) => line.slice(0, 4) !== '#CRS' && line.slice(0, 4) !== 'mapX'
    )
    .map((line) =>
      line
        .replace(/\s+/g, '')
        .split(',')
        .map((_c, i, l) => {
          const newOrder = [2, 3, 0, 1]
          return l[newOrder[i]]
        })
        .map(
          (coordinate, index) =>
            Number(coordinate) + (index == 1 ? resourceHeight : 0)
        )
    )

  return coordinates
}

export function parseArcGisCsvCoordinates(
  lines: string[],
  options?: Partial<{
    resourceHeight: number
  }>
): number[][] {
  if (!options || !options.resourceHeight) {
    throw new Error(
      'Resource height required when parsing ArcGIS CSV coordinates'
    )
  }
  const resourceHeight = options.resourceHeight
  const coordinates = lines.map((line) =>
    line
      .replace(/\s+/g, '')
      .split(',')
      .slice(1)
      .map((coordinate, index) =>
        index == 1 ? resourceHeight - Number(coordinate) : Number(coordinate)
      )
  )

  return coordinates
}

export function parseArcGisTsvCoordinates(
  lines: string[],
  options?: Partial<{
    resourceHeight: number
  }>
): number[][] {
  if (!options || !options.resourceHeight) {
    throw new Error(
      'Resource height required when parsing ArcGIS TSV coordinates'
    )
  }
  const resourceHeight = options.resourceHeight
  const coordinates = lines.map((line) =>
    line
      .split('\t')
      .map((coordinate, index) =>
        index == 1
          ? resourceHeight - Number(coordinate.trim())
          : Number(coordinate.trim())
      )
  )

  return coordinates
}

export function parseGdalCoordinates(lines: string[]): number[][] {
  // String from mutliline file where each line contains multiple coordinates separated by whitespace
  return lines.map((line) =>
    line.split(/\s+/).map((coordinate) => Number(coordinate.trim()))
  )
}

export function parseInternalProjectionDefinition(
  coordinates: string
): string | undefined {
  const lines = coordinates.trim().split('\n')

  if (lines.find((line) => line.slice(0, 4) === 'mapX') != undefined) {
    return parseInternalProjectionDefinitionFromLine(lines[0])
  }
  return undefined
}

export function parseInternalProjectionDefinitionFromLine(
  line: string
): string | undefined {
  if (line.slice(0, 4) === '#CRS') {
    const internalProjectionDefinition = line.slice(5)
    if (internalProjectionDefinition.length > 0) {
      return internalProjectionDefinition
    }
  }
  return undefined
}
