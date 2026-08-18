import { error } from '@sveltejs/kit'

const resourceIdPattern = /^[0-9a-f]{16}$/

export function parseResourceId(value: string, resourceName: string) {
  if (!resourceIdPattern.test(value)) {
    error(404, `${resourceName} not found`)
  }

  return value
}
