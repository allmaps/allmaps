import { goto } from '$app/navigation'

export function gotoRoute(url: string) {
  // eslint-disable-next-line svelte/no-navigation-without-resolve

  goto(url, {
    replaceState: false,
    keepFocus: true
  })
}
