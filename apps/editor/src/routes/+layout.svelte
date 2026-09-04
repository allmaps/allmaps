<script lang="ts">
  import { page } from '$app/state'
  import { onNavigate, afterNavigate } from '$app/navigation'

  import { Stats } from '@allmaps/ui'

  import { setErrorState } from '$lib/state/error.svelte.js'
  import { setExamplesState } from '$lib/state/examples.svelte.js'
  import { setImageInfoState } from '$lib/state/image-info.svelte.js'
  import { setMapGuideState } from '$lib/state/map-guide.svelte.js'
  import { setUrlState } from '$lib/state/url.svelte.js'
  import { setVarsState } from '$lib/state/vars.svelte.js'

  import { searchParams } from '$lib/shared/params.js'
  import { defineQueryParamClientStrategy } from '$lib/i18n/query-param-strategy.js'

  import type { EditorPublicEnv } from '@allmaps/env/editor'

  import '../app.css'
  import '@allmaps/ui/css/fonts.css'

  defineQueryParamClientStrategy()

  let { data, children } = $props()

  // svelte-ignore state_referenced_locally
  setVarsState<EditorPublicEnv>(data.env)

  setErrorState()
  const urlState = setUrlState(page.url, searchParams)

  // svelte-ignore state_referenced_locally
  setExamplesState(data.env.PUBLIC_REST_BASE_URL)
  setImageInfoState()
  setMapGuideState()

  onNavigate((navigation) => {
    if (!document.startViewTransition) {
      return
    }

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve()
        await navigation.complete
      })
    })
  })

  afterNavigate(() => urlState.updateUrl(page.url))
</script>

<Stats statsWebsiteId={data.env.PUBLIC_STATS_WEBSITE_ID} />
{@render children()}
