<script
  lang="ts"
  generics="T extends SearchParams & { page: SearchParam<number>,path: SearchParam<CollectionPath>, manifestId: SearchParam<string> }"
>
  import Breadcrumbs from '$lib/components/Breadcrumbs.svelte'
  import Pagination from '$lib/components/Pagination.svelte'
  import CollectionItem from '$lib/components/CollectionItem.svelte'

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
    page?: number | undefined
    path?: CollectionPath
    fetching?: boolean
    breadcrumbs: Breadcrumb[]
    paramsToUrl: (params: SearchParamsInput<T>) => string
  }

  let {
    parsedIiifAtPath,
    page = $bindable<number | undefined>(),
    path = $bindable<CollectionPath>(),
    fetching = false,
    breadcrumbs,
    paramsToUrl
  }: Props = $props()

  // let thumbnail = $derived(
  //   parsedIiifAtPath && 'thumbnail' in parsedIiifAtPath
  //     ? parsedIiifAtPath.thumbnail?.[0]
  //     : undefined
  // )

  let someItemThumbnails = $derived(
    parsedIiifAtPath &&
      parsedIiifAtPath.type === 'collection' &&
      'items' in parsedIiifAtPath
      ? parsedIiifAtPath.items.some(
          (item) => 'thumbnail' in item && item.thumbnail
        )
      : false
  )

  let lastPathItem = $derived(path[path.length - 1])

  let paginationPage = $derived.by(() => {
    if (path.length === 0) {
      return page !== undefined ? page : 0
    } else if (lastPathItem && lastPathItem.page !== undefined) {
      return lastPathItem.page
    }
    return 0
  })

  const paginationPerPage = 20

  function handlePageChange(newPage: number) {
    if (path.length === 0) {
      if (newPage > 0) {
        page = newPage
      } else {
        page = undefined
      }
    } else {
      const newPath = [...path]
      const lastPathItem = newPath[newPath.length - 1]

      newPath[newPath.length - 1] = {
        ...lastPathItem,
        page: newPage
      }

      path = newPath
    }
  }
</script>

<Breadcrumbs {breadcrumbs} />

{#if parsedIiifAtPath && (parsedIiifAtPath.type === 'manifest' || parsedIiifAtPath.type === 'collection') && parsedIiifAtPath.description}
  <div
    class="max-h-48 w-full overflow-y-auto rounded-md bg-blue-100 p-2 text-blue-900 inset-shadow-sm"
  >
    <h3 class="font-medium">
      {parseLanguageString(parsedIiifAtPath.label, 'en')}
    </h3>
    <p class="italic">
      {parseLanguageString(parsedIiifAtPath.description, 'en')}
    </p>
  </div>
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
  {@const items = parsedIiifAtPath.items.slice(
    paginationPage * paginationPerPage,
    (paginationPage + 1) * paginationPerPage
  )}
  <ol class="grid grid-cols-1 gap-2 md:grid-cols-2">
    {#each items as item, index (item.uri)}
      {@const newPath = [
        ...path,
        { index: index + paginationPage * paginationPerPage }
      ]}
      <li class="flex items-center gap-2">
        <CollectionItem
          showThumbnail={someItemThumbnails}
          {item}
          bind:path={() => newPath, (newPath) => (path = newPath)}
          {paramsToUrl}
        />
      </li>
    {/each}
  </ol>
  {#if parsedIiifAtPath.items.length > paginationPerPage}
    <div class="flex justify-center">
      <Pagination
        bind:page={paginationPage}
        count={parsedIiifAtPath.items.length}
        perPage={paginationPerPage}
        onPageChange={handlePageChange}
      />
    </div>
  {/if}
{/if}
