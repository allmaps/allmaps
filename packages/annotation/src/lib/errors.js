export function formatError(type, errors) {
  return `Errors encountered in ${type}: ${errors.map((error) => error.message).join(', ')}`
}

export class ValidationError extends Error {
  constructor(type, errors) {
    const message = formatError(type, errors)
    super(message)
    this.errors = errors
    this.name = 'AnnotationError'
  }
}
