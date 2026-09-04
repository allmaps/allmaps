import { getContext, setContext } from 'svelte'

import type {
  EditorMapGuideContext,
  EditorMapGuideMessageDefinition,
  EditorMapGuidePromptDefinition,
  MapGuideDisplayItem,
  MapGuideDisplayMessage,
  MapGuideTone
} from '$lib/types/map-guide.js'

const MAP_GUIDE_KEY = Symbol('map-guide')

type SeenMessages = Record<string, number>

type IndexedMessage = MapGuideDisplayMessage & {
  index: number
}

export class MapGuideState {
  #definitions = $state<EditorMapGuideMessageDefinition[]>([])
  #dynamicDefinitions = $state<EditorMapGuideMessageDefinition[]>([])
  #completionPromptDefinition = $state<EditorMapGuidePromptDefinition>()
  #context = $state<EditorMapGuideContext>()
  #resourceKey = $state<string>()
  #seenMessages = $state<SeenMessages>({})
  #selectedMessageKey = $state<string>()

  #definitionsById = $derived.by(() => {
    const definitionsById = new Map<string, EditorMapGuideMessageDefinition>()

    for (const definition of this.#definitions) {
      definitionsById.set(definition.id, definition)
    }

    for (const definition of this.#dynamicDefinitions) {
      definitionsById.set(definition.id, definition)
    }

    return definitionsById
  })

  #displayMessages = $derived.by(() => {
    const context = this.#context

    if (!context) {
      return []
    }

    return Array.from(this.#definitionsById.values())
      .flatMap((definition, index) => {
        if (!this.#isDefinitionRelevant(definition, context)) {
          return []
        }

        return [{ ...this.#toDisplayMessage(definition, context), index }]
      })
      .toSorted((messageA, messageB) =>
        this.#compareMessages(messageA, messageB)
      )
  })

  #completionPrompt = $derived.by(() => {
    const context = this.#context
    const definition = this.#completionPromptDefinition

    if (!context || !definition || this.#displayMessages.length > 0) {
      return
    }

    if (!this.#isDefinitionRelevant(definition, context)) {
      return
    }

    return this.#toDisplayItem(definition, context)
  })

  #currentMessage = $derived.by(() => {
    if (this.#selectedMessageKey) {
      const selectedMessage = this.#displayMessages.find(
        (message) => message.key === this.#selectedMessageKey
      )

      if (
        selectedMessage &&
        this.#selectedMessageMatchesContext(selectedMessage)
      ) {
        return selectedMessage
      }
    }

    return this.#displayMessages[0]
  })

  #currentItem = $derived(this.#currentMessage ?? this.#completionPrompt)

  #hasUnseenMessages = $derived(
    this.#displayMessages.some((message) =>
      this.#shouldNotifyForMessage(message)
    )
  )

  #isDefinitionRelevant(
    definition:
      EditorMapGuideMessageDefinition | EditorMapGuidePromptDefinition,
    context: EditorMapGuideContext
  ) {
    return definition.isRelevant ? definition.isRelevant(context) : true
  }

  #toDisplayItem(
    definition:
      EditorMapGuideMessageDefinition | EditorMapGuidePromptDefinition,
    context: EditorMapGuideContext
  ): MapGuideDisplayItem {
    const revisionKey = definition.getRevisionKey?.(context)
    const key = revisionKey ? `${definition.id}:${revisionKey}` : definition.id
    const target = definition.getTarget?.(context) ?? definition.target

    return {
      key,
      id: definition.id,
      tone: definition.tone ?? 'info',
      markdown: definition.getMarkdown(context),
      target,
      revisionKey,
      actions: definition.actions.map((action) => ({
        key: `${key}:${action.id}`,
        id: action.id,
        label: action.label,
        closeOnRun: action.closeOnRun,
        icon: action.icon ?? 'arrow'
      }))
    }
  }

  #toDisplayMessage(
    definition: EditorMapGuideMessageDefinition,
    context: EditorMapGuideContext
  ): MapGuideDisplayMessage {
    const displayItem = this.#toDisplayItem(definition, context)

    return {
      ...displayItem,
      modalMarkdown:
        definition.getModalMarkdown?.(context) ??
        definition.getMarkdown(context),
      seen: this.#isMessageSeen(displayItem.key)
    }
  }

  #compareMessages(messageA: IndexedMessage, messageB: IndexedMessage) {
    return (
      this.#getContextMatchScore(messageB) -
        this.#getContextMatchScore(messageA) ||
      this.#getToneScore(messageB.tone) - this.#getToneScore(messageA.tone) ||
      messageA.index - messageB.index
    )
  }

  #getToneScore(tone: MapGuideTone) {
    if (tone === 'error') {
      return 30
    }

    if (tone === 'warning') {
      return 20
    }

    if (tone === 'success') {
      return 10
    }

    return 0
  }

  #getContextMatchScore(message: MapGuideDisplayMessage) {
    const context = this.#context
    const target = message.target

    if (!context || !target) {
      return 0
    }

    let score = 0

    if (target.mapId && target.mapId === context.activeMapId) {
      score += 300
    }

    if (target.imageId && target.imageId === context.activeImageId) {
      score += 200
    }

    if (target.view && target.view === context.view) {
      score += 100
    }

    return score
  }

  #targetMatchesCurrentContext(message: MapGuideDisplayMessage) {
    const context = this.#context
    const target = message.target

    if (!context || !target?.view || target.view !== context.view) {
      return false
    }

    if (target.imageId && target.imageId !== context.activeImageId) {
      return false
    }

    if (target.mapId && target.mapId !== context.activeMapId) {
      return false
    }

    return true
  }

  #selectedMessageMatchesContext(message: MapGuideDisplayMessage) {
    return (
      message.tone === 'error' || this.#targetMatchesCurrentContext(message)
    )
  }

  #shouldNotifyForMessage(message: MapGuideDisplayMessage) {
    if (message.seen) {
      return false
    }

    if (message.tone === 'error') {
      return true
    }

    return this.#targetMatchesCurrentContext(message)
  }

  #resetResourceSession() {
    this.#seenMessages = {}
    this.#dynamicDefinitions = []
    this.#selectedMessageKey = undefined
  }

  #isMessageSeen(messageKey: string) {
    return Boolean(this.#seenMessages[messageKey])
  }

  get currentMessage() {
    return this.#currentMessage
  }

  get currentItem() {
    return this.#currentItem
  }

  get messages() {
    return this.#displayMessages
  }

  get hasUnseenMessages() {
    return this.#hasUnseenMessages
  }

  get hasNotification() {
    return this.#hasUnseenMessages
  }

  get visible() {
    return Boolean(
      this.#context?.resourceKey &&
      (this.#displayMessages.length > 0 || this.#completionPrompt)
    )
  }

  setContext(context: EditorMapGuideContext) {
    if (context.resourceKey !== this.#resourceKey) {
      this.#resourceKey = context.resourceKey
      this.#resetResourceSession()
    }

    this.#context = context
  }

  setDefinitions(definitions: EditorMapGuideMessageDefinition[]) {
    this.#definitions = definitions
  }

  setCompletionPrompt(prompt?: EditorMapGuidePromptDefinition) {
    this.#completionPromptDefinition = prompt
  }

  markSeen(messageKey: string) {
    if (this.#isMessageSeen(messageKey)) {
      return false
    }

    const message = this.#displayMessages.find(
      (message) => message.key === messageKey
    )

    if (!message) {
      return false
    }

    this.#seenMessages = {
      ...this.#seenMessages,
      [messageKey]: Date.now()
    }

    return true
  }

  markAllSeen(messageKeys: string[]) {
    const unseenMessageKeys = messageKeys.filter(
      (messageKey) =>
        !this.#isMessageSeen(messageKey) &&
        this.#displayMessages.some((message) => message.key === messageKey)
    )

    if (unseenMessageKeys.length === 0) {
      return false
    }

    this.#seenMessages = {
      ...this.#seenMessages,
      ...Object.fromEntries(
        unseenMessageKeys.map((messageKey) => [messageKey, Date.now()])
      )
    }

    return true
  }

  selectMessage(messageKey: string) {
    const message = this.#displayMessages.find(
      (message) => message.key === messageKey
    )

    if (!message) {
      return false
    }

    this.#selectedMessageKey = message.key
    this.markSeen(message.key)

    return true
  }

  runAction(messageKey: string, actionId: string) {
    const context = this.#context

    if (!context) {
      return false
    }

    const message = this.#displayMessages.find(
      (message) => message.key === messageKey
    )
    const item =
      message ??
      (this.#completionPrompt?.key === messageKey
        ? this.#completionPrompt
        : undefined)
    const definition = message
      ? this.#definitionsById.get(message.id)
      : this.#completionPromptDefinition

    if (!item || !definition) {
      return false
    }

    const action = definition.actions.find((action) => action.id === actionId)

    if (!action) {
      return false
    }

    if (message) {
      this.selectMessage(message.key)
    }

    action.run(context)

    return true
  }

  upsertMessage(message: EditorMapGuideMessageDefinition) {
    this.#dynamicDefinitions = [
      ...this.#dynamicDefinitions.filter(
        (existingMessage) => existingMessage.id !== message.id
      ),
      message
    ]
  }

  removeMessage(messageId: string) {
    this.#dynamicDefinitions = this.#dynamicDefinitions.filter(
      (message) => message.id !== messageId
    )
  }
}

export function setMapGuideState() {
  return setContext(MAP_GUIDE_KEY, new MapGuideState())
}

export function getMapGuideState() {
  const mapGuideState =
    getContext<ReturnType<typeof setMapGuideState>>(MAP_GUIDE_KEY)

  if (!mapGuideState) {
    throw new Error('MapGuideState is not set')
  }

  return mapGuideState
}
