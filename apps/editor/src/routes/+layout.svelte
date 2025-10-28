<script lang="ts">
  import { page } from '$app/state'
  import { onNavigate, afterNavigate } from '$app/navigation'

  import { Stats } from '@allmaps/components'

  import { setErrorState } from '$lib/state/error.svelte.js'
  import { setExamplesState } from '$lib/state/examples.svelte.js'
  import { setImageInfoState } from '$lib/state/image-info.svelte.js'
  import { setUrlState } from '$lib/state/url.svelte.js'

  import { searchParams } from '$lib/shared/params.js'

  import type { Snippet } from 'svelte'

  import '../app.css'
  import '@allmaps/components/css/fonts.css'

  const { children }: { children: Snippet } = $props()

  setErrorState()
  const urlState = setUrlState(page.url, searchParams)

  setExamplesState()
  setImageInfoState()

  onNavigate((navigation) => {
    if (!document.startViewTransition) return

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })

  afterNavigate(() => urlState.updateUrl(page.url))
</script>

<Stats />
{@render children()}
