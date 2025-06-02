<script lang="ts">
  import { getErrorState } from '$lib/state/error.svelte.js'

  import { red } from '@allmaps/tailwind'
  import { MapMonster } from '@allmaps/ui'

  import Header from '$lib/components/Header.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'

  type Props = {
    error?: App.Error | null
  }

  let { error }: Props = $props()

  const errorState = getErrorState()

  let message = $derived.by(() => {
    if (error) {
      console.error(error)
      return error.message
    } else if (
      errorState.error &&
      typeof errorState.error === 'object' &&
      'message' in errorState.error &&
      errorState.error.message &&
      typeof errorState.error.message === 'string' &&
      errorState.error.message
    ) {
      console.error(errorState.error)
      return errorState.error.message
    } else {
      return 'Unknown error'
    }
  })
</script>

<div class="relative w-full h-full flex flex-col bg-red-200">
  <div
    class="absolute top-0 z-10 w-full h-full flex flex-col pointer-events-none"
  >
    <div class="contents pointer-events-auto">
      <Header appName="Here" />
    </div>
  </div>
  <DotsPattern color={red} opacity={0.5}>
    <div class="h-full flex flex-col gap-2 items-center justify-center">
      <div class="max-w-md flex flex-col gap-6 items-center justify-center">
        <MapMonster
          color="red"
          mood="sad"
          speechBalloonBackgroundColor="#fff"
          speechBalloonTextColor="#000"
        >
          <div class="bg-white">
            Error: {message}
          </div>
        </MapMonster>
        <a
          class="bg-red hover:bg-red-400 shadow hover:shadow-lg transition-all rounded-xl px-4 py-3 text-white"
          href="/">Reload</a
        >
      </div>
    </div>
  </DotsPattern>
</div>
