<script lang="ts">
  import { afterNavigate, goto } from '$app/navigation'
  import { page } from '$app/state'
  import { mount, onMount, tick, unmount } from 'svelte'

  import EditorTourPopover from '$lib/components/EditorTourPopover.svelte'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import { getView, getViewUrl } from '$lib/shared/router.js'
  import { UiEvents } from '$lib/shared/ui-events.js'
  import { isCallbackValid } from '$lib/shared/organizations.js'
  import { m } from '$lib/paraglide/messages.js'

  import type {
    Driver,
    DriverHook,
    DriveStep,
    PopoverDOM,
    State
  } from 'driver.js'
  import type { MaybeView } from '$lib/types/shared.js'

  const uiState = getUiState()
  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const mapsMergedState = getMapsMergedState()
  const urlState = getUrlState()

  let tour: Driver | undefined
  let movingToView = false
  let mountedPopover: Record<string, unknown> | undefined
  let tourStartView: MaybeView

  const selector = {
    source: '[data-tour="editor-source"]',
    infoPopover: '[data-tour="editor-info-popover"]',
    workflow: '[data-tour="editor-workflow"]',
    imagesView: '[data-tour="editor-images-view"]',
    maskView: '[data-tour="editor-mask-view"]',
    georeferenceView: '[data-tour="editor-georeference-view"]',
    mapSettingsPopover: '[data-tour="editor-map-settings-popover"]',
    maps: '[data-tour="editor-maps"]',
    mapsPopover: '[data-tour="editor-maps-popover"]',
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

  type TourDirection = 'next' | 'previous'
  type TourPopover = 'info' | 'maps' | 'mapSettings' | 'export'

  type MoveTourOptions = {
    direction: TourDirection
    targetSelector: string
    view?: MaybeView
    popover?: TourPopover
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
      (!callback || !isCallbackValid(callback))
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

  async function moveTour(driver: Driver, options: MoveTourOptions) {
    if (movingToView) {
      return
    }

    movingToView = true

    try {
      uiState.closeModalsAndPopovers()

      if ('view' in options) {
        await goto(getTourUrl(options.view), {
          keepFocus: true,
          noScroll: true
        })
      }

      if (options.popover) {
        uiState.popoverOpen[options.popover] = true
      }

      await waitForElement(options.targetSelector)

      if (options.direction === 'next') {
        driver.moveNext()
      } else {
        driver.movePrevious()
      }

      await tick()
      driver.refresh()
    } finally {
      movingToView = false
    }
  }

  function moveToViewOnNext(view: MaybeView, nextSelector: string): DriverHook {
    return (_element, _step, { driver }) => {
      void moveTour(driver, {
        direction: 'next',
        targetSelector: nextSelector,
        view
      })
    }
  }

  function moveToViewOnPrevious(
    view: MaybeView,
    previousSelector: string
  ): DriverHook {
    return (_element, _step, { driver }) => {
      void moveTour(driver, {
        direction: 'previous',
        targetSelector: previousSelector,
        view
      })
    }
  }

  function moveToPopoverOnNext(
    popover: TourPopover,
    nextSelector: string
  ): DriverHook {
    return (_element, _step, { driver }) => {
      void moveTour(driver, {
        direction: 'next',
        targetSelector: nextSelector,
        popover
      })
    }
  }

  function moveToPopoverOnPrevious(
    popover: TourPopover,
    previousSelector: string,
    view?: MaybeView
  ): DriverHook {
    return (_element, _step, { driver }) => {
      const options: MoveTourOptions = {
        direction: 'previous',
        targetSelector: previousSelector,
        popover
      }

      if (view) {
        options.view = view
      }

      void moveTour(driver, options)
    }
  }

  function closePopoversOnNext(nextSelector: string): DriverHook {
    return (_element, _step, { driver }) => {
      void moveTour(driver, {
        direction: 'next',
        targetSelector: nextSelector
      })
    }
  }

  function closePopoversOnPrevious(previousSelector: string): DriverHook {
    return (_element, _step, { driver }) => {
      void moveTour(driver, {
        direction: 'previous',
        targetSelector: previousSelector
      })
    }
  }

  function getStep(
    element: string,
    data: TourPopoverData,
    popover: DriveStep['popover'] = {}
  ): DriveStep {
    return {
      element,
      data,
      popover: {
        title: data.title,
        description: data.description,
        ...popover
      }
    }
  }

  function setOnNextClick(step: DriveStep, onNextClick: DriverHook) {
    step.popover = {
      ...step.popover,
      onNextClick
    }
  }

  function getSteps(): DriveStep[] {
    const steps = [
      getStep(
        selector.source,
        {
          title: m.tour_source_title(),
          description: m.tour_source_description()
        },
        {
          onNextClick: moveToPopoverOnNext('info', selector.infoPopover)
        }
      ),
      getStep(
        selector.infoPopover,
        {
          title: m.tour_info_title(),
          description: m.tour_info_description()
        },
        {
          onPrevClick: closePopoversOnPrevious(selector.source),
          onNextClick: closePopoversOnNext(selector.workflow)
        }
      ),
      getStep(
        selector.workflow,
        {
          title: m.tour_workflow_title(),
          description: m.tour_workflow_description()
        },
        {
          onPrevClick: moveToPopoverOnPrevious('info', selector.infoPopover),
          onNextClick: moveToViewOnNext('images', selector.imagesView)
        }
      ),
      getStep(
        selector.imagesView,
        {
          title: m.tour_images_title(),
          description: m.tour_images_description()
        },
        {
          onPrevClick: moveToViewOnPrevious(
            tourStartView,
            selector.workflow
          ),
          onNextClick: moveToViewOnNext('mask', selector.maskView)
        }
      ),
      getStep(
        selector.maskView,
        {
          title: m.tour_mask_title(),
          description: m.tour_mask_description()
        },
        {
          onPrevClick: moveToViewOnPrevious('images', selector.imagesView),
          onNextClick: moveToViewOnNext(
            'georeference',
            selector.georeferenceView
          )
        }
      ),
      getStep(
        selector.georeferenceView,
        {
          title: m.tour_georeference_title(),
          description: m.tour_georeference_description()
        },
        {
          onPrevClick: moveToViewOnPrevious('mask', selector.maskView),
          onNextClick: moveToPopoverOnNext(
            'mapSettings',
            selector.mapSettingsPopover
          )
        }
      ),
      getStep(
        selector.mapSettingsPopover,
        {
          title: m.tour_map_settings_title(),
          description: m.tour_map_settings_description()
        },
        {
          onPrevClick: closePopoversOnPrevious(selector.georeferenceView),
          onNextClick: moveToPopoverOnNext('maps', selector.mapsPopover)
        }
      ),
      getStep(
        selector.mapsPopover,
        getMapsPopoverData(),
        {
          onPrevClick: moveToPopoverOnPrevious(
            'mapSettings',
            selector.mapSettingsPopover
          )
        }
      )
    ]

    setOnNextClick(
      steps[steps.length - 1],
      moveToViewOnNext('results', selector.resultsView)
    )

    const resultsStep = getStep(
      selector.resultsView,
      getResultsData(),
      {
        onPrevClick: moveToPopoverOnPrevious(
          'maps',
          selector.mapsPopover,
          'georeference'
        )
      }
    )

    if (canOpenExportPopover()) {
      setOnNextClick(
        resultsStep,
        moveToPopoverOnNext('export', selector.exportPopover)
      )
    }

    steps.push(resultsStep)

    if (canOpenExportPopover()) {
      steps.push(
        getStep(
          selector.exportPopover,
          getExportData(),
          {
            side: 'left',
            onPrevClick: moveToViewOnPrevious('results', selector.resultsView)
          }
        )
      )
    } else {
      steps.push(
        getStep(
          selector.export,
          getExportData(),
          {
            side: 'left'
          }
        )
      )
    }

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

    tour = driver({
      steps: getSteps(),
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
    uiState.addEventListener(UiEvents.START_TOUR, handleStartTour)

    return () => {
      uiState.removeEventListener(UiEvents.START_TOUR, handleStartTour)
      cleanupTourUi()
      tour?.destroy()
    }
  })
</script>
