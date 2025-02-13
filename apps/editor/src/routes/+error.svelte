<script lang="ts">
  import { page } from '$app/state'

  import Error from '$lib/components/Error.svelte'
</script>

<Error error={page.error} />
