<script lang="ts">
  import { navigating } from '$app/state'

  import OrganizationBadge from '../metadata/OrganizationBadge.svelte'
  import Image from './Image.svelte'

  import examples from './examples.js'

  let navigatingToUrl = $derived(navigating.to?.url.searchParams.get('url'))

  type Props = {
    previewUrl: string
    annotationsUrl: string
    restUrl: string
  }

  type Example = {
    title: string
    organization?: string
    url: string
    allmapsId: string
  }

  type ApiImage = {
    id: string
    canvases: {
      label?: Record<string, string[]>
      manifests: { label?: Record<string, string[]> }[]
    }[]
  }

  let { previewUrl, annotationsUrl, restUrl }: Props = $props()

  // The built-in examples live on allmaps.org. Elsewhere, show recently
  // georeferenced images from this instance instead.
  let builtInExamples = $derived(
    examples.filter((example) => example.url.startsWith(annotationsUrl))
  )
  let instanceExamples = $state<Example[]>([])
  let shownExamples = $derived(
    builtInExamples.length ? builtInExamples : instanceExamples
  )

  function firstLabel(label?: Record<string, string[]>) {
    return label
      ? Object.values(label)
          .flat()
          .find((value) => value.trim())
      : undefined
  }

  $effect(() => {
    if (builtInExamples.length) return
    fetch(`${restUrl}/images?georeferenced=true&limit=6`)
      .then((response) => (response.ok ? response.json() : []))
      .then((images: ApiImage[]) => {
        instanceExamples = images.map((image) => {
          const id = image.id.split('/').at(-1) ?? image.id
          const canvas = image.canvases[0]
          return {
            title:
              firstLabel(canvas?.manifests[0]?.label) ??
              firstLabel(canvas?.label) ??
              id,
            url: `${annotationsUrl}/images/${id}`,
            allmapsId: `images/${id}`
          }
        })
      })
      .catch(() => {})
  })
</script>

{#if shownExamples.length}
  <p class="text-2xl font-bold text-black px-4 py-1 sm:p-8 text-center">
    Or explore one of the following maps
  </p>

  <ul class="grid grid-cols-1 sm:grid-cols-2 list-none gap-4 rounded-2xl">
    {#each shownExamples as example (example.url)}
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
{/if}
