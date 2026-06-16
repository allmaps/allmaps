<script lang="ts">
  import { page } from '$app/state'

  import { Logo } from '@allmaps/ui'

  import AnnotationInput from '$lib/components/AnnotationInput.svelte'
  import PageSection from '$lib/components/PageSection.svelte'
  import { formatValidationIssuesFromMessage } from '$lib/shared/validation-error.js'

  let errorMessage = $derived(
    page.error?.message || 'The source could not be loaded.'
  )
  let urlParam = $derived(page.url.searchParams.get('url'))
  let validationIssues = $derived(
    formatValidationIssuesFromMessage(errorMessage)
  )
  let details = $derived(
    validationIssues.length > 0
      ? JSON.stringify(validationIssues, null, 2)
      : errorMessage
  )
</script>

<svelte:head>
  <title>Could not load annotation | Allmaps Viewer</title>
</svelte:head>

<main class="min-h-svh bg-white text-black">
  <header class="p-2">
    <nav class="mx-auto flex max-w-4xl items-center justify-between gap-3">
      <a href="/" class="flex gap-2 no-underline">
        <div class="w-8">
          <Logo />
        </div>
        <h1 class="self-center whitespace-nowrap text-xl font-medium">
          <span>Allmaps</span>
          <span class="font-light"> Viewer</span>
        </h1>
      </a>
      <a
        href="/"
        class="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium transition-colors hover:border-pink-500 hover:text-pink-600"
      >
        Open Viewer
      </a>
    </nav>
  </header>

  <PageSection>
    <div class="flex w-full max-w-2xl flex-col gap-6">
      <div class="flex flex-col gap-3">
        <p class="text-sm font-medium text-pink-600">
          Error {page.status}
        </p>
        <h2 class="text-3xl font-medium text-balance">
          Could not load this georeference annotation
        </h2>
        <p class="text-gray-700">
          The source was reached, but Allmaps Viewer could not parse it as a
          valid georeference annotation.
        </p>
      </div>

      {#if urlParam}
        <section class="flex flex-col gap-2">
          <h3 class="text-sm font-medium text-gray-700">Source URL</h3>
          <p
            class="overflow-x-auto rounded-md border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-800"
          >
            {urlParam}
          </p>
        </section>
      {/if}

      <section class="flex flex-col gap-3">
        <h3 class="text-sm font-medium text-gray-700">Validation details</h3>

        {#if validationIssues.length > 0}
          <div
            class="divide-y divide-gray-200 rounded-md border border-gray-200"
          >
            {#each validationIssues as issue}
              <div class="flex flex-col gap-1 p-3">
                <p class="font-medium text-gray-900">
                  {issue.message}
                </p>
                <p class="font-mono text-sm text-gray-600">
                  {issue.path}
                  {#if issue.code}
                    <span class="font-sans text-gray-400"> ({issue.code})</span>
                  {/if}
                </p>
              </div>
            {/each}
          </div>
        {:else}
          <p
            class="rounded-md border border-gray-200 bg-gray-50 p-3 text-gray-800"
          >
            {errorMessage}
          </p>
        {/if}

        <details class="rounded-md border border-gray-200 bg-gray-50">
          <summary class="cursor-pointer px-3 py-2 text-sm font-medium">
            Raw error
          </summary>
          <pre
            class="overflow-x-auto border-t border-gray-200 p-3 text-sm whitespace-pre-wrap text-gray-800">{details}</pre>
        </details>
      </section>

      <section class="flex flex-col gap-3">
        <h3 class="text-sm font-medium text-gray-700">Try another source</h3>
        <AnnotationInput roundedFull={false} autoFocus />
      </section>
    </div>
  </PageSection>
</main>
