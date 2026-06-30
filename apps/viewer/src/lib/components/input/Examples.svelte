<script lang="ts">
  import { navigating } from '$app/state'

  import OrganizationBadge from '../metadata/OrganizationBadge.svelte'
  import Image from './Image.svelte'

  import examples from './examples.js'

  let navigatingToUrl = $derived(navigating.to?.url.searchParams.get('url'))

  type Props = {
    previewUrl: string
  }

  let { previewUrl }: Props = $props()
</script>

<p class="text-2xl font-bold text-black px-4 py-1 sm:p-8 text-center">
  Or explore one of the following maps
</p>

<ul class="grid grid-cols-1 sm:grid-cols-2 list-none gap-4 rounded-2xl">
  {#each examples as example (example.url)}
    {@const badgeOrganization = example.organization
      ? { organization: { label: { none: [example.organization] } } }
      : undefined}
    <li
      class="flex flex-col p-4 bg-white rounded-2xl shadow-md gap-2 hover:shadow-lg transition-all"
    >
      <a class="contents" href={`?url=${encodeURIComponent(example.url)}`}>
        <div
          class="w-full aspect-3/2 border-2 bg-gray/5 border-gray-100 inset-shadow-sm rounded-lg overflow-clip"
        >
          <Image
            alt={`Preview of ${example.title}`}
            class={[
              ' hover:scale-105 duration-700 transition-transform',
              navigatingToUrl === example.url && 'animate-pulse'
            ]}
            src={`${previewUrl}/${example.allmapsId}.webp?fit=best&width=600&height=400`}
          />
        </div>
        <div>
          <span class="text-sm text-green font-medium leading-tight"
            >{example.title}</span
          >
          <OrganizationBadge organization={badgeOrganization} />
        </div>
      </a>
    </li>
  {/each}
</ul>
