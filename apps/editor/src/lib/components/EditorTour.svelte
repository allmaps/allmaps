<script lang="ts">
  import { afterNavigate, goto } from '$app/navigation'
  import { page } from '$app/state'
  import { mount, onMount, tick, unmount } from 'svelte'

  import EditorTourPopover from '$lib/components/EditorTourPopover.svelte'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getExamplesState } from '$lib/state/examples.svelte.js'
  import { getVarsState } from '$lib/state/vars.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import { getView, getViewUrl } from '$lib/shared/router.js'
  import {
    getTourViewTarget,
    prepareTourStep
  } from '$lib/shared/editor-tour.js'
  import type { TourTarget } from '$lib/shared/editor-tour.js'
  import { UiEvents } from '$lib/shared/ui-events.js'
  import { m } from '$lib/paraglide/messages.js'

  import type { Driver, DriveStep, PopoverDOM, State } from 'driver.js'
  import type { MaybeView, View } from '$lib/types/shared.js'
  import type { EditorPublicEnv } from '@allmaps/env/editor'

  const uiState = getUiState()
  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const mapsMergedState = getMapsMergedState()
  const urlState = getUrlState()
  const examplesState = getExamplesState()
  const varsState = getVarsState<EditorPublicEnv>()

  let tour: Driver | undefined
  let movingToView = false
  let mountedPopover: Record<string, unknown> | undefined
  let tourStartView: MaybeView
  let steps: TourStep[] = []

  const selector = {
    source: '[data-tour="editor-source"]',
    infoPopover: '[data-tour="editor-info-popover"]',
    workflow: '[data-tour="editor-workflow"]',
    imagesView: '[data-tour="editor-images-view"]',
    maskView: '[data-tour="editor-mask-view"]',
    georeferenceView: '[data-tour="editor-georeference-view"]',
    geocoderPopover: '[data-tour="editor-geocoder-popover"]',
    mapSettingsPopover: '[data-tour="editor-map-settings-popover"]',
    maps: '[data-tour="editor-maps"]',
    mapsPopover: '[data-tour="editor-maps-popover"]',
    transformation: '[data-tour="editor-transformation"]',
    gcps: '[data-tour="editor-gcps"]',
    resultsView: '[data-tour="editor-results-view"]',
    export: '[data-tour="editor-export"]',
    exportPopover: '[data-tour="editor-export-popover"]'
  }

  const popoverClasses = {
    wrapper: ['!rounded-lg', '!text-blue-900', '[font-family:inherit]'],
    progress: ['!text-xs', '!text-gray-500'],
    footer: ['!mt-4'],
    button: [
      '![text-shadow:none]',
      '!box-border',
      '!rounded-full',
      '!border',
      '!px-3',
      '!py-1.5',
      '!text-sm',
      '!font-medium',
      '!leading-none',
      '!transition-all',
      '!duration-150',
      'disabled:!cursor-default',
      'disabled:!opacity-40'
    ],
    previousButton: [
      '!border-blue/20',
      '!bg-blue/10',
      '!text-blue-900',
      'hover:!border-blue/30',
      'hover:!bg-blue/20',
      'focus-visible:!outline-none',
      'focus-visible:!ring-2',
      'focus-visible:!ring-blue/30'
    ],
    nextButton: [
      '!border-darkblue/90',
      '!bg-darkblue/90',
      '!text-white',
      '!shadow-none',
      'hover:!border-darkblue',
      'hover:!bg-darkblue',
      'hover:!shadow-md',
      'focus-visible:!outline-none',
      'focus-visible:!ring-2',
      'focus-visible:!ring-darkblue/30'
    ],
    closeButton: [
      '!rounded-full',
      '![text-shadow:none]',
      'hover:!bg-gray-100',
      'focus-visible:!outline-none',
      'focus-visible:!ring-2',
      'focus-visible:!ring-gray-200'
    ]
  }

  type TourPopoverData = {
    title: string
    description: string
  }

  type TourStep = DriveStep & {
    target: () => TourTarget
  }

  function sleep(duration: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, duration)
    })
  }

  async function waitForElement(selector: string) {
    for (let index = 0; index < 40; index += 1) {
      await tick()

      const element = document.querySelector(selector)
      if (element) {
        return element
      }

      await sleep(50)
    }
  }

  function addClasses(element: HTMLElement, classes: string[]) {
    element.classList.add(...classes)
  }

  function cleanupPopover() {
    const popover = mountedPopover
    mountedPopover = undefined

    if (popover) {
      void unmount(popover)
    }
  }

  function cleanupTourUi() {
    cleanupPopover()
    uiState.closeModalsAndPopovers()
    movingToView = false
  }

  function stylePopover(popover: PopoverDOM) {
    addClasses(popover.wrapper, popoverClasses.wrapper)
    addClasses(popover.progress, popoverClasses.progress)
    addClasses(popover.footer, popoverClasses.footer)
    addClasses(popover.previousButton, popoverClasses.button)
    addClasses(popover.previousButton, popoverClasses.previousButton)
    addClasses(popover.nextButton, popoverClasses.button)
    addClasses(popover.nextButton, popoverClasses.nextButton)
    addClasses(popover.closeButton, popoverClasses.closeButton)
  }

  function getPopoverData(state: State) {
    const data = state.activeStep?.data

    if (
      data &&
      typeof data.title === 'string' &&
      typeof data.description === 'string'
    ) {
      return data as TourPopoverData
    }
  }

  function renderPopover(popover: PopoverDOM, { state }: { state: State }) {
    const data = getPopoverData(state)

    stylePopover(popover)

    if (!data) {
      return
    }

    cleanupPopover()

    popover.title.hidden = true
    popover.description.replaceChildren()

    mountedPopover = mount(EditorTourPopover, {
      target: popover.description,
      props: data
    })
  }

  function getCompleteGcpCount(map = mapsState.activeMap) {
    return map
      ? Object.values(map.gcps).filter((gcp) => gcp.resource && gcp.geo).length
      : 0
  }

  function getCompleteMapCountForActiveImage() {
    return mapsState.maps.filter((map) => getCompleteGcpCount(map) >= 2).length
  }

  function canOpenExportPopover() {
    const callback = urlState.params.callback

    return (
      sourceState.canEdit &&
      mapsMergedState.completeMaps.length > 0 &&
      (!callback || !examplesState.isCallbackValid(callback))
    )
  }

  function getMapsPopoverData(): TourPopoverData {
    const mapCount = mapsState.mapsCountForActiveImage

    if (mapCount === 0) {
      return {
        title: m.tour_maps_empty_title(),
        description: m.tour_maps_empty_description()
      }
    }

    return {
      title: m.tour_maps_title(),
      description: m.tour_maps_description()
    }
  }

  function getResultsData(): TourPopoverData {
    if (getCompleteMapCountForActiveImage() === 0) {
      return {
        title: m.tour_results_pending_title(),
        description: m.tour_results_pending_description()
      }
    }

    return {
      title: m.tour_results_title(),
      description: m.tour_results_description()
    }
  }

  function getExportData(): TourPopoverData {
    if (mapsMergedState.completeMaps.length === 0) {
      return {
        title: m.tour_export_pending_title(),
        description: m.tour_export_pending_description()
      }
    }

    return {
      title: m.tour_export_title(),
      description: m.tour_export_description()
    }
  }

  function getTourUrl(view: MaybeView) {
    return urlState.generateUrl(getViewUrl(view), {
      imageId: sourceState.activeImageId || undefined
    })
  }

  function viewTarget(view: View): TourTarget {
    return getTourViewTarget(view, {
      canEdit: sourceState.canEdit,
      resultsEnabled:
        mapsMergedState.completeMaps.length > 0 ||
        mapsState.activeMap !== undefined
    })
  }

  async function moveTour(driver: Driver, direction: 1 | -1) {
    const activeIndex = driver.getActiveIndex()
    if (movingToView || activeIndex === undefined) {
      return
    }

    movingToView = true

    try {
      const destination = await prepareTourStep(steps, activeIndex, direction, {
        isActive: () => tour === driver && driver.isActive(),
        prepare: async (target) => {
          uiState.closeModalsAndPopovers()
          await tick()

          if (tour !== driver || !driver.isActive()) {
            return
          }

          if ('view' in target && getView(page) !== target.view) {
            await goto(getTourUrl(target.view), {
              keepFocus: true,
              noScroll: true
            })
          }

          if (tour === driver && driver.isActive() && target.popover) {
            uiState.popoverOpen[target.popover] = true
          }
        },
        waitForElement
      })

      if (!destination || tour !== driver || !driver.isActive()) {
        return
      }

      if (destination.index >= steps.length) {
        driver.destroy()
        return
      }

      const step = steps[destination.index]
      step.element = destination.selector

      const targetElement = document.querySelector(destination.selector)
      if (
        destination.selector === selector.transformation ||
        destination.selector === selector.gcps
      ) {
        targetElement?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }

      driver.moveTo(destination.index)
      await tick()
      driver.refresh()
    } finally {
      if (tour === driver) {
        movingToView = false
      }
    }
  }

  function getStep(
    target: TourTarget | (() => TourTarget),
    data: TourPopoverData,
    popover: DriveStep['popover'] = {}
  ): TourStep {
    const getTarget = typeof target === 'function' ? target : () => target
    return {
      element: getTarget().selector,
      target: getTarget,
      data,
      popover: {
        title: data.title,
        description: data.description,
        ...popover
      }
    }
  }

  function mapsTarget(targetSelector: string): TourTarget {
    return {
      selector: targetSelector,
      fallbackSelector: selector.maps,
      view: 'georeference',
      popover: 'maps',
      available: sourceState.canEdit
    }
  }

  function getSteps(): TourStep[] {
    const hasGeocoder = Boolean(varsState.PUBLIC_GEOCODE_EARTH_KEY)
    const activeMap = mapsState.activeMap

    const steps = [
      getStep(
        { selector: selector.source },
        {
          title: m.tour_source_title(),
          description: m.tour_source_description()
        }
      ),
      getStep(
        {
          selector: selector.infoPopover,
          fallbackSelector: selector.source,
          popover: 'info'
        },
        {
          title: m.tour_info_title(),
          description: m.tour_info_description()
        }
      ),
      getStep(
        { selector: selector.workflow, view: tourStartView },
        {
          title: m.tour_workflow_title(),
          description: m.tour_workflow_description()
        }
      ),
      getStep(() => viewTarget('images'), {
        title: m.tour_images_title(),
        description: m.tour_images_description()
      }),
      getStep(() => viewTarget('mask'), {
        title: m.tour_mask_title(),
        description: m.tour_mask_description()
      }),
      getStep(() => viewTarget('georeference'), {
        title: m.tour_georeference_title(),
        description: m.tour_georeference_description()
      })
    ]

    if (sourceState.canEdit) {
      if (hasGeocoder) {
        steps.push(
          getStep(
            () => ({
              selector: selector.geocoderPopover,
              fallbackSelector: selector.georeferenceView,
              view: 'georeference',
              popover: 'geocoder',
              available: sourceState.canEdit
            }),
            {
              title: m.tour_search_title(),
              description: m.tour_search_description()
            }
          )
        )
      }

      steps.push(
        getStep(
          () => ({
            selector: selector.mapSettingsPopover,
            fallbackSelector: selector.georeferenceView,
            view: 'georeference',
            popover: 'mapSettings',
            available: sourceState.canEdit
          }),
          {
            title: m.tour_map_settings_title(),
            description: m.tour_map_settings_description()
          }
        ),
        getStep(() => mapsTarget(selector.mapsPopover), getMapsPopoverData())
      )

      if (activeMap) {
        steps.push(
          getStep(
            () => ({
              ...mapsTarget(selector.transformation),
              available: sourceState.canEdit && Boolean(mapsState.activeMap)
            }),
            {
              title: m.tour_transformation_title(),
              description: m.tour_transformation_description()
            }
          )
        )

        if (Object.keys(activeMap.gcps).length > 0) {
          steps.push(
            getStep(
              () => ({
                ...mapsTarget(selector.gcps),
                available:
                  sourceState.canEdit &&
                  Object.keys(mapsState.activeMap?.gcps || {}).length > 0
              }),
              {
                title: m.tour_gcps_title(),
                description: m.tour_gcps_description()
              }
            )
          )
        }
      }
    }

    steps.push(
      getStep(() => viewTarget('results'), getResultsData()),
      getStep(
        () =>
          canOpenExportPopover()
            ? {
                selector: selector.exportPopover,
                fallbackSelector: selector.export,
                popover: 'export'
              }
            : { selector: selector.export },
        getExportData(),
        { side: 'left' }
      )
    )

    return steps
  }

  async function startTour() {
    uiState.closeModalsAndPopovers()

    const firstElement = await waitForElement(selector.source)
    if (!firstElement) {
      return
    }

    const { driver } = await import('driver.js')

    tour?.destroy()
    tourStartView = getView(page)

    steps = getSteps()
    tour = driver({
      steps,
      onNextClick: (_element, _step, { driver }) => {
        void moveTour(driver, 1)
      },
      onPrevClick: (_element, _step, { driver }) => {
        void moveTour(driver, -1)
      },
      showProgress: true,
      allowScroll: false,
      stagePadding: 6,
      stageRadius: 8,
      progressText: m.tour_progress({
        current: '{{current}}',
        total: '{{total}}'
      }),
      onPopoverRender: renderPopover,
      onDestroyed: cleanupTourUi,
      nextBtnText: m.tour_next(),
      prevBtnText: m.tour_back(),
      doneBtnText: m.done()
    })

    tour.drive()
  }

  function handleStartTour() {
    void startTour()
  }

  afterNavigate(() => {
    if (tour?.isActive()) {
      tour.refresh()
    }
  })

  onMount(() => {
    void examplesState.getOrganizations()
    uiState.addEventListener(UiEvents.START_TOUR, handleStartTour)

    return () => {
      uiState.removeEventListener(UiEvents.START_TOUR, handleStartTour)
      cleanupTourUi()
      tour?.destroy()
    }
  })
</script>
