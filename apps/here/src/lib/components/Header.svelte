<script lang="ts">
  import { Logo } from '@allmaps/ui'

  import type { Snippet } from 'svelte'

  interface Props {
    children?: Snippet
    appName: string
  }

  let { children, appName }: Props = $props()
</script>

<header class="p-1 md:p-2">
  <nav class="mx-auto flex justify-between items-center gap-3 @container">
    <a href="/" class="flex gap-2 no-underline">
      <div class="w-8 inline">
        <Logo />
      </div>
      <h1 class="self-center whitespace-nowrap text-xl font-medium inline">
        <span class="@sm:inline">Allmaps</span>
        <span class="font-light">{appName}</span>
      </h1>
    </a>
    <div class="flex grow">
      {@render children?.()}
    </div>
    <!-- <button
      type="button"
      class="text-white bg-blue-100 hover:bg-blue-200 focus:ring-4 focus:ring-blue-300 rounded-lg text-sm p-2 focus:outline-none"
    >
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="black"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        /></svg
      >
    </button> -->
  </nav>
</header>
