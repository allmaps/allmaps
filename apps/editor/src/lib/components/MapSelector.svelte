<script lang="ts">
  import {
    ArrowLeft as ArrowLeftIcon,
    ArrowRight as ArrowRightIcon
  } from 'phosphor-svelte'

  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { m } from '$lib/paraglide/messages.js'

  const scopeState = getScopeState()

  function handlePreviousClick() {
    scopeState.activeMapId = scopeState.previousMapId
  }

  function handleNextClick() {
    scopeState.activeMapId = scopeState.nextMapId
  }
</script>

{#if scopeState.activeMapIndex !== undefined}
  <div
    class="flex items-center gap-1 rounded-md bg-white p-2 shadow-md sm:gap-2"
  >
    <div class="hidden leading-tight whitespace-nowrap sm:inline-block">
      {m.map_number_of_count({
        number: scopeState.activeMapIndex + 1,
        count: scopeState.mapsCount
      })}
    </div>
    <button
      class="cursor-pointer rounded-full bg-white p-0 transition-colors
       duration-200 hover:bg-gray-100/80"
      onclick={handlePreviousClick}
      title={m.previous_map()}
    >
      <ArrowLeftIcon class="size-6" />
    </button>
    <button
      class="cursor-pointer rounded-full bg-white p-0 transition-colors
       duration-200 hover:bg-gray-100/80"
      onclick={handleNextClick}
      title={m.next_map()}
    >
      <ArrowRightIcon class="size-6" />
    </button>
  </div>
{/if}
