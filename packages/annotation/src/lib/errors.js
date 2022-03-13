export function formatError(type, errors, index) {
  return `Errors encountered in ${type}${
    index ? ` ${index}` : ''
  }: ${errors.join(', ')}`
}

export class ValidationError extends Error {
  constructor(type, errors, index) {
    const message = formatError(type, errors, index)
    super(message)
    this.errors = errors
    this.name = 'AnnotationError'
  }
}
