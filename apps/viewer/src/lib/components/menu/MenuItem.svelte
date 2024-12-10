<script lang="ts">
  export let label: string
</script>

<li
  on:click
  on:keypress
  role="presentation"
  class="pl-6 pr-4 h-6 rounded-sm relative flex items-center cursor-pointer select-none hover:bg-blue-600 hover:text-white"
>
  {#if $$slots.default}
    <div class="absolute w-4 h-4 -ml-6">
      <slot />
    </div>
  {/if}
  <span>
    {label}
  </span>
</li>
