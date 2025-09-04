<script lang="ts">
  // import { page } from '$app/state'

  import { Header } from '@allmaps/ui'

  // import { getUrlState } from '$lib/state/url.svelte'

  // import { createRouteUrl, gotoRoute } from '$lib/shared/router.js'

  import Toolbar from '$lib/components/Toolbar.svelte'
  import Info from '$lib/components/Info.svelte'
  // import URLInput from '$lib/components/URLInput.svelte'

  // const urlState = getUrlState()

  // const hasCallback = false
  // const callbackUrl = 'https://example.com'
  // const callbackProject = 'Example Project'

  //  {#if hasCallback}
  //     <div class="w-full">
  //       You're georeferencing an image from <a href={callbackUrl}
  //         >{callbackProject}</a
  //       >
  //     </div>
  //   {:else if urlState.url}
  //     <URLInput onSubmit={handleInputSubmit} {urlState} />
  //   {/if}

  // function handleInputSubmit(url: string) {
  //   gotoRoute(createRouteUrl(page, 'images', { url }))
  // }
</script>

<!-- <div v-if="callbackProject" class="callback smaller">
  <span
    >You’re georeferencing {{ imageText }} from
    <span v-html="callbackProject"
  /></span>
  <a
    v-if="callback"
    :href="callback"
    class="button is-link is-success"
    type="button"
  >
    <span class="icon is-small">
      <i class="fas fa-external-link-alt"></i>
    </span>
    <span>Return</span>
  </a>
</div> -->

<Header appName="Editor">
  <div class="grid grid-cols-[1fr_max-content] w-full items-center gap-2">
    <Info />
    <Toolbar />
  </div>
</Header>
