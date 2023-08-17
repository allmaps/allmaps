<script lang="ts">
  import { onMount } from 'svelte'

  import { Dropdown } from 'flowbite'

  let dropdownElement: HTMLElement
  let dropdownButtonElement: HTMLElement

  onMount(() => {
    new Dropdown(dropdownElement, dropdownButtonElement, {
      placement: 'top'
    })
  })
</script>

<div>
  <button bind:this={dropdownButtonElement} type="button">
    <slot name="button" />
  </button>
  <div
    bind:this={dropdownElement}
    class="z-10 drop-shadow hidden bg-white divide-y divide-gray-100 rounded shadow overflow-y-auto max-h-[calc(100vh-7rem)]"
  >
    <slot name="dropdown" />
  </div>
</div>
