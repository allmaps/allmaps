<script lang="ts">
  import { fromError } from 'zod-validation-error'

  import { MapMonster } from '@allmaps/components'
  import { shades } from '@allmaps/tailwind'

  import { FetchError, type FetchErrorDetails } from '$lib/shared/errors.js'

  import type { ValidationError } from 'zod-validation-error'

  type Props = {
    error: unknown
  }

  let { error }: Props = $props()

  type ParsedFetchError = {
    type: 'fetch'
    url: string
    details: FetchErrorDetails
  }

  type ParsedParseError = {
    type: 'parse'
    details: ValidationError
  }

  type ParsedOtherError = {
    type: 'other'
    message: string
  }

  type ParsedError = ParsedFetchError | ParsedParseError | ParsedOtherError

  let mousePosition = $state<[number, number]>([0, 0])

  let clientWidth = $state(0)
  let clientHeight = $state(0)

  let backgroundRotate = $derived.by(() => {
    const [x, y] = mousePosition
    const centerX = clientWidth / 2
    const centerY = clientHeight / 2

    const deltaX = x / 7 - centerX
    const deltaY = y / 7 - centerY

    const angle = Math.atan2(deltaY, deltaX)
    const degrees = (angle * 180) / Math.PI + 45

    return degrees
  })

  const parsedError = $derived.by<ParsedError>(() => {
    let message: string

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        const validationError = fromError(error)
        return {
          type: 'parse' as const,
          details: validationError
        }
      } else if (error instanceof FetchError) {
        return {
          type: 'fetch' as const,
          url: error.url,
          details: error.details
        }
      } else {
        message = error.message
      }
    } else if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      message = error.message
    } else if (typeof error === 'string') {
      message = error
    } else {
      message = 'An unknown error occurred.'
    }

    return { type: 'other' as const, message }
  })

  function handleMousemove(event: MouseEvent) {
    mousePosition = [event.clientX, event.clientY]
  }
</script>

<svelte:body onmousemove={handleMousemove} bind:clientWidth bind:clientHeight />

{#snippet fetchError({ url, details }: ParsedFetchError)}
  {#if details.type === FetchError.INVALID_JSON}
    <p>The server did not return valid JSON.</p>
    <p>
      You might have used the URL of an HTML web page instead of a IIIF
      resource, or the IIIF resource is invalid.
    </p>
  {:else if details.type === FetchError.STATUS_CODE}
    <p>
      The server returned a {details.status} status code.
    </p>
    {#if details.status === 401 || details.status === 403}
      <p>
        You're not authorized to access this resource. Allmaps Editor can only
        access IIIF resources that are publicly available.
      </p>
    {:else if details.status === 404}
      <p>Not found.</p>
    {:else if details.status === 500}
      <p>Internal server error.</p>
    {/if}
  {:else if details.type === FetchError.MAYBE_CORS}
    <p>
      The IIIF resource you are trying to load may be blocked by a missing or
      invalid <a
        class="underline"
        href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS"
        >CORS policy</a
      >.
    </p>
    <p>
      You can try to open the JSON contents of the IIIF resource <a
        class="underline"
        target="_blank"
        href={url}>in a new tab</a
      >. If your browser can correctly display its contents, this probably means
      that the IIIF server does not send the correct CORS headers. To fix this,
      contact the institution that manages the IIIF server and ask them to
      enable CORS.
    </p>
  {:else if details.type === FetchError.INVALID_URL}
    <p>The IIIF URL you are trying to load is invalid.</p>
  {:else if details.type === FetchError.INVALID_PROTOCOL}
    <p>
      Allmaps Editor can only load IIIF resources over HTTPS. Because Allmaps
      Editor itself is loaded from a secure HTTPS origin, browsers
      <a
        class="underline"
        href="https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content"
        >disallows loading resources from insecure origins</a
      >.
    </p>
  {:else if details.type === FetchError.INVALID_DOMAIN}
    <p>The resource domain cannot be accessed: {details.domain}</p>
  {/if}
{/snippet}

{#snippet parseError({ details }: ParsedParseError)}
  <p>
    Allmaps Editor couldn't parse the IIIF resource you're trying to load. This
    probably means that the IIIF resource is incorrect but it could also mean
    that the Allmaps IIIF parser needs to be improved. You can use the
    <a class="underline" href="https://presentation-validator.iiif.io/"
      >IIIF Presentation API Validator</a
    > to see if the IIIF resource contains errors.
  </p>
  <p>This is the output of the Allmaps IIIF parser:</p>
  <p
    class="max-h-96 overflow-y-auto rounded-md bg-[#2e3440ff] p-2 font-mono text-sm break-all text-[#eceff4]"
  >
    {details.message}
  </p>
{/snippet}

<div
  class="background flex h-full w-full items-center justify-center p-4"
  style="--background-color: {shades
    .red[1]}; --background-rotate: {backgroundRotate}deg;"
>
  <div class="max-w-xl drop-shadow-lg">
    <MapMonster
      color="red"
      mood="sad"
      speechBalloonBackgroundColor="white"
      speechBalloonTextColor="black"
    >
      <div class="space-y-2">
        {#if parsedError.type === 'fetch'}
          {@render fetchError(parsedError)}
        {:else if parsedError.type === 'parse'}
          {@render parseError(parsedError)}
        {:else}
          <p>{parsedError.message}</p>
        {/if}

        <p>
          <a class="font-semibold underline" href="/"
            >Please reload Allmaps Editor</a
          > and try loading a different IIIF resource.
        </p>
      </div>
    </MapMonster>
  </div>
</div>

<style scoped>
  .background {
    --lighter-color: color-mix(in srgb, var(--background-color), white 10%);

    background: repeating-linear-gradient(
      var(--background-rotate),
      var(--background-color),
      var(--background-color) 10px,
      var(--lighter-color) 10px,
      var(--lighter-color) 20px
    );
  }
</style>
