<script lang="ts">
  import { MapMonster } from '@allmaps/ui'
  import { ArrowLeftIcon } from 'phosphor-svelte'

  type Props = {
    status?: number
  }

  let { status = 404 }: Props = $props()

  const isNotFound = $derived(status === 404)
  const title = $derived(isNotFound ? 'Page not found' : 'Something went wrong')
</script>

<svelte:head>
  <title>{title} | Allmaps</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="error-page copy-width">
  <h1 class="sr-only">{status}</h1>

  <div class="error-art text-red" aria-hidden="true">
    <span class="error-digit">{status}</span>
    <div class="map-monster">
      <MapMonster color="red" mood="sad" />
    </div>
  </div>

  <div class="error-copy">
    <h2 class="text-red text-4xl leading-tight font-medium tracking-tight">
      {title}
    </h2>
    <p class="mt-4 text-base leading-relaxed text-black/60 sm:text-lg">
      {isNotFound
        ? 'The page you’re looking for doesn’t exist or has moved.'
        : 'The page could not be loaded. Please try again in a moment.'}
    </p>
  </div>

  <a
    class="text-red bg-red-100/60 hover:bg-red-100 focus-visible:outline-red mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-5 py-3 font-medium no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none"
    href="/"
    data-sveltekit-reload
  >
    <ArrowLeftIcon class="size-4" weight="bold" aria-hidden="true" />
    Back to the homepage
  </a>
</main>

<style>
  .error-page {
    display: flex;
    min-height: calc(100svh - 4rem);
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-block: 4rem 5rem;
    text-align: center;
  }

  .error-art {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 1.75rem;
  }

  .error-digit {
    font-size: 5.5rem;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.06em;
  }

  .map-monster {
    width: 4rem;
    flex-shrink: 0;
  }

  .map-monster :global(svg) {
    width: 100%;
  }

  .error-art,
  .error-copy {
    width: 16rem;
    max-width: 100%;
  }
</style>
