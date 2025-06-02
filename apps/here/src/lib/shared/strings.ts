const MAX_TRUNCATED_TEXT_LENGTH = 64

type TruncateOptions = {
  maxLength: number
  toNearestSpace: boolean
  maxNearestSpaceRatio: number
}

const defaultTruncateOptions: TruncateOptions = {
  maxLength: MAX_TRUNCATED_TEXT_LENGTH,
  toNearestSpace: false,
  maxNearestSpaceRatio: 0.2
}

/**
 * Truncates text to a specified length, with option to truncate at the nearest space.
 * @param text - The text to truncate
 * @param options - Optional configuration for truncation behavior
 * @returns The truncated text with ellipsis, or original text if no truncation needed
 */
export function truncate(
  text?: string,
  options?: Partial<TruncateOptions>
): string {
  if (!text) {
    return ''
  }

  const { maxLength, toNearestSpace, maxNearestSpaceRatio } = {
    ...defaultTruncateOptions,
    ...options
  }

  if (text.length <= maxLength) {
    return text
  }

  let truncateIndex = maxLength

  if (toNearestSpace) {
    const firstSpaceAfterTruncateIndex = text.indexOf(' ', maxLength)
    const lastSpaceBeforeTruncateIndex = text.lastIndexOf(' ', maxLength)

    // Maximum allowed distance based on the ratio
    const maxAllowedDistance = maxLength * maxNearestSpaceRatio

    // Calculate distances (if spaces exist)
    const firstSpaceDistance =
      firstSpaceAfterTruncateIndex !== -1
        ? firstSpaceAfterTruncateIndex - maxLength
        : Infinity

    const lastSpaceDistance =
      lastSpaceBeforeTruncateIndex !== -1
        ? maxLength - lastSpaceBeforeTruncateIndex
        : Infinity

    // Choose the closest space within allowed distance
    if (
      firstSpaceDistance <= lastSpaceDistance &&
      firstSpaceDistance <= maxAllowedDistance
    ) {
      truncateIndex = firstSpaceAfterTruncateIndex + 1
    } else if (lastSpaceDistance <= maxAllowedDistance) {
      truncateIndex = lastSpaceBeforeTruncateIndex + 1
    }
  }

  return `${text.slice(0, truncateIndex)}…`
}
