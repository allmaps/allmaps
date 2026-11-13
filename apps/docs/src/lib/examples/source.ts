export { exampleCode, exampleLibraries } from '@allmaps/ui/examples/source'

export const transformations = [
  { value: 'annotation', label: 'From annotation' },
  { value: 'polynomial1', label: 'Polynomial (order 1)' },
  { value: 'helmert', label: 'Helmert' },
  { value: 'thinPlateSpline', label: 'Thin plate spline' }
] as const

export const viewModes = [
  { value: 'fit', label: 'Fit after loading' },
  { value: 'bounds', label: 'Known bounds' },
  { value: 'list', label: 'WarpedMapList' }
] as const

export function validateAnnotationUrl(value: string) {
  const url = new URL(value)
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password
  ) {
    throw new Error(
      'Enter an HTTP or HTTPS annotation URL without credentials.'
    )
  }
  return url.href
}
