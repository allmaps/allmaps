<script lang="ts">
  import Combobox from '$lib/components/Combobox.svelte'

  import { Globe as GlobeIcon } from 'phosphor-svelte'

  import type { Bbox } from '@allmaps/types'

  import type { ComboboxBaseItem } from '$lib/shared/types.js'
  import type { PickerProjection } from '$lib/shared/projections/projections.js'

  const MAX_PROJECTIONS_COUNT = 100 as const
  const MAX_BBOX_PROJECTIONS_COUNT = 6 as const

  type ProjectionPickerItem = ComboboxBaseItem & PickerProjection

  type Props = {
    projections: PickerProjection[]
    value?: string
    bbox?: Bbox
    searchProjectionsByString?: (query: string) => PickerProjection[]
    searchProjectionsByBbox?: (bbox: Bbox) => PickerProjection[]
    onselect?: (projection: PickerProjection) => void
  }

  let {
    projections,
    value = $bindable(),
    bbox,
    searchProjectionsByString = defaultSearchProjectionsByString,
    searchProjectionsByBbox,
    onselect
  }: Props = $props()

  function projectionToItem(
    projection: PickerProjection
  ): ProjectionPickerItem {
    return {
      ...projection,
      value: projection.id || '',
      label: projection.name || ''
    }
  }

  function defaultSearchProjectionsByString(query: string) {
    return projections.filter((projection) => {
      const lowerCaseSearchValue = query.toLowerCase()
      return (
        projection.name?.toLowerCase().includes(lowerCaseSearchValue) ||
        projection.id?.includes(lowerCaseSearchValue)
      )
    })
  }

  let inputValue = $state(value || '')

  const currentProjection = projections.find(
    (projection) => projection.id === value
  )

  const undefinedProjection: PickerProjection = {
    id: undefined,
    name: 'No projection',
    definition: ''
  }

  let bboxProjections = $derived<PickerProjection[]>(
    bbox && searchProjectionsByBbox
      ? searchProjectionsByBbox(bbox).slice(0, MAX_BBOX_PROJECTIONS_COUNT)
      : []
  )

  let suggestedProjections = $derived(
    [undefinedProjection, currentProjection, ...bboxProjections]
      .filter((projection) => projection !== undefined)
      .filter(
        (projection, index, self) =>
          self.findIndex((p) => projection.id === p.id) === index
      )
  )

  let suggestedProjectionsCodes = $derived(
    suggestedProjections.map((projection) => projection.id)
  )

  function handleInput(value: string) {
    inputValue = value
  }

  const filteredProjections = $derived(
    (!inputValue ? projections : searchProjectionsByString(inputValue))
      .slice(0, MAX_PROJECTIONS_COUNT)
      .filter(
        (projection) => !suggestedProjectionsCodes.includes(projection.id)
      )
  )

  let items = $derived<ProjectionPickerItem[][]>([
    suggestedProjections.map(projectionToItem),
    filteredProjections.map(projectionToItem)
  ])
</script>

<Combobox
  placeholder="Search projection…"
  {items}
  {value}
  icon={GlobeIcon}
  {onselect}
  oninput={handleInput}
  openOnFocus={true}
/>
