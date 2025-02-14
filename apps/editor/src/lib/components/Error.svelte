<script lang="ts">
  import { fromError } from 'zod-validation-error'

  import { MapMonster } from '@allmaps/ui'
  import { red } from '@allmaps/tailwind'

  type Props = {
    error: unknown
  }

  let { error }: Props = $props()

  const { message, details } = $derived.by(() => {
    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        const validationError = fromError(error)
        return {
          message:
            'The IIIF resource you are trying to load seems to be invalid:',
          details: validationError.toString()
        }
      } else {
        return { message: error.message }
      }
    } else if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return { message: error.message }
    } else if (typeof error === 'string') {
      return { message: error }
    }

    return { message: 'An unknown error occurred.' }
  })
</script>

<div class="w-full h-full flex justify-center items-center p-4">
  <div class="max-w-xl drop-shadow-lg">
    <MapMonster
      color="red"
      mood="sad"
      speechBalloonBackgroundColor={red}
      speechBalloonTextColor="white"
    >
      <div class="space-y-2">
        <p>{message}</p>
        {#if details}
          <p class="font-mono bg-red-400 p-2 rounded-md">{details}</p>
        {/if}
        <p>
          <a class="font-bold underline" href="/"
            >Please reload Allmaps Editor</a
          >.
        </p>
      </div>
    </MapMonster>
  </div>
</div>
