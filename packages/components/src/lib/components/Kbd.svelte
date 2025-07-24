<script lang="ts">
  let {
    key
  }: {
    key: string
  } = $props()
</script>

<kbd
  class="ml-1 min-h-6 inline-flex justify-center items-center py-1 px-1.5 bg-white border border-gray-200 font-mono text-xs text-gray-800 shadow-[0px_2px_0px_0px_rgba(0,0,0,0.08)] dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-200 dark:shadow-[0px_2px_0px_0px_rgba(255,255,255,0.1)] rounded-md"
  >{key}</kbd
>
