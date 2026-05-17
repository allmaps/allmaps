<script lang="ts">
  import { Logo } from '@allmaps/ui'

  import MainMenuControl from '$lib/components/MainMenuControl.svelte'

  import type { Snippet } from 'svelte'

  type Props = {
    children?: Snippet
    appName: string
  }

  let { children, appName }: Props = $props()
</script>

<header class="p-1 md:p-2">
  <nav
    class="mx-auto flex md:grid md:grid-cols-[1fr_max-content_1fr] justify-between items-start gap-3
    @container"
  >
    <a
      href="/"
      class="flex gap-2 no-underline justify-self-start pointer-events-auto"
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
    <div class="justify-self-end">
      <MainMenuControl />
    </div>
  </nav>
</header>
