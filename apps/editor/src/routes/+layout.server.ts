import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ platform }) => {
  if (!platform) {
    throw new Error('No platform env variable found')
  }

  return {
    vars: {
      ...platform.env
    }
  }
}
