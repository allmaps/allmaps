<script lang="ts">
  import { Footer } from '@allmaps/ui'

  import Title from '$lib/components/Title.svelte'
  import Organization from '$lib/components/Organization.svelte'

  const perPage = 25

  let { data } = $props()
</script>

<div class="flex w-full flex-col items-center justify-center gap-6 p-8">
  <a href="/" class="contents"><Title /></a>
</div>
<section
  class="flex w-full flex-col items-center bg-[#f2feff] p-2 pb-0 md:p-4 md:pb-0"
>
  <div class="p-y-4 flex max-w-(--breakpoint-lg) flex-col items-center">
    <Organization
      organization={data.organization}
      examples={data.examples}
      {perPage}
    />
  </div>
</section>
<Footer />
