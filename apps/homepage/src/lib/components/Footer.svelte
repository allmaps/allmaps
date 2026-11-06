<script lang="ts">
  import { navigationGroups } from '$lib/data/navigation.js'
  import { Logo } from '@allmaps/ui'
</script>

<footer
  class="bg-[radial-gradient(circle_at_50%_50%,#25318f_0%,#101656_100%)] w-full py-16 text-white lg:py-24"
>
  <div
    class="page-width grid gap-12 lg:grid-cols-[1fr_3fr] lg:items-baseline lg:gap-16"
  >
    <a
      href="/"
      class="relative block w-fit rounded-sm py-1 pl-13 text-2xl font-bold no-underline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-white"
    >
      <span
        class="absolute top-1/2 left-0 block w-10 -translate-y-1/2"
        aria-hidden="true"
      >
        <Logo inverted />
      </span>
      <span>Allmaps</span>
    </a>

    <nav
      aria-label="Footer"
      class="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:gap-x-8"
    >
      {#each navigationGroups as group (group.title)}
        <div>
          <h2 class="mb-5 text-base font-normal text-white/60">
            {group.title}
          </h2>
          <ul class="m-0 grid list-none gap-3 p-0">
            {#each group.links as link (link.href)}
              <li>
                <a
                  href={link.href}
                  class="rounded-sm text-base leading-relaxed text-white no-underline hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  {link.label}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </nav>
  </div>
</footer>
