<script lang="ts">
  export type SearchField = {
    value: string
    label: string
  }

  type Props = {
    fields: SearchField[]
    value?: string
    field?: string
    onsearch?: (value: string, field: string) => void
  }

  let {
    fields,
    value = $bindable(''),
    field = $bindable(''),
    onsearch
  }: Props = $props()

  // Default field to first option if not set
  $effect(() => {
    if (!field && fields.length > 0) {
      field = fields[0].value
    }
  })

  function search() {
    onsearch?.(value, field)
  }

  function clear() {
    value = ''
    onsearch?.('', field)
  }
</script>

<div class="flex gap-2">
  {#if fields.length > 1}
    <select
      bind:value={field}
      class="px-3 py-2 border border-gray-200 rounded-lg bg-white font-sans text-sm focus:outline-none focus:border-blue-400"
    >
      {#each fields as field (field.value)}
        <option value={field.value}>{field.label}</option>
      {/each}
    </select>
  {/if}
  <div class="relative flex-1">
    <input
      type="text"
      bind:value
      onkeydown={(e) => e.key === 'Enter' && search()}
      placeholder="Search..."
      class="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white font-sans text-sm focus:outline-none focus:border-blue-400 pr-8"
    />
    {#if value}
      <button
        onclick={clear}
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
        aria-label="Clear search"
      >
        ✕
      </button>
    {/if}
  </div>
  <button
    onclick={search}
    class="px-4 py-2 bg-blue-500 text-white rounded-lg font-sans text-sm transition hover:bg-blue-600 cursor-pointer"
  >
    Search
  </button>
</div>
