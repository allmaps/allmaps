<script lang="ts">
  // import '$lib/shared/app.css'

  import logo from '$lib/shared/images/allmaps-logo.svg'

  export let appName: string
</script>

<header class="shadow-md p-1 md:p-2">
  <nav class="mx-auto flex flex-wrap justify-between items-center gap-3">
    <a href="/" class="flex gap-2 no-underline">
      <img class="w-8 inline" alt="Allmaps logo" src={logo} />
      <h1
        class="self-center whitespace-nowrap text-xl font-semibold dark:text-white inline"
      >
        <span class="hidden sm:inline">Allmaps</span>
        <span class="font-light">{appName}</span>
      </h1>
    </a>
    <div class="flex grow">
      <slot />
    </div>
    <button
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
    </button>
  </nav>
</header>
