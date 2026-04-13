<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    thead,
    tbody
  }: {
    thead: Snippet
    tbody: Snippet
  } = $props()
</script>

<div
  class="@container bg-white rounded-xl border border-gray-200 overflow-x-auto"
>
  <table class="min-w-full divide-y divide-gray-100">
    <thead>
      <tr class="bg-gray-50">
        {@render thead()}
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-100">
      {@render tbody()}
    </tbody>
  </table>
</div>
