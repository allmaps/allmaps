<script lang="ts">
  import logo from '$lib/shared/images/allmaps-logo.svg'
  import logoInverted from '$lib/shared/images/allmaps-logo-inverted.svg'

  export let inverted = false
</script>

<img
  class="w-full inline"
  alt="Allmaps logo"
  src={inverted ? logoInverted : logo}
/>
