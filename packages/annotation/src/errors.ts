// export function formatError(type, errors) {
//   return `Errors encountered in ${type}: ${errors.map((error) => error.message).join(', ')}`
// }

// export class ValidationError extends Error {
//   constructor(type, errors) {
//     const message = formatError(type, errors)
//     super(message)
//     this.errors = errors
//     this.name = 'AnnotationError'
//   }
// }

import { z } from 'zod'

export const annotationErrorMap: z.ZodErrorMap = (issue, ctx) => {
  // console.log('errormap', issue, ctx)
  // if (issue.code === z.ZodIssueCode.invalid_type) {
  //   if (issue.expected === 'string') {
  //     return { message: 'bad type!' }
  //   }
  // }
  // if (issue.code === z.ZodIssueCode.custom) {
  //   return { message: `less-than-${(issue.params || {}).minimum}` }
  // }
  return { message: ctx.defaultError }
}

export const mapErrorMap: z.ZodErrorMap = (issue, ctx) => {
  return { message: ctx.defaultError }
}
