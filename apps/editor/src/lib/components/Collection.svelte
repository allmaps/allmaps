<script
  lang="ts"
  generics="T extends SearchParams & { path: SearchParam<CollectionPath>, manifestId: SearchParam<string> }"
>
  import Breadcrumbs from './Breadcrumbs.svelte'

  import { LoadingSmall } from '@allmaps/components'

  import { parseLanguageString } from '$lib/shared/iiif.js'

  import type {
    CollectionPath,
    IIIFResource,
    SearchParam,
    SearchParams,
    SearchParamsInput
  } from '$lib/types/shared.js'

  type Breadcrumb = {
    label: string
    href: string
  }

  type Props = {
    parsedIiifAtPath?: IIIFResource
    path?: CollectionPath
    fetching?: boolean
    breadcrumbs: Breadcrumb[]
    paramsToUrl: (params: SearchParamsInput<T>) => string
  }

  let {
    parsedIiifAtPath,
    path = $bindable<CollectionPath>(),
    fetching = false,
    breadcrumbs,
    paramsToUrl
  }: Props = $props()

  let thumbnail = $derived(
    parsedIiifAtPath && 'thumbnail' in parsedIiifAtPath
      ? parsedIiifAtPath.thumbnail?.[0]
      : undefined
  )
</script>

<Breadcrumbs {breadcrumbs} />

{#if parsedIiifAtPath && (parsedIiifAtPath.type === 'manifest' || parsedIiifAtPath.type === 'collection') && parsedIiifAtPath.description}
  <p
    class="inset-shadow-sm max-h-48 w-full overflow-y-auto rounded-md bg-blue-100 p-2 italic text-blue-900"
  >
    {parseLanguageString(parsedIiifAtPath.description, 'en')}
  </p>
{/if}

<!-- {#if thumbnail}
  <img src={thumbnail.id} alt="Thumbnail" class="mb-2 max-h-16 rounded" />
{/if} -->

{#if fetching}
  <div class="flex items-center gap-2 p-2 text-sm">
    <LoadingSmall />
    <span class="text-sm">Loading</span>
  </div>
{:else if parsedIiifAtPath && parsedIiifAtPath.type === 'collection' && 'items' in parsedIiifAtPath}
  <ol class="flex list-decimal flex-row flex-wrap gap-2">
    {#each parsedIiifAtPath.items as item, index}
      {@const newPath = [...path, { index }]}
      {@const newManifestId = item.type === 'manifest' ? item.uri : undefined}
      <li class="flex items-center gap-2">
        <a
          href={paramsToUrl({
            path: newPath,
            manifestId: newManifestId
          } as SearchParamsInput<T>)}
          class="border-1 cursor-pointer rounded-lg border-blue-600 bg-blue-200 px-2 py-1"
          >{parseLanguageString(item.label)}</a
        >
      </li>
    {/each}
  </ol>
{/if}
