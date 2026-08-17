<script lang="ts">
  import logo from '$lib/images/allmaps-logo.svg?raw'
  import logoInverted from '$lib/images/allmaps-logo-inverted.svg?raw'

  type Props = {
    inverted?: boolean
  }

  let { inverted = false }: Props = $props()
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags -->
{@html inverted ? logoInverted : logo}
