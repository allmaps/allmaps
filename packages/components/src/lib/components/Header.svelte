<script lang="ts">
  import Logo from '$lib/components/Logo.svelte'

  import type { Snippet } from 'svelte'

  type Props = {
    appName: string
    children?: Snippet
  }

  let { appName, children }: Props = $props()
</script>

<header class="shadow-md p-0.5 md:p-1">
  <nav class="mx-auto flex justify-between items-center gap-3">
    <a href="/" class="flex gap-2 no-underline">
      <div class="w-8 inline">
        <Logo />
      </div>
      <h1 class="self-center whitespace-nowrap text-xl font-medium inline">
        <span class="hidden sm:inline">Allmaps</span>
        <span class="font-light">{appName}</span>
      </h1>
    </a>
    {#if children}
      <div class="flex grow">
        {@render children()}
      </div>
    {/if}
  </nav>
</header>
