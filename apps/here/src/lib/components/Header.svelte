<script lang="ts">
  import { page } from '$app/state'

  import { Logo } from '@allmaps/ui'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import { createRouteUrl } from '$lib/shared/router.js'

  import type { Snippet } from 'svelte'

  interface Props {
    children?: Snippet
    appName: string
  }

  let { children, appName }: Props = $props()

  const uiState = getUiState()
</script>

<header class="p-1 md:p-2 pointer-events-none">
  <nav
    class="mx-auto flex md:grid md:grid-cols-[1fr_max-content_1fr] justify-between items-center gap-3
    @container"
  >
    <a
      href={createRouteUrl(page, '/')}
      class="flex gap-2 no-underline justify-self-start pointer-events-auto"
      bind:clientWidth={uiState.elementSizes.top.left[0]}
      bind:clientHeight={uiState.elementSizes.top.left[1]}
    >
      <div class="w-8 inline">
        <Logo />
      </div>
      <h1 class="self-center whitespace-nowrap text-xl font-medium inline">
        <span class="@sm:inline">Allmaps</span>
        <span class="font-light">{appName}</span>
      </h1>
    </a>
    <div class="flex min-w-0 pointer-events-auto">
      {@render children?.()}
    </div>
    <div class="hidden md:contents"></div>
  </nav>
</header>
