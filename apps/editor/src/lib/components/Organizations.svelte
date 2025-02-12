<script lang="ts">
  import Organization from '$lib/components/Organization.svelte'

  import type { Organization as OrganizationType } from '$lib/types/shared.js'

  type Props = {
    organizations: OrganizationType[]
  }

  let { organizations }: Props = $props()
</script>

<ul class="flex flex-col gap-8">
  {#each organizations as organization}
    <li class="contents">
      <Organization {organization} showMoreLink={true} />
    </li>
  {/each}
</ul>
