<script lang="ts">
  import logo from '../images/allmaps-logo.svg?url'
  import invertedLogo from '../images/allmaps-logo-inverted.svg?url'

  import type { HTMLImgAttributes } from 'svelte/elements'

  let {
    inverted = false,
    alt = 'Allmaps',
    ...props
  }: Omit<HTMLImgAttributes, 'src' | 'srcset'> & {
    inverted?: boolean
  } = $props()
</script>

<img
  src={inverted ? invertedLogo : logo}
  {alt}
  width="32"
  height="32"
  {...props}
/>
