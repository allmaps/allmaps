<script lang="ts">
  import { page } from '$app/state'
  import { onNavigate, afterNavigate } from '$app/navigation'

  import { setUrlState } from '$lib/state/url.svelte.js'

  import { searchParams } from '$lib/shared/params.js'

  import type { LayoutProps } from './$types'

  import './layout.css'
  import '@allmaps/ui/css/fonts.css'

  let { children }: LayoutProps = $props()

  const urlState = setUrlState(page.url, searchParams)

  let currentUrlParam = $state<string | undefined>(urlState.params.url)

  onNavigate((navigation) => {
    if (!document.startViewTransition) {
      return
    }

    const toUrlParam = navigation.to?.url.searchParams.get('url') || undefined
    const shouldTransition = currentUrlParam !== toUrlParam

    if (!shouldTransition) {
      return
    }

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })

  afterNavigate(() => {
    urlState.updateUrl(page.url)
    currentUrlParam = urlState.params.url
  })
</script>

<!-- The aoo's page + layout files are in the (app) directory.
 This is to make sure that the +error.svelte route is shown when errors occur
 in (app)/+layout.ts.
  -->
{@render children()}
