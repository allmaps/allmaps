import { goto } from '$app/navigation'

import type { Page } from '@sveltejs/kit'

import type { View, MaybeView } from '$lib/types/shared.js'

export function getViewUrl(view: MaybeView): string {
  if (view) {
    return `/${view}`
  } else {
    return `/`
  }
}

export function getNewParamsFromUrl(url: string) {
  return {
    url,
    mapId: undefined,
    manifestId: undefined,
    imageId: undefined,
    path: undefined,
    page: undefined
  }
}

export function gotoRoute(url: string) {
  // eslint-disable-next-line svelte/no-navigation-without-resolve
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
