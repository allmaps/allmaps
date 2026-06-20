<script lang="ts">
  import CopyLink from './CopyLink.svelte'

  type Link = {
    label: string
    href: string
    version?: '2' | '3'
    versionLabel?: string
    complianceLevel?: 'level0' | 'level1' | 'level2'
    complianceLabel?: string
    group?: string
  }

  type ImageFixture = {
    id: string
    label: string
    imageLabel?: string
    manifestLabel?: string
    originalImageAnnotation: string
    width: number
    height: number
    annotation: string
    imageService2: string
    imageService3: string
    annotations: Link[]
    imageServices: Link[]
    imageExamples: Link[]
    manifestResources: Link[]
    manifests?: {
      iiif2: string
      iiif3: string
      variants: Link[]
    }
    errors: {
      infoJsons: Link[]
      imageServices: Link[]
      annotations: Link[]
      manifests: Link[]
    }
  }

  type CombinedResources = {
    annotations: Link[]
    manifests: Link[]
  }

  type Catalog = {
    combinedImages: CombinedResources
    images: ImageFixture[]
  }

  const corsModeLabels = {
    cors: 'With CORS headers',
    'no-cors': 'No CORS headers'
  } as const
  const corsModes = ['cors', 'no-cors'] as const
  const imageApiVersions = [
    { version: '2', label: 'IIIF Image API 2.1' },
    { version: '3', label: 'IIIF Image API 3.0' }
  ] as const
  const complianceLevels = ['level0', 'level2'] as const

  type Props = {
    catalog: Catalog
  }

  type CorsMode = keyof typeof corsModeLabels

  type ImageApiVersion = (typeof imageApiVersions)[number]['version']

  type ComplianceLevel = (typeof complianceLevels)[number]

  type ResourceTone = 'default' | 'error'

  type ResourceTableColumn = {
    key: string
    mode: CorsMode
    version: ImageApiVersion
    complianceLevel: ComplianceLevel
  }

  type ResourceTableGroup<Links> = {
    key: string
    label: string
    getLinks: (links: Links) => Link[]
  }

  type ResourceTableRow = {
    key: string
    group: string
    label: string
    links: Record<CorsMode, Link[]>
  }

  type ResourceTableRowGroup = {
    group: string
    rows: ResourceTableRow[]
  }

  let { catalog }: Props = $props()
  let hoveredThumbnailIndex = $state<number | undefined>()

  function withCorsMode(url: string, corsMode: CorsMode) {
    return url.replace(/\/cors(?=\/|$)/, `/${corsMode}`)
  }

  function getLinks(image: ImageFixture, corsMode: CorsMode) {
    const imageService2 = withCorsMode(image.imageService2, corsMode)
    const imageService3 = withCorsMode(image.imageService3, corsMode)
    const withMode = (link: Link): Link => ({
      ...link,
      href: withCorsMode(link.href, corsMode)
    })
    const manifests = image.manifests
      ? {
          iiif2: withCorsMode(image.manifests.iiif2, corsMode),
          iiif3: withCorsMode(image.manifests.iiif3, corsMode),
          variants: image.manifests.variants.map(withMode)
        }
      : undefined

    return {
      imageService2,
      imageService3,
      annotations: image.annotations.map(withMode),
      imageServices: image.imageServices.map(withMode),
      annotation: withCorsMode(image.annotation, corsMode),
      manifestResources: image.manifestResources.map(withMode),
      manifests,
      errors: {
        infoJsons: image.errors.infoJsons.map(withMode),
        imageServices: image.errors.imageServices.map(withMode),
        annotations: image.errors.annotations.map(withMode),
        manifests: image.errors.manifests.map(withMode)
      },
      examples: image.imageExamples.map(withMode)
    }
  }

  function getCombinedLinks(corsMode: CorsMode) {
    const withMode = (link: Link): Link => ({
      ...link,
      href: withCorsMode(link.href, corsMode)
    })

    return {
      annotations: catalog.combinedImages.annotations.map(withMode),
      manifests: catalog.combinedImages.manifests.map(withMode)
    }
  }

  function getThumbnailRotation(imageId: string) {
    const hash = imageId
      .split('')
      .reduce((total, character) => total + character.charCodeAt(0), 0)

    return (hash % 9) - 4
  }

  function getDirectImageLinks(links: ReturnType<typeof getLinks>) {
    return [
      ...links.imageServices.map((link) => ({
        ...link,
        href: `${link.href}/info.json`
      })),
      ...links.examples
    ]
  }

  type ImageLinks = ReturnType<typeof getLinks>

  type CombinedLinks = ReturnType<typeof getCombinedLinks>

  type CombinedResourceKind =
    | 'Annotation page'
    | 'IIIF Presentation 3.0 manifest'

  type CombinedScenarioLink = Link & {
    corsMode: CorsMode
    resourceKind: CombinedResourceKind
  }

  type CombinedScenario = {
    key: string
    title: string
    description: string
    link: CombinedScenarioLink
  }

  type CombinedScenarioGroup = {
    key: string
    label: string
    description: string
    scenarios: CombinedScenario[]
  }

  const corsResourceTableColumns: ResourceTableColumn[] =
    imageApiVersions.flatMap((imageApiVersion) =>
      complianceLevels.map((complianceLevel) => ({
        key: `cors-${imageApiVersion.version}-${complianceLevel}`,
        mode: 'cors',
        version: imageApiVersion.version,
        complianceLevel
      }))
    )

  const noCorsResourceTableColumns: ResourceTableColumn[] = [
    {
      key: 'no-cors-2-level0',
      mode: 'no-cors',
      version: '2',
      complianceLevel: 'level0'
    },
    {
      key: 'no-cors-3-level2',
      mode: 'no-cors',
      version: '3',
      complianceLevel: 'level2'
    }
  ]

  const resourceTableColumns = [
    ...corsResourceTableColumns,
    ...noCorsResourceTableColumns
  ]

  const imageResourceTableGroups: ResourceTableGroup<ImageLinks>[] = [
    {
      key: 'direct-image',
      label: 'Image Resources',
      getLinks: getDirectImageLinks
    },
    {
      key: 'annotations',
      label: 'Annotation Pages',
      getLinks: (links) => links.annotations
    },
    {
      key: 'manifests',
      label: 'Presentation Manifests',
      getLinks: (links) => links.manifestResources
    }
  ]

  const errorResourceTableGroups: ResourceTableGroup<ImageLinks>[] = [
    {
      key: 'info-jsons',
      label: 'Broken info.json',
      getLinks: (links) => links.errors.infoJsons
    },
    {
      key: 'image-services',
      label: 'Rate Limited Image Services',
      getLinks: (links) => links.errors.imageServices
    },
    {
      key: 'annotations',
      label: 'Broken Annotation Pages',
      getLinks: (links) => links.errors.annotations
    },
    {
      key: 'manifests',
      label: 'Broken Presentation Manifests',
      getLinks: (links) => links.errors.manifests
    }
  ]

  function createEmptyResourceLinks(): Record<CorsMode, Link[]> {
    return {
      cors: [],
      'no-cors': []
    }
  }

  function getResourceTableRows<Links>(
    corsLinks: Links,
    noCorsLinks: Links,
    groups: ResourceTableGroup<Links>[]
  ) {
    const rows: ResourceTableRow[] = []

    function addLinks(mode: CorsMode, source: Links) {
      for (const group of groups) {
        for (const link of group.getLinks(source)) {
          const key = `${group.key}:${link.label}`
          let row = rows.find((candidate) => candidate.key === key)

          if (!row) {
            row = {
              key,
              group: group.label,
              label: link.label,
              links: createEmptyResourceLinks()
            }
            rows.push(row)
          }

          row.links[mode].push(link)
        }
      }
    }

    addLinks('cors', corsLinks)
    addLinks('no-cors', noCorsLinks)

    return rows
  }

  function getImageResourceTableRows(
    corsLinks: ImageLinks,
    noCorsLinks: ImageLinks
  ) {
    return getResourceTableRows(
      corsLinks,
      noCorsLinks,
      imageResourceTableGroups
    )
  }

  function getImageErrorResourceTableRows(
    corsLinks: ImageLinks,
    noCorsLinks: ImageLinks
  ) {
    return getResourceTableRows(
      corsLinks,
      noCorsLinks,
      errorResourceTableGroups
    )
  }

  function getCellLinks(row: ResourceTableRow, column: ResourceTableColumn) {
    return row.links[column.mode].filter(
      (link) =>
        link.version === column.version &&
        link.complianceLevel === column.complianceLevel
    )
  }

  function isColumnLink(link: Link, mode: CorsMode) {
    return resourceTableColumns.some(
      (column) =>
        column.mode === mode &&
        link.version === column.version &&
        link.complianceLevel === column.complianceLevel
    )
  }

  function getSpanningLinks(row: ResourceTableRow, mode: CorsMode) {
    return row.links[mode].filter((link) => !isColumnLink(link, mode))
  }

  function hasCellLinks(row: ResourceTableRow) {
    return resourceTableColumns.some(
      (column) => getCellLinks(row, column).length > 0
    )
  }

  function hasSpanningLinks(row: ResourceTableRow) {
    return corsModes.some((mode) => getSpanningLinks(row, mode).length > 0)
  }

  function getResourceTableRowGroups(rows: ResourceTableRow[]) {
    const rowGroups: ResourceTableRowGroup[] = []

    for (const row of rows) {
      const lastGroup = rowGroups.at(-1)

      if (lastGroup?.group === row.group) {
        lastGroup.rows.push(row)
      } else {
        rowGroups.push({
          group: row.group,
          rows: [row]
        })
      }
    }

    return rowGroups
  }

  function getImageApiVersionLabel(version: ImageApiVersion) {
    return (
      imageApiVersions.find(
        (imageApiVersion) => imageApiVersion.version === version
      )?.label ?? `IIIF Image API ${version}`
    )
  }

  function getResourceDescription(
    row: ResourceTableRow,
    column: ResourceTableColumn
  ) {
    return [
      row.group,
      row.label,
      corsModeLabels[column.mode],
      getImageApiVersionLabel(column.version),
      column.complianceLevel
    ].join(', ')
  }

  function getSpanningResourceDescription(
    row: ResourceTableRow,
    mode: CorsMode,
    link: Link
  ) {
    return [
      row.group,
      row.label,
      corsModeLabels[mode],
      link.versionLabel,
      link.complianceLabel
    ]
      .filter(Boolean)
      .join(', ')
  }

  function getSpanningLinkLabel(link: Link) {
    return [link.versionLabel, link.complianceLabel].filter(Boolean).join(', ')
  }

  function getCombinedResourceLinks(
    links: CombinedLinks,
    corsMode: CorsMode
  ): CombinedScenarioLink[] {
    return [
      ...links.annotations.map((link) => ({
        ...link,
        corsMode,
        resourceKind: 'Annotation page' as const
      })),
      ...links.manifests.map((link) => ({
        ...link,
        corsMode,
        resourceKind: 'IIIF Presentation 3.0 manifest' as const
      }))
    ]
  }

  function getCombinedScenarioLink(
    corsLinks: CombinedLinks,
    noCorsLinks: CombinedLinks,
    corsMode: CorsMode,
    predicate: (link: CombinedScenarioLink) => boolean
  ) {
    const links =
      corsMode === 'cors'
        ? getCombinedResourceLinks(corsLinks, 'cors')
        : getCombinedResourceLinks(noCorsLinks, 'no-cors')

    return links.find(predicate)
  }

  function createCombinedScenario(
    key: string,
    title: string,
    description: string,
    link: CombinedScenarioLink | undefined
  ): CombinedScenario | undefined {
    if (!link) {
      return undefined
    }

    return {
      key,
      title,
      description,
      link
    }
  }

  function getCombinedScenarioGroups(
    corsLinks: CombinedLinks,
    noCorsLinks: CombinedLinks
  ): CombinedScenarioGroup[] {
    const findCombinedLink = (
      corsMode: CorsMode,
      predicate: (link: CombinedScenarioLink) => boolean
    ) => getCombinedScenarioLink(corsLinks, noCorsLinks, corsMode, predicate)

    const isIiif3Level2 = (link: CombinedScenarioLink) =>
      link.version === '3' && link.complianceLevel === 'level2'

    const scenarioGroups: CombinedScenarioGroup[] = [
      {
        key: 'all-correct',
        label: 'Baseline',
        description:
          'A small set of normal resources that should load cleanly.',
        scenarios: [
          createCombinedScenario(
            'all-annotations',
            'All annotations',
            'A CORS-enabled annotation page with all georeference annotations.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'Annotation page' &&
                link.label === 'All annotations' &&
                isIiif3Level2(link)
            )
          ),
          createCombinedScenario(
            'all-annotations-no-cors',
            'All annotations, no-CORS route',
            'The same baseline annotation page served without CORS headers.',
            findCombinedLink(
              'no-cors',
              (link) =>
                link.resourceKind === 'Annotation page' &&
                link.label === 'All annotations' &&
                isIiif3Level2(link)
            )
          ),
          createCombinedScenario(
            'all-embedded-annotations',
            'Manifest with embedded annotations',
            'Each canvas contains its annotation page.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'IIIF Presentation 3.0 manifest' &&
                link.label === 'All embedded annotations' &&
                isIiif3Level2(link)
            )
          ),
          createCombinedScenario(
            'all-linked-annotations',
            'Manifest with linked annotations',
            'Each canvas links to an external annotation page.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'IIIF Presentation 3.0 manifest' &&
                link.label === 'All linked annotations' &&
                isIiif3Level2(link)
            )
          ),
          createCombinedScenario(
            'manifest-level-annotations',
            'Manifest with manifest-level annotations',
            'The combined annotation page is embedded in the top-level manifest annotations property.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'IIIF Presentation 3.0 manifest' &&
                link.label === 'Manifest-level annotation page'
            )
          ),
          createCombinedScenario(
            'partial-manifest-level-annotations',
            'Manifest with manifest-level and canvas-level annotations',
            'Some georeference annotations are embedded at the manifest level, while others are embedded on their canvas.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'IIIF Presentation 3.0 manifest' &&
                link.label ===
                  'Some manifest-level, some canvas-level annotations'
            )
          )
        ].filter((scenario) => scenario !== undefined)
      },
      {
        key: 'mixed-cors-and-errors',
        label: 'Mixed CORS And Errors',
        description:
          'A few intentionally awkward resources for viewer failure handling.',
        scenarios: [
          createCombinedScenario(
            'mixed-image-cors',
            'Mixed image CORS',
            'Some annotations point at CORS-enabled image services, others at no-CORS image services.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'Annotation page' &&
                link.label === 'All annotations, mixed image CORS modes'
            )
          ),
          createCombinedScenario(
            'mixed-cors-errors',
            'Mixed CORS and incorrect annotations',
            'A single annotation page combines CORS modes and valid/invalid annotations.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'Annotation page' &&
                link.label ===
                  'Mixed CORS modes, correct and incorrect annotations'
            )
          ),
          createCombinedScenario(
            'mixed-embedded-errors',
            'Manifest with incorrect embedded annotations',
            'Some canvases embed valid annotation pages and others embed broken ones.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'IIIF Presentation 3.0 manifest' &&
                link.label === 'Mixed correct/incorrect embedded annotations'
            )
          )
        ].filter((scenario) => scenario !== undefined)
      },
      {
        key: 'loading-behavior',
        label: 'Loading Behavior',
        description:
          'Variants for testing successful metadata fetches with failing or slow follow-up resources.',
        scenarios: [
          createCombinedScenario(
            'image-requests-return-500',
            'Info.jsons load, image requests return 500',
            'The annotation page and image service info.jsons load, but every image request fails with a 500 response.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'Annotation page' &&
                link.label === 'All info.jsons load, image requests return 500'
            )
          ),
          createCombinedScenario(
            'slow-manifest-and-resources',
            'Slow manifest and resources',
            'The manifest, linked annotation pages, image service info.jsons, and image requests all respond slowly.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'IIIF Presentation 3.0 manifest' &&
                link.label === 'Slow manifest and resources'
            )
          ),
          createCombinedScenario(
            'some-slow-some-fast-images',
            'Some slow, some fast images',
            'The annotation page loads normally, but some image services respond slowly while others stay fast.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'Annotation page' &&
                link.label === 'Some slow, some fast images'
            )
          ),
          createCombinedScenario(
            'image-services-rate-limited-after-20s',
            'Image services return 429 after 20 seconds',
            'The annotation page loads normally and points at image services that serve info.json and tiles for 20 seconds, then return 429 responses.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'Annotation page' &&
                link.label === 'Image services return 429 after 20 seconds'
            )
          ),
          createCombinedScenario(
            'some-image-services-rate-limited-after-20s',
            'Some image services return 429 after 20 seconds',
            'Only some image services in the annotation page become rate limited, while the others continue responding normally.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'Annotation page' &&
                link.label === 'Some image services return 429 after 20 seconds'
            )
          )
        ].filter((scenario) => scenario !== undefined)
      },
      {
        key: 'mixed-structure',
        label: 'Partial And Mixed Structure',
        description:
          'Resources where canvases differ in annotation placement or image service shape.',
        scenarios: [
          createCombinedScenario(
            'partial-embedded',
            'Some embedded, some linked annotations',
            'Some canvases embed annotations while others link to annotation pages.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'IIIF Presentation 3.0 manifest' &&
                link.label === 'Some embedded, some linked annotations'
            )
          ),
          createCombinedScenario(
            'mixed-partof-hierarchy',
            'All annotations with mixed hierarchy',
            'Some annotation targets include manifest and canvas hierarchy, some omit the manifest, and some omit the canvas hierarchy.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'Annotation page' &&
                link.label === 'All annotations, mixed partOf hierarchy'
            )
          ),
          createCombinedScenario(
            'mixed-image-service-annotations',
            'Annotation page with mixed image services',
            'Annotation image bodies use both IIIF 2.1 level0 and IIIF 3.0 level2 services.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'Annotation page' &&
                link.group === 'image-services' &&
                link.versionLabel === 'IIIF Image API 2.1 + 3.0' &&
                link.complianceLabel === '2.1 level0 + 3.0 level2'
            )
          ),
          createCombinedScenario(
            'mixed-image-service-manifest',
            'Manifest with mixed image services',
            'Canvases use a mix of IIIF 3.0 level0 and level2 image services.',
            findCombinedLink(
              'cors',
              (link) =>
                link.resourceKind === 'IIIF Presentation 3.0 manifest' &&
                link.group === 'image-services' &&
                link.versionLabel === 'IIIF Image API 3.0' &&
                link.complianceLabel === 'level0 + level2'
            )
          )
        ].filter((scenario) => scenario !== undefined)
      }
    ]

    return scenarioGroups.filter((group) => group.scenarios.length > 0)
  }

  function getCombinedLinkDescription(link: CombinedScenarioLink) {
    return [
      link.resourceKind,
      link.label,
      corsModeLabels[link.corsMode],
      link.versionLabel,
      link.complianceLabel
    ]
      .filter(Boolean)
      .join(', ')
  }

  function getCombinedScenarioDescription(scenario: CombinedScenario) {
    return [scenario.title, getCombinedLinkDescription(scenario.link)].join(
      ', '
    )
  }
</script>

{#snippet resourceActions(
  row: ResourceTableRow,
  column: ResourceTableColumn,
  links: Link[]
)}
  <ul class="flex list-none flex-wrap justify-center gap-1 p-0">
    {#each links as link (link.href)}
      <li>
        <CopyLink
          compact
          description={getResourceDescription(row, column)}
          href={link.href}
          label={link.label}
        />
      </li>
    {/each}
  </ul>
{/snippet}

{#snippet spanningResourceActions(row: ResourceTableRow)}
  <div class="grid gap-2">
    {#each corsModes as corsMode (corsMode)}
      {@const links = getSpanningLinks(row, corsMode)}
      {#if links.length > 0}
        <div class="flex flex-wrap items-center gap-2">
          <span class="min-w-28 text-xs font-semibold text-gray-700">
            {corsModeLabels[corsMode]}
          </span>
          <ul class="flex list-none flex-wrap gap-1.5 p-0">
            {#each links as link (link.href)}
              <li
                class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2 py-1"
              >
                <span class="text-xs leading-tight text-gray-700">
                  {getSpanningLinkLabel(link)}
                </span>
                <CopyLink
                  compact
                  description={getSpanningResourceDescription(
                    row,
                    corsMode,
                    link
                  )}
                  href={link.href}
                  label={link.label}
                />
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    {/each}
  </div>
{/snippet}

{#snippet combinedScenarioList(groups: CombinedScenarioGroup[])}
  <div class="grid gap-6">
    {#each groups as group (group.key)}
      <section>
        <div class="mb-3">
          <h3 class="text-base leading-tight font-bold text-black">
            {group.label}
          </h3>
          <p class="mt-1 max-w-3xl text-sm leading-relaxed text-gray-700">
            {group.description}
          </p>
        </div>
        <div
          class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
        >
          {#each group.scenarios as scenario (scenario.key)}
            <article class="border-t border-gray-200 p-3.5 first:border-t-0">
              <h4 class="text-sm leading-tight font-bold text-black">
                <CopyLink
                  description={getCombinedScenarioDescription(scenario)}
                  href={scenario.link.href}
                  label={scenario.title}
                />
              </h4>
              <p class="mt-1 text-sm leading-relaxed text-gray-700">
                {scenario.description}
              </p>
            </article>
          {/each}
        </div>
      </section>
    {/each}
  </div>
{/snippet}

{#snippet resourceTable(rows: ResourceTableRow[], tone: ResourceTone)}
  <div
    class={[
      'overflow-x-auto rounded-lg border bg-white shadow-sm',
      tone === 'error' ? 'border-red-200' : 'border-gray-200'
    ]}
  >
    <table class="w-full min-w-[860px] border-collapse text-left text-sm">
      <thead>
        <tr class="text-white">
          <th
            class={[
              'w-64 border-r px-3 py-3 align-bottom font-semibold',
              tone === 'error'
                ? 'border-red-200 bg-red-100 text-red-900'
                : 'border-gray-300 bg-gray-200 text-black'
            ]}
            rowspan={3}
            scope="col"
          >
            Resource
          </th>
          <th
            class="border-r border-white/20 bg-blue-700 px-3 py-2 text-center font-semibold"
            colspan={4}
            scope="colgroup"
          >
            {corsModeLabels.cors}
          </th>
          <th
            class="bg-orange-700 px-3 py-2 text-center font-semibold"
            colspan={2}
            scope="colgroup"
          >
            {corsModeLabels['no-cors']}
          </th>
        </tr>
        <tr class="text-xs text-white">
          <th
            class="border-r border-white/20 bg-blue-600 px-3 py-2 text-center font-semibold"
            colspan={2}
            scope="colgroup"
          >
            IIIF Image API 2.1
          </th>
          <th
            class="border-r border-white/20 bg-blue-600 px-3 py-2 text-center font-semibold"
            colspan={2}
            scope="colgroup"
          >
            IIIF Image API 3.0
          </th>
          <th
            class="border-r border-white/20 bg-orange-600 px-3 py-2 text-center font-semibold"
            scope="col"
          >
            IIIF Image API 2.1
          </th>
          <th
            class="bg-orange-600 px-3 py-2 text-center font-semibold"
            scope="col"
          >
            IIIF Image API 3.0
          </th>
        </tr>
        <tr class="text-xs">
          <th
            class="border-r border-white/20 bg-blue-100 px-3 py-2 text-center font-mono font-semibold text-darkblue-900"
            scope="col"
          >
            level0
          </th>
          <th
            class="border-r border-white/20 bg-blue-100 px-3 py-2 text-center font-mono font-semibold text-darkblue-900"
            scope="col"
          >
            level2
          </th>
          <th
            class="border-r border-white/20 bg-blue-100 px-3 py-2 text-center font-mono font-semibold text-darkblue-900"
            scope="col"
          >
            level0
          </th>
          <th
            class="border-r border-white/20 bg-blue-100 px-3 py-2 text-center font-mono font-semibold text-darkblue-900"
            scope="col"
          >
            level2
          </th>
          <th
            class="border-r border-white/20 bg-orange-100 px-3 py-2 text-center font-mono font-semibold text-orange-900"
            scope="col"
          >
            level0
          </th>
          <th
            class="bg-orange-100 px-3 py-2 text-center font-mono font-semibold text-orange-900"
            scope="col"
          >
            level2
          </th>
        </tr>
      </thead>
      <tbody
        class={[
          'divide-y',
          tone === 'error' ? 'divide-red-100' : 'divide-gray-200'
        ]}
      >
        {#each getResourceTableRowGroups(rows) as rowGroup (rowGroup.group)}
          <tr>
            <th
              class={[
                'px-3 py-2 text-left text-xs leading-tight font-semibold',
                tone === 'error'
                  ? 'bg-red-200/70 text-red-900'
                  : 'bg-gray-200/80 text-gray-700'
              ]}
              colspan={resourceTableColumns.length + 1}
              scope="colgroup"
            >
              {rowGroup.group}
            </th>
          </tr>
          {#each rowGroup.rows as row (row.key)}
            <tr
              class={[
                tone === 'error'
                  ? 'hover:bg-red-100/60'
                  : 'hover:bg-gray-100/70'
              ]}
            >
              <th
                class={[
                  'border-r px-3 py-3 align-top text-left font-semibold',
                  tone === 'error'
                    ? 'border-red-100 bg-red-100/40'
                    : 'border-gray-200 bg-gray-100/50'
                ]}
                scope="row"
              >
                {row.label}
              </th>
              {#if !hasCellLinks(row) && hasSpanningLinks(row)}
                <td
                  class={[
                    'px-3 py-2 align-top',
                    tone === 'error' ? 'bg-red-100/30' : 'bg-gray-100/30'
                  ]}
                  colspan={resourceTableColumns.length}
                >
                  {@render spanningResourceActions(row)}
                </td>
              {:else}
                {#each resourceTableColumns as column (column.key)}
                  {@const links = getCellLinks(row, column)}
                  <td
                    class={[
                      'min-w-24 border-r px-2 py-2 align-top last:border-r-0',
                      column.mode === 'cors'
                        ? 'border-blue-100 bg-blue-100/40'
                        : 'border-orange-100 bg-orange-100/60',
                      tone === 'error' && column.mode === 'cors'
                        ? 'bg-red-100/30'
                        : '',
                      tone === 'error' && column.mode === 'no-cors'
                        ? 'bg-orange-100/70'
                        : ''
                    ]}
                  >
                    {#if links.length > 0}
                      {@render resourceActions(row, column, links)}
                    {/if}
                  </td>
                {/each}
              {/if}
            </tr>
          {/each}
        {/each}
      </tbody>
    </table>
  </div>
{/snippet}

<svelte:head>
  <title>Allmaps IIIF test server</title>
</svelte:head>

<main id="top" class="min-h-screen bg-gray-100 px-5 py-8 text-black md:px-8">
  <div class="mx-auto max-w-6xl">
    <h1 class="mb-2 text-3xl font-bold">Allmaps IIIF test server</h1>
    <p class="mb-7">
      Fixture images, annotations, manifests, and example image requests.
    </p>

    <article
      class="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white"
    >
      <header
        class="grid items-center gap-5 border-b border-gray-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
      >
        <div>
          <h2 class="mb-1.5 text-2xl leading-tight font-bold">
            Combined Images
          </h2>
          <p class="text-gray-700">
            Annotation and manifest fixtures spanning all images.
          </p>
        </div>
        <nav
          class="flex min-h-24 items-center justify-start pl-3 sm:justify-end"
          aria-label="Jump to image fixtures"
          onmouseleave={() => {
            hoveredThumbnailIndex = undefined
          }}
        >
          <div class="flex items-center">
            {#each catalog.images as image, index (image.id)}
              <!-- eslint-disable svelte/no-inline-styles -->
              <a
                class={[
                  'relative block h-18 w-24 rotate-[var(--thumbnail-rotation)] overflow-hidden rounded-md border border-white bg-gray-100 shadow-md ring-1 ring-gray-300 transition duration-200 ease-out hover:z-10 hover:shadow-lg focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink',
                  index > 0 ? '-ml-11' : '',
                  hoveredThumbnailIndex === undefined ||
                  hoveredThumbnailIndex === index
                    ? ''
                    : index < hoveredThumbnailIndex
                      ? '-translate-x-5'
                      : 'translate-x-5'
                ]}
                style={`--thumbnail-rotation: ${getThumbnailRotation(image.id)}deg`}
                href={`#${image.id}`}
                title={image.label}
                aria-label={`Jump to ${image.label}`}
                onblur={() => {
                  hoveredThumbnailIndex = undefined
                }}
                onfocus={() => {
                  hoveredThumbnailIndex = index
                }}
                onmouseenter={() => {
                  hoveredThumbnailIndex = index
                }}
              >
                <img
                  class="h-full w-full scale-110 object-cover"
                  src={`${image.imageService2}/full/220,/0/default.jpg`}
                  alt=""
                  width={image.width}
                  height={image.height}
                />
              </a>
              <!-- eslint-enable svelte/no-inline-styles -->
            {/each}
          </div>
        </nav>
      </header>
      <div class="bg-gray-100 p-4">
        {@render combinedScenarioList(
          getCombinedScenarioGroups(
            getCombinedLinks('cors'),
            getCombinedLinks('no-cors')
          )
        )}
      </div>
    </article>

    {#each catalog.images as image (image.id)}
      {@const corsLinks = getLinks(image, 'cors')}
      {@const noCorsLinks = getLinks(image, 'no-cors')}
      <article
        id={image.id}
        class="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white"
      >
        <header
          class="grid items-start gap-5 border-b border-gray-200 bg-white p-4 sm:grid-cols-[minmax(180px,280px)_minmax(0,1fr)]"
        >
          <img
            class="w-full max-w-full rounded-md border border-gray-300 sm:max-w-[280px]"
            src={`${image.imageService2}/full/320,/0/default.jpg`}
            alt={image.label}
            width={image.width}
            height={image.height}
          />
          <div>
            <div class="mb-1.5 flex items-start justify-between gap-3">
              <h2 class="text-2xl leading-tight font-bold">
                {image.manifestLabel ?? image.label}
              </h2>
              <a
                class="shrink-0 text-sm leading-6 font-semibold text-pink underline hover:text-pink-700"
                href="#top"
              >
                Back to top
              </a>
            </div>
            {#if image.imageLabel && image.imageLabel !== image.manifestLabel}
              <p class="mb-1 text-lg leading-tight text-gray-700">
                {image.imageLabel}
              </p>
            {/if}
            <p class="wrap-break-word">
              <!-- eslint-disable svelte/no-navigation-without-resolve -->
              <a
                class="font-mono text-darkblue-900 underline decoration-pink underline-offset-2 hover:text-pink"
                href={image.originalImageAnnotation}
              >
                {image.originalImageAnnotation}
              </a>
              <!-- eslint-enable svelte/no-navigation-without-resolve -->
            </p>
            <p class="mt-1 text-gray-700">{image.width} x {image.height}</p>
          </div>
        </header>
        <div class="grid gap-5 bg-gray-100 p-4">
          <section>
            <h3 class="mb-3 text-base leading-tight font-bold text-black">
              Resources
            </h3>
            {@render resourceTable(
              getImageResourceTableRows(corsLinks, noCorsLinks),
              'default'
            )}
          </section>

          <section class="rounded-lg border border-red-200 bg-red-100/60 p-3.5">
            <h3 class="mb-3 text-base leading-tight font-bold text-red-900">
              Resources With Errors
            </h3>
            {@render resourceTable(
              getImageErrorResourceTableRows(corsLinks, noCorsLinks),
              'error'
            )}
          </section>
        </div>
      </article>
    {/each}
  </div>
</main>
