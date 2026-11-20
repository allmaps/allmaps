function hasGeoreferencingValue(value: unknown): boolean {
  return Array.isArray(value)
    ? value.some(hasGeoreferencingValue)
    : value === 'georeferencing'
}

function hasGeoreferencingPurpose(annotation: unknown) {
  if (!annotation || typeof annotation !== 'object') return false

  return (
    ('motivation' in annotation &&
      hasGeoreferencingValue(annotation.motivation)) ||
    ('purpose' in annotation && hasGeoreferencingValue(annotation.purpose))
  )
}

/** Select georeferencing annotations using the purpose of the page or its items. */
export function getGeoreferenceAnnotationItems(page: unknown): unknown[] {
  if (
    !page ||
    typeof page !== 'object' ||
    !('items' in page) ||
    !Array.isArray(page.items)
  ) {
    return []
  }

  return hasGeoreferencingPurpose(page)
    ? page.items
    : page.items.filter(hasGeoreferencingPurpose)
}
