<script lang="ts">
  import { page } from '$app/state'

  import Error from '$lib/components/Error.svelte'
</script>

<div class="fixed grid h-dvh w-dvw">
  <Error error={page.error} />
</div>
