<script
  lang="ts"
  generics="T extends SearchParams & { path: SearchParam<CollectionPath>, manifestId: SearchParam<string> }"
>
  import { ArrowRight as ArrowRightIcon } from 'phosphor-svelte'

  import IIIFSource from '$lib/components/IIIFSource.svelte'

  import { parseLanguageString } from '$lib/shared/iiif.js'

  import type {
    Manifest as IIIFManifest,
    EmbeddedManifest as EmbeddedIIIFManifest,
    Collection as IIIFCollection,
    EmbeddedCollection as EmbeddedIIIFCollection
  } from '@allmaps/iiif-parser'

  import type {
    SourceType,
    CollectionPath,
    SearchParam,
    SearchParams,
    SearchParamsInput
  } from '$lib/types/shared.js'

  type Item =
    | IIIFCollection
    | EmbeddedIIIFCollection
    | IIIFManifest
    | EmbeddedIIIFManifest

  type Props = {
    item: Item
    path: CollectionPath
    showThumbnail?: boolean
    paramsToUrl: (params: SearchParamsInput<T>) => string
  }

  let {
    item,
    path = $bindable<CollectionPath>(),
    showThumbnail = true,
    paramsToUrl
  }: Props = $props()

  let manifestId = $derived(item.type === 'manifest' ? item.uri : undefined)

  let thumbnail = $derived(
    item && 'thumbnail' in item ? item.thumbnail?.[0] : undefined
  )

  let itemsTypesCount = $derived.by<Record<SourceType, number>>(() => {
    if (item.type === 'collection' && 'items' in item) {
      return item.items.reduce(
        (acc, item) => {
          acc[item.type] = (acc[item.type] || 0) + 1
          return acc
        },
        {} as Record<SourceType, number>
      )
    } else if (item.type === 'manifest' && 'canvases' in item) {
      return { image: item.canvases.length } as Record<SourceType, number>
    } else {
      return {} as Record<SourceType, number>
    }
  })

  let hasItemsTypes = $derived(Object.keys(itemsTypesCount).length > 0)
</script>

<!-- is het collection? of manuifest? -->
<!-- al gedownload? -->

{#snippet explain(item: Item)}
  <div
    class={[
      'grid gap-1',
      hasItemsTypes
        ? 'grid-cols-[min-content_min-content_min-content_1fr]'
        : 'grid-cols-1'
    ]}
  >
    <div class="row-span-full">
      <IIIFSource sourceType={item.type} />
    </div>

    {#if hasItemsTypes}
      <ArrowRightIcon
        class="relative top-1 row-span-full size-4 shrink-0"
        weight="bold"
      />
      <ol class="contents">
        {#each Object.entries(itemsTypesCount) as [type, count] (type)}
          <li class="contents">
            <span
              class="col-start-3 rounded-xl border-1 border-blue bg-white/80 px-2 py-0.5 text-center text-xs tabular-nums"
              >{count}</span
            >
            <div class="col-start-4">
              <IIIFSource
                sourceType={type as SourceType}
                plural={count !== 1}
              />
            </div>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
{/snippet}

<!-- TODO: prettier removes <T>, I don't want that... -->
<!-- prettier-ignore -->
<a
  href={paramsToUrl({
    path,
    manifestId
  } as SearchParamsInput<T>)}
  class={[
    'grid grid-rows-[1fr_min-content] gap-2',
    showThumbnail ? 'h-62 grid-cols-[min-content_1fr]' : 'grid-cols-1',
    'group w-full cursor-pointer rounded-lg border-1 border-blue-600 bg-blue-200 p-2 transition-colors hover:bg-blue-100 md:gap-4'
  ]}
>
  {#if showThumbnail}
    <div
      class="row-span-2 aspect-square rounded bg-white p-2 transition-all group-hover:p-1"
    >
      {#if thumbnail}
        <img
          class="h-full w-full rounded object-contain inset-shadow-xs"
          src={thumbnail.id}
          alt="Thumbnail"
        />
      {/if}
    </div>
  {/if}

  <div class="flex min-h-0 flex-col gap-2 overflow-y-auto text-sm">
    {#if item.label}
      <h3 class="font-medium">{parseLanguageString(item.label)}</h3>
    {/if}
    {#if item.description}
      <p>{parseLanguageString(item.description)}</p>
    {/if}
  </div>

  <!-- <div class="flex flex-row items-center gap-2"> -->
  {@render explain(item)}
  <!-- </div> -->
</a>
