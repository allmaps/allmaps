<script lang="ts">
  import { prettifyError, ZodError } from 'zod'

  import { MapMonster } from '@allmaps/components'
  import { shades } from '@allmaps/tailwind'

  import { FetchError, type FetchErrorDetails } from '$lib/shared/errors.js'
  import { m } from '$lib/paraglide/messages.js'

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
    details: string
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
      if (error instanceof ZodError) {
        return {
          type: 'parse' as const,
          details: prettifyError(error)
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
      message = m.unknown_error()
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
    <p>{m.invalid_json_error()}</p>
    <p>{m.invalid_json_hint()}</p>
  {:else if details.type === FetchError.STATUS_CODE}
    <p>
      {m.status_code_error({ status: details.status })}
    </p>
    {#if details.status === 401 || details.status === 403}
      <p>{m.unauthorized_error()}</p>
    {:else if details.status === 404}
      <p>{m.not_found_error()}</p>
    {:else if details.status === 500}
      <p>{m.internal_server_error()}</p>
    {/if}
  {:else if details.type === FetchError.MAYBE_CORS}
    <p>
      {m.cors_error()}
      <a
        class="underline"
        href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS"
        >CORS policy</a
      >.
    </p>
    <p>
      {m.cors_hint()}
    </p>
  {:else if details.type === FetchError.INVALID_URL}
    <p>{m.invalid_url_error()}</p>
  {:else if details.type === FetchError.INVALID_PROTOCOL}
    <p>
      {m.invalid_protocol_error()}
    </p>
  {:else if details.type === FetchError.INVALID_DOMAIN}
    <p>{m.invalid_domain_error({ domain: details.domain })}</p>
  {/if}
{/snippet}

{#snippet parseError({ details }: ParsedParseError)}
  <p>
    {m.parse_iiif_error()}
  </p>
  <p>{m.parser_output()}</p>
  <p
    class="max-h-96 overflow-y-auto rounded-md bg-[#2e3440ff] p-2 font-mono text-sm break-all text-[#eceff4]"
  >
    {details}
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
          <a class="font-semibold underline" href="/">{m.reload_editor()}</a>
          {m.reload_and_try_different_resource()}
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
