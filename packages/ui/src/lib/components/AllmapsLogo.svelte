<script module lang="ts">
  import { definePrimitive } from '@ui-sdk/core'
  import { createParts } from '@ui-sdk/svelte/primitive'

  const primitive = definePrimitive({
    name: 'allmaps-logo',
    state: () => ({}),
    api: () => ({}),
    slots: (slot) => ({ root: slot({}) })
  })
  const { Root } = createParts(primitive, { root: 'img' })
</script>

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

<Root
  src={inverted ? invertedLogo : logo}
  {alt}
  width="32"
  height="32"
  {...props}
  id={props.id ?? undefined}
/>
