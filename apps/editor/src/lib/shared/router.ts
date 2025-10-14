import { goto } from '$app/navigation'

import type { Page } from '@sveltejs/kit'

import type { View, MaybeView, Params } from '$lib/types/shared.js'

export function createRouteUrl(
  page: Page,
  view: View | undefined,
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

  if (view) {
    return `/${view}?${searchParams}`
  } else {
    return `/?${searchParams}`
  }
}

export function gotoRoute(url: string) {
  goto(url, {
    replaceState: false,
    keepFocus: true
  })
}

export function getView(page: Page): View | undefined {
  const regex = /\/\(views\)\/(?<routeId>\w+)/

  const routeId = page.route?.id || ''

  const match = routeId.match(regex)
  const view = match?.groups?.routeId as MaybeView
  return view
}
