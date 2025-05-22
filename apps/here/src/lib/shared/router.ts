import { goto } from '$app/navigation'

import type { Page } from '@sveltejs/kit'

import type { Params } from '$lib/shared/types.js'

const FROM_DECIMALS = 6

export function createRouteUrl(
  page: Page,
  id: string,
  params?: Partial<Params>
) {
  const searchParams = new URLSearchParams(page.url.searchParams)
  // TODO: consider only setting valid URL params
  for (const [param, value] of Object.entries(params || {})) {
    if (value !== undefined) {
      if (value) {
        searchParams.set(param, value)
      } else {
        searchParams.delete(param)
      }
    }
  }

  const pathname = id.startsWith('/') ? id : `/${id}`
  return `${pathname}?${searchParams}`
}

export function gotoRoute(url: string) {
  goto(url, {
    replaceState: false,
    keepFocus: true
  })
}

export function getRouteId(page: Page) {
  return page.route.id?.slice(1)
}

export function getFrom(position: GeolocationPosition) {
  return [
    position.coords.latitude.toFixed(FROM_DECIMALS),
    position.coords.longitude.toFixed(FROM_DECIMALS)
  ].join(',')
}
