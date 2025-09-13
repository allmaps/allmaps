<script lang="ts">
  import { page } from '$app/state'

  import { onNavigate, afterNavigate } from '$app/navigation'

  import { setUrlState } from '@allmaps/components'

  import { setUiState } from '$lib/state/ui.svelte.js'

  import type { Snippet } from 'svelte'

  import '../app.css'
  import '@allmaps/ui/css/fonts.css'

  type Props = {
    children?: Snippet
  }

  let { children }: Props = $props()

  const keys = ['url'] as const

  const urlState = setUrlState(page.url, keys)

  setUiState()

  onNavigate((navigation) => {
    if (!document.startViewTransition) return

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })

  afterNavigate(() => {
    urlState.updateUrl(page.url)
  })
</script>

{@render children?.()}
