<script lang="ts">
  export let color: string
</script>

<div class="flex gap-2">
  <span class={`${color} inline-block w-6 h-6 rounded-full`} />
  <span><code>{color}</code></span>
</div>
