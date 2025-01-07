<script lang="ts">
  import Organization from '$lib/components/Organization.svelte'

  let { data: organization } = $props()

  const count = 200
  const perPage = 25
</script>

<section class="w-full h-full bg-[#f2feff] flex flex-col items-center">
  <div class="max-w-screen-lg flex flex-col items-center p-y-4">
    <Organization {organization} {count} {perPage} />
  </div>
</section>
