<script lang="ts">
  import logo from '$lib/shared/images/allmaps-logo.svg?raw'
  import logoInverted from '$lib/shared/images/allmaps-logo-inverted.svg?raw'

  export let inverted = false
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html inverted ? logoInverted : logo}
