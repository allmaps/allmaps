<script lang="ts">
  import { Logo } from '@allmaps/ui'

  interface Props {
    name: string
  }

  let { name }: Props = $props()
</script>

<div class="flex flex-col justify-center items-center gap-4">
  <div class="size-20">
    <Logo />
  </div>

  <h1 class="text-2xl sm:text-4xl text-black text-center">
    <span class="font-bold">Allmaps</span>
    <span class="font-light">{name}</span>
  </h1>
</div>
