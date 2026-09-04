import { m } from '$lib/paraglide/messages.js'

import type {
  EditorMapGuideContext,
  EditorMapGuideMessageDefinition,
  EditorMapGuidePromptDefinition
} from '$lib/types/map-guide.js'
import type {
  EditorMapGuideImageProgress,
  EditorMapGuideMapProgress
} from '$lib/shared/editor-map-guide-progress.js'

function resourceIsLoaded(context: EditorMapGuideContext) {
  return context.progress.resourceLoaded
}

function getImageLabel(image: EditorMapGuideImageProgress) {
  return image.imageLabel || m.image_number({ number: image.imageNumber })
}

function getMapLabel(map: EditorMapGuideMapProgress) {
  return m.map_number({ number: map.mapDisplayIndex })
}

export function createEditorMapGuideMessages(
  locale: string,
  context: EditorMapGuideContext
): EditorMapGuideMessageDefinition[] {
  void locale

  if (!resourceIsLoaded(context)) {
    return []
  }

  if (context.firstUse) {
    return [
      {
        id: 'editor.welcome',
        tone: 'excited',
        getTarget: (context) => ({
          view: context.view,
          imageId: context.activeImageId,
          mapId: context.activeMapId
        }),
        isRelevant: (context) => resourceIsLoaded(context) && context.firstUse,
        getMarkdown: () => m.mapguide_message_welcome(),
        actions: [
          {
            id: 'select-image',
            label: m.mapguide_action_select_image(),
            closeOnRun: true,
            run: (context) => {
              context.completeFirstUse?.()
              context.gotoView?.('images')
            }
          },
          {
            id: 'start-tour',
            label: m.mapguide_action_start_tour(),
            closeOnRun: true,
            run: (context) => {
              context.completeFirstUse?.()
              context.startTour?.()
            }
          }
        ]
      }
    ]
  }

  const imageMessages = context.progress.imagesWithoutMaps.map(
    (image): EditorMapGuideMessageDefinition => {
      const target = {
        view: 'mask' as const,
        imageId: image.imageId
      }
      const isCurrentImage = image.imageId === context.activeImageId
      const imageLabel = getImageLabel(image)

      return {
        id: `editor.image.no-map.${image.imageId}`,
        tone: 'info',
        target,
        getMarkdown: () =>
          isCurrentImage
            ? m.mapguide_message_current_image_without_map()
            : m.mapguide_message_image_without_map({
                imageLabel
              }),
        getModalMarkdown: () =>
          m.mapguide_message_image_without_map({ imageLabel }),
        getRevisionKey: () => image.imageId,
        actions: [
          {
            id: 'add-mask',
            label: m.mapguide_action_add_mask(),
            run: (context) => context.gotoTarget?.(target)
          }
        ]
      }
    }
  )

  const georeferencingMessages = context.progress.mapsNeedingGeoreferencing.map(
    (map): EditorMapGuideMessageDefinition => {
      const target = {
        view: 'georeference' as const,
        imageId: map.imageId,
        mapId: map.mapId
      }
      const isCurrentMap = map.mapId === context.activeMapId
      const imageLabel = getImageLabel(map)
      const mapLabel = getMapLabel(map)

      return {
        id: `editor.map.needs-georeferencing.${map.mapId}`,
        tone: 'info',
        target,
        getMarkdown: () =>
          isCurrentMap
            ? m.mapguide_message_current_map_needs_georeferencing({
                minimumGcpCount: map.minimumGcpCount
              })
            : m.mapguide_message_map_needs_georeferencing({
                imageLabel,
                mapLabel,
                minimumGcpCount: map.minimumGcpCount
              }),
        getModalMarkdown: () =>
          m.mapguide_message_map_needs_georeferencing({
            imageLabel,
            mapLabel,
            minimumGcpCount: map.minimumGcpCount
          }),
        getRevisionKey: () => `${map.mapId}:${map.minimumGcpCount}`,
        actions: [
          {
            id: 'add-gcps',
            label: m.mapguide_action_add_gcps(),
            run: (context) => context.gotoTarget?.(target)
          }
        ]
      }
    }
  )

  return [...imageMessages, ...georeferencingMessages]
}

export function createEditorMapGuideCompletionPrompt(
  locale: string,
  context: EditorMapGuideContext
): EditorMapGuidePromptDefinition | undefined {
  void locale

  if (
    !resourceIsLoaded(context) ||
    context.progress.exportReadyMapCount === 0
  ) {
    return
  }

  const target = {
    view: 'results' as const
  }

  return {
    id: 'editor.resource.review-results',
    tone: 'excited',
    target,
    getMarkdown: () =>
      context.progress.exportReadyMapCount === 1
        ? m.mapguide_message_one_map_ready_to_export()
        : m.mapguide_message_maps_ready_to_export({
            count: context.progress.exportReadyMapCount
          }),
    getRevisionKey: () => `${context.progress.exportReadyMapCount}`,
    actions: [
      {
        id: 'review-results',
        label: m.mapguide_action_review_results(),
        run: (context) => context.gotoTarget?.(target)
      }
    ]
  }
}
