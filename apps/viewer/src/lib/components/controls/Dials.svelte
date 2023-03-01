<script lang="ts">
  import { renderOptions } from '$lib/shared/stores/render-options.js'

  import { Dial } from '@allmaps/ui'

  $renderOptions.removeBackground.enabled = true
</script>

<div
  class="inline-flex items-center p-1 space-x-1 md:space-x-3 text-sm bg-white border border-gray-200 rounded-lg"
>
  <Dial bind:value={$renderOptions.opacity} keyCode="Space">
    <svg
      class="h-6 w-6"
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
    >
      <title>Opacity</title>
      <path
        fill="#888888"
        d="M12 21q-3.325 0-5.663-2.3T4 13.1q0-1.625.625-3.037T6.35 7.55L12 2l5.65 5.55q1.1 1.1 1.725 2.513T20 13.1q0 3.3-2.337 5.6T12 21Zm-5.95-7H17.9q.3-1.8-.337-3.075T16.25 9L12 4.8L7.75 9q-.675.65-1.325 1.925T6.05 14Z"
      /></svg
    >
  </Dial>
  <Dial
    bind:value={$renderOptions.removeBackground.threshold}
    keyCode="KeyB"
    invert
    toggleValue={0.2}
  >
    <svg
      class="h-6 w-6"
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      ><title>Background color</title>
      <path
        fill="#888888"
        d="M10 16.75q-.4 0-.763-.15t-.662-.425l-4.75-4.75q-.275-.3-.425-.663T3.25 10q0-.4.15-.775t.425-.65L8.575 3.8l-1.7-1.7Q6.6 1.825 6.6 1.413T6.9.7q.3-.275.7-.287T8.3.7l7.875 7.875q.3.275.438.65t.137.775q0 .4-.138.763t-.437.662l-4.75 4.75q-.275.275-.65.425t-.775.15Zm0-11.525L5.225 10h9.55L10 5.225ZM19 17q-.825 0-1.413-.588T17 15q0-.525.313-1.125T18 12.75q.225-.3.475-.625T19 11.5q.275.3.525.625t.475.625q.375.525.688 1.125T21 15q0 .825-.588 1.413T19 17ZM4 24q-.825 0-1.413-.588T2 22q0-.825.588-1.413T4 20h16q.825 0 1.413.588T22 22q0 .825-.588 1.413T20 24H4Z"
      /></svg
    >
  </Dial>
</div>
