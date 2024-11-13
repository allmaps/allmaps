<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  export let rotation = 0
  export let followOrientation = false
</script>

<div class="w-12 md:w-14 rounded-full shadow-md">
  <button class="contents" on:click={() => dispatch('click')}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      style="--rotation: {rotation}deg;"
      viewBox="0 0 800 800"
    >
      <circle class="fill-white" cx="400" cy="400" r="400" />
      <g>
        <path class="fill-red-500" d="M310.3,400L400,79l89.7,321" />
        <path class="fill-gray-400" d="M489.7,400L400,721l-89.7-321" />
        {#if followOrientation}
          <circle
            class="fill-red-500 stroke-white"
            stroke-width="10"
            cx="400"
            cy="50"
            r="50"
          />
        {/if}
      </g>
    </svg>
  </button>
</div>

<style scoped>
  svg g {
    transition: transform 0.1s linear;
    transform-origin: center;
    transform: rotate(var(--rotation));
  }
</style>
