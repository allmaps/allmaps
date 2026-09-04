import type { EditorMapGuideProgress } from '$lib/shared/editor-map-guide-progress.js'
import type { View } from '$lib/types/shared.js'

export type MapGuideTone = 'excited' | 'info' | 'success' | 'warning' | 'error'

export type MapGuideActionIcon = 'arrow'

export type EditorMapGuideTarget = {
  view?: View
  imageId?: string
  mapId?: string
}

export type EditorMapGuideContext = {
  resourceKey?: string
  view?: View
  activeImageId?: string
  activeMapId?: string
  firstUse: boolean
  progress: EditorMapGuideProgress
  completeFirstUse?: () => void
  startTour?: () => void
  gotoView?: (view: View) => void
  gotoTarget?: (target: EditorMapGuideTarget) => void
  activateImage?: (imageId: string) => void
  activateMap?: (mapId: string) => void
  openMapsPopover?: () => void
  openExportPopover?: () => void
}

export type EditorMapGuideAction = {
  id: string
  label: string
  icon?: MapGuideActionIcon
  closeOnRun?: boolean
  run: (context: EditorMapGuideContext) => void
}

export type EditorMapGuideActions = [
  EditorMapGuideAction,
  ...EditorMapGuideAction[]
]

export type EditorMapGuideMessageDefinition = {
  id: string
  tone?: MapGuideTone
  target?: EditorMapGuideTarget
  getTarget?: (context: EditorMapGuideContext) => EditorMapGuideTarget
  isRelevant?: (context: EditorMapGuideContext) => boolean
  getMarkdown: (context: EditorMapGuideContext) => string
  getModalMarkdown?: (context: EditorMapGuideContext) => string
  getRevisionKey?: (context: EditorMapGuideContext) => string
  actions: EditorMapGuideActions
}

export type EditorMapGuidePromptDefinition = {
  id: string
  tone?: MapGuideTone
  target?: EditorMapGuideTarget
  getTarget?: (context: EditorMapGuideContext) => EditorMapGuideTarget
  isRelevant?: (context: EditorMapGuideContext) => boolean
  getMarkdown: (context: EditorMapGuideContext) => string
  getRevisionKey?: (context: EditorMapGuideContext) => string
  actions: EditorMapGuideActions
}

export type MapGuideDisplayAction = {
  key: string
  id: string
  label: string
  icon: MapGuideActionIcon
  closeOnRun?: boolean
}

export type MapGuideDisplayItem = {
  key: string
  id: string
  tone: MapGuideTone
  markdown: string
  target?: EditorMapGuideTarget
  revisionKey?: string
  actions: MapGuideDisplayAction[]
}

export type MapGuideDisplayMessage = MapGuideDisplayItem & {
  modalMarkdown: string
  seen: boolean
}
