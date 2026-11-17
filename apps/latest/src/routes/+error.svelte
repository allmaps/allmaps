<script lang="ts">
  import { resolve } from '$app/paths'
  import { page } from '$app/state'
  import { MapMonster } from '@allmaps/ui'

  let organizationNotFound = $derived(
    page.status === 404 && page.route.id === '/organizations/[organizationSlug]'
  )
  let title = $derived(
    page.status === 404
      ? organizationNotFound
        ? 'Organization not found'
        : 'Page not found'
      : 'We couldn’t load this page'
  )
  let message = $derived(
    page.status === 404
      ? organizationNotFound
        ? 'We couldn’t find a partner organization at this address.'
        : 'We couldn’t find the page you’re looking for.'
      : 'Latest is having trouble loading this page. Please try again in a moment.'
  )
</script>

<svelte:head>
  <title>{title} – Allmaps Latest</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="p-3">
  <div class="w-full @container">
    <ol
      class="grid grid-cols-1 gap-3 @xs:grid-cols-2 @lg:grid-cols-3 @5xl:grid-cols-[repeat(auto-fill,_minmax(16rem,_1fr))]"
    >
      <li class="aspect-square rounded-lg bg-red/20 p-1.5 @container">
        <section
          aria-labelledby="error-title"
          class="flex h-full flex-col justify-between gap-3 text-xs @min-[200px]:text-base"
        >
          <div class="space-y-2">
            <p class="font-mono text-xs @min-[200px]:text-sm">
              Error {page.status}
            </p>
            <h1
              id="error-title"
              class="text-base font-bold @min-[200px]:text-xl"
            >
              {title}
            </h1>
            <p>{message}</p>
          </div>
          <div class="flex flex-wrap items-center gap-4">
            <a
              href={resolve('/')}
              class="rounded underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              See the latest maps
            </a>
            {#if page.status >= 500}
              <button
                type="button"
                onclick={() => window.location.reload()}
                class="cursor-pointer rounded underline underline-offset-4 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                Try again
              </button>
            {/if}
          </div>
        </section>
      </li>
      <li
        class="flex aspect-square items-center justify-center rounded-lg bg-red/20 p-6"
        aria-hidden="true"
      >
        <MapMonster mood="sad" color="red" />
      </li>
    </ol>
  </div>
</main>
