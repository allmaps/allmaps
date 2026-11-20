<script lang="ts">
  import { onMount } from 'svelte'
  import { prefersReducedMotion } from 'svelte/motion'
  import { page } from '$app/state'
  import { fade } from 'svelte/transition'
  import { LoadingSmall, Logo } from '@allmaps/ui'
  import { CodeBlock } from '@allmaps/ui/code'
  import {
    CheckCircleIcon,
    MinusCircleIcon,
    QuestionIcon
  } from 'phosphor-svelte'
  import '../app.css'

  import DotTunnel from '$lib/DotTunnel.svelte'
  import ResourcePreview from '$lib/ResourcePreview.svelte'
  import { getResourcePreview } from '$lib/preview'
  import type { ResourcePreview as ResourcePreviewData } from '$lib/preview'

  import { findOrganization } from '$lib/organization'
  import { resolveResource } from '$lib/resolve'
  import { handoffUrl, parseResourceUrl } from '$lib/urls'

  import type { Organization } from '$lib/organization'
  import type { Resolution } from '$lib/resolve'
  import type { Destination } from '$lib/urls'
  import type { PageProps } from './$types'

  let { data }: PageProps = $props()
  let resolution = $state<Resolution>()
  let preview = $state<ResourcePreviewData>()
  let branding = $state<Organization['branding']>()
  let failedLogoUrl = $state<string>()
  let exampleInput = $state('')
  let redirectPending = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let handoffStarted = false
  let resource = $derived(parseResourceUrl(data.resourceUrl))
  let showResourcePreview = $derived(
    resource !== undefined && resolution?.state !== 'unsupported'
  )
  let logo = $derived(parseResourceUrl(branding?.logo ?? null)?.href)
  let destinationUrl = $derived(
    resolution?.state === 'ready'
      ? handoffUrl(data, resolution.handoff)
      : undefined
  )

  const title = 'Open in Allmaps'
  const description = 'Open a IIIF map in Allmaps Viewer or Allmaps Editor.'
  const socialImageAlt =
    'Open in Allmaps with the Allmaps logo on a pink dotted tunnel'
  const socialImageUrl = $derived(
    new URL('/open-in-allmaps.jpg', page.url).href
  )

  const redirectDelay = 4000
  const actionClass =
    'inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-pink-300 bg-pink-100 px-3 py-2 text-center text-sm font-medium text-pink hover:bg-pink-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-700 sm:w-auto sm:px-4'

  const defaultExampleUrl = 'https://example.org/iiif/manifest.json'
  let buttonExample = $derived(
    '<a href="https://open.allmaps.org/?' +
      new URLSearchParams({ url: exampleInput || defaultExampleUrl }) +
      '">\n  Open in Allmaps\n</a>'
  )

  onMount(() => {
    if (!resource) return
    const original = resource
    const controller = new AbortController()
    const signal = AbortSignal.any([
      controller.signal,
      AbortSignal.timeout(5000)
    ])

    const organization = findOrganization(
      data.restBaseUrl,
      original.hostname,
      signal
    ).then((result) => {
      if (!controller.signal.aborted) branding = result?.branding ?? null
    })

    void resolveResource(original, {
      ...data,
      signal,
      onResource: (resource) => {
        if (!controller.signal.aborted) {
          preview = getResourcePreview(
            resource,
            navigator.language.split('-')[0]
          )
        }
      }
    }).then(async (result) => {
      if (controller.signal.aborted) return
      resolution = result
      if (result.state !== 'ready' || !data.autoRedirect) return

      await organization
      if (controller.signal.aborted || handoffStarted) return
      timer = setTimeout(() => {
        handoffStarted = true
        trackHandoff(original.hostname, result.handoff.destination)
        window.location.replace(handoffUrl(data, result.handoff))
      }, redirectDelay)
      redirectPending = true
    })

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  })

  function trackHandoff(resourceHostname: string, destination: Destination) {
    if (!data.trackHandoffs || !navigator.sendBeacon) return

    try {
      const body = new Blob(
        [JSON.stringify({ resourceHostname, destination })],
        {
          type: 'application/json'
        }
      )
      navigator.sendBeacon('/analytics/handoff', body)
    } catch {
      // Analytics must not interrupt navigation.
    }
  }

  function handleHandoff(event: MouseEvent, destination: Destination) {
    if (event.defaultPrevented || (event.button !== 0 && event.button !== 1)) {
      return
    }

    handoffStarted = true
    clearTimeout(timer)
    redirectPending = false
    if (resource) trackHandoff(resource.hostname, destination)
  }
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Allmaps" />
  <meta property="og:url" content={page.url.href} />
  <meta property="og:image" content={socialImageUrl} />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={socialImageAlt} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={socialImageUrl} />
  <meta name="twitter:image:alt" content={socialImageAlt} />
</svelte:head>

{#snippet actionLabel(label: string)}
  <span>{label}</span>
  <span aria-hidden="true" class="shrink-0">→</span>
{/snippet}

<main
  class="relative isolate grid min-h-screen items-start justify-items-center bg-pink/50 px-3 py-8 font-sans text-black sm:items-center sm:p-8"
>
  <DotTunnel />
  <article
    class={[
      'grid w-full max-w-2xl grid-cols-1 overflow-hidden rounded-xl border border-pink-300 bg-white shadow-lg sm:grid-cols-2',
      showResourcePreview &&
        "max-sm:[grid-template-areas:'allmaps'_'thumbnail'_'organization'_'title'_'footer'] sm:min-h-[23rem] sm:grid-rows-[auto_1fr_auto]"
    ]}
  >
    <header
      class={[
        'col-span-full grid grid-cols-subgrid items-center border-b border-pink-300 *:p-3',
        showResourcePreview && 'max-sm:contents'
      ]}
    >
      <div
        class={[
          'flex min-w-0 items-center gap-2 sm:gap-3',
          resource ? 'sm:min-h-16' : 'col-span-full',
          showResourcePreview &&
            'max-sm:[grid-area:allmaps] max-sm:border-b max-sm:border-pink-300'
        ]}
      >
        <div
          class="size-8 shrink-0 [&_svg]:block [&_svg]:size-full"
          aria-hidden="true"
        >
          <Logo />
        </div>
        <h1
          class="text-lg leading-tight font-bold [font-feature-settings:var(--geograph-ss01),var(--geograph-ss02),'ss03'_off,var(--geograph-tnum)] min-[340px]:text-xl sm:text-2xl"
        >
          {title}
        </h1>
      </div>

      {#if showResourcePreview && branding}
        <div
          class="flex min-w-0 items-center gap-2 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:starting:opacity-0 max-sm:[grid-area:organization]"
        >
          {#if logo && failedLogoUrl !== logo}
            <img
              class="h-8 w-auto max-w-8 shrink-0 object-contain object-left sm:h-10 sm:max-w-14"
              src={logo}
              alt=""
              onerror={() => (failedLogoUrl = logo)}
            />
          {/if}
          <p
            class="line-clamp-2 min-w-0 text-sm font-medium wrap-anywhere"
            title={branding.name}
          >
            {branding.name}
          </p>
        </div>
      {/if}
    </header>

    {#if data.invalid || resolution?.state === 'unsupported'}
      <div class="col-span-full space-y-4 p-3">
        <p>This link needs a valid IIIF Manifest or Image API URL.</p>
        <a class={actionClass} rel="external" href={data.docsUrl}>
          {@render actionLabel('Read the integration guide')}
        </a>
      </div>
    {:else if !resource}
      <div class="col-span-full flex flex-col gap-4 p-3">
        <p>
          Add an Open in Allmaps button to your collection website so visitors
          can explore georeferenced maps in
          <a
            class="text-pink underline underline-offset-2"
            rel="external"
            href={data.viewerBaseUrl}>Allmaps Viewer</a
          >
          or georeference maps in
          <a
            class="text-pink underline underline-offset-2"
            rel="external"
            href={data.editorBaseUrl}>Allmaps Editor</a
          >. Enter a IIIF Manifest URL, Image API service ID, or
          <code>info.json</code> URL below, then copy the generated HTML into your
          site.
        </p>
        <div class="space-y-2">
          <label class="block text-sm font-medium" for="example-url"
            >IIIF URL</label
          >
          <input
            id="example-url"
            type="text"
            inputmode="url"
            class="min-h-11 w-full rounded-md border border-pink-300 bg-white px-3 py-2 focus:border-pink-600 focus:outline-1 focus:outline-offset-0 focus:outline-pink-600"
            placeholder={defaultExampleUrl}
            bind:value={exampleInput}
          />
        </div>
        <div class="[--allmaps-code-background:#24292e] *:scheme-dark!">
          <CodeBlock code={buttonExample} language="html" />
        </div>
        <a class={actionClass + ' self-end'} rel="external" href={data.docsUrl}>
          {@render actionLabel('Read the integration guide')}
        </a>
      </div>
    {:else}
      {@const status =
        resolution?.state === 'ready'
          ? resolution.georeferencing.status
          : undefined}
      {@const appName =
        resolution?.state === 'ready' &&
        resolution.handoff.destination === 'viewer'
          ? 'Allmaps Viewer'
          : 'Allmaps Editor'}
      <ResourcePreview {preview} loading={!resolution}>
        {#snippet overlay()}
          <div
            role="status"
            class={[
              'flex min-w-0 items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs leading-4 font-medium shadow-sm [@media(scripting:none)]:hidden',
              status && status !== 'not-georeferenced'
                ? 'text-green-700'
                : 'text-gray-700'
            ]}
          >
            <div
              aria-hidden="true"
              class="size-4 shrink-0"
              class:opacity-75={!resolution}
            >
              {#if status === 'not-georeferenced'}
                <MinusCircleIcon class="size-full" />
              {:else if status}
                <CheckCircleIcon class="size-full" weight="bold" />
              {:else if resolution?.state === 'unknown'}
                <QuestionIcon class="size-full" />
              {:else}
                <LoadingSmall />
              {/if}
            </div>
            <span class="min-w-0 wrap-anywhere">
              {#if resolution?.state === 'unknown'}
                Couldn’t check status
              {:else if status === 'not-georeferenced'}
                Not georeferenced
              {:else if status === 'partly'}
                Partly georeferenced
              {:else if status === 'contains-georeferencing'}
                Georeferenced maps found
              {:else if status === 'georeferenced'}
                Georeferenced
              {:else}
                Checking georeferencing…
              {/if}
            </span>
          </div>
        {/snippet}
      </ResourcePreview>

      <footer
        class="col-span-full flex justify-end border-t border-pink-200 p-3 max-sm:[grid-area:footer]"
      >
        {#if resolution?.state === 'unknown'}
          <a
            class={actionClass}
            rel="external"
            href={handoffUrl(data, {
              destination: 'editor',
              source: resolution.source
            })}
            onclick={(event) => handleHandoff(event, 'editor')}
            onauxclick={(event) => handleHandoff(event, 'editor')}
          >
            {@render actionLabel('Open in Allmaps Editor')}
          </a>
        {:else if resolution?.state === 'ready' && destinationUrl}
          {@const { handoff } = resolution}
          <a
            class={actionClass + ' relative isolate overflow-hidden'}
            rel="external"
            href={destinationUrl}
            in:fade={{ duration: prefersReducedMotion.current ? 0 : 200 }}
            onclick={(event) => handleHandoff(event, handoff.destination)}
            onauxclick={(event) => handleHandoff(event, handoff.destination)}
          >
            {#if redirectPending}
              <span
                aria-hidden="true"
                class="pointer-events-none absolute inset-0 -z-10 hidden origin-left bg-pink-200/70 motion-safe:block motion-safe:transition-transform motion-safe:ease-linear starting:scale-x-0"
                style:transition-duration={`${redirectDelay}ms`}
              ></span>
            {/if}
            {@render actionLabel('Open in ' + appName)}
          </a>
        {:else}
          <span
            aria-hidden="true"
            class={actionClass + ' invisible [@media(scripting:none)]:hidden'}
          >
            {@render actionLabel('Open in ' + appName)}
          </span>
          <noscript class="w-full">
            <p class="mb-3 text-sm">
              Enable JavaScript to check this link, or choose an Allmaps app.
            </p>
            <div class="flex flex-wrap justify-end gap-2">
              <a
                class={actionClass}
                rel="external"
                href={handoffUrl(data, {
                  destination: 'viewer',
                  source: resource.href
                })}
              >
                {@render actionLabel('Open in Allmaps Viewer')}
              </a>
              <a
                class={actionClass}
                rel="external"
                href={handoffUrl(data, {
                  destination: 'editor',
                  source: resource.href
                })}
              >
                {@render actionLabel('Open in Allmaps Editor')}
              </a>
            </div>
          </noscript>
        {/if}
      </footer>
    {/if}
  </article>
</main>
