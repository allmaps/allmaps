<script lang="ts">
  import loading from '$lib/images/loading.webp'
</script>

<div role="status">
  <img
    alt="Loading…"
    aria-hidden="true"
    class="w-16 text-gray-200"
    src={loading}
  />

  <span class="sr-only">Loading…</span>
</div>
