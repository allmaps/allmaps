<script lang="ts">
  import { Footer } from '@allmaps/components'

  import Title from '$lib/components/Title.svelte'
  import Organization from '$lib/components/Organization.svelte'

  let { data: organization } = $props()

  const count = 200
  const perPage = 25
</script>

<div class="w-full flex flex-col gap-6 items-center justify-center p-8">
  <a href="/" class="contents"><Title /></a>
</div>
<section
  class="w-full bg-[#f2feff] flex flex-col items-center p-2 md:p-4 pb-0 md:pb-0"
>
  <div class="max-w-(--breakpoint-lg) flex flex-col items-center p-y-4">
    <Organization {organization} {count} {perPage} />
  </div>
</section>
<Footer />
