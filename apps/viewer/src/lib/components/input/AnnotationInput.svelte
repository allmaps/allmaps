<script lang="ts">
  import { tick } from 'svelte'
  import { fade } from 'svelte/transition'
  import { debounce } from 'lodash-es'

  import { Check as CheckIcon, Copy as CopyIcon } from 'phosphor-svelte'

  import { getUrlState } from '$lib/shared/params.js'

  const urlState = getUrlState()

  type Mode = 'url' | 'json'
  type Button = 'submit' | 'copy' | 'none'
  type JsonParseResult =
    | {
        ok: true
        text: string
        value: unknown
      }
    | {
        ok: false
        text: string
      }

  type Props = {
    jsonModeHeightClass?: string // Tailwind CSS height class
    autoFocus?: boolean
    button?: Button
    initialValue?: string
    currentSourceValue?: string
  }

  let {
    jsonModeHeightClass = 'h-50',
    autoFocus = false,
    button = 'submit',
    initialValue,
    currentSourceValue
  }: Props = $props()

  const inputLabel = 'URL of a Georeference Annotation or IIIF Manifest'
  const desktopPlaceholder = inputLabel
  const smallScreenPlaceholder = 'Georeference Annotation or IIIF URL'
  const smallScreenMediaQuery = '(max-width: 639px)'
  const JSON_VALIDATION_DEBOUNCE_MS = 300
  const COPY_FEEDBACK_DURATION_MS = 1500
  const inputId = $props.id()
  const errorId = `${inputId}-error`

  let jsonParseResult: JsonParseResult | undefined

  let form = $state<HTMLFormElement>()
  let inputRef = $state<HTMLInputElement | HTMLTextAreaElement>()
  let submitButtonRef = $state<HTMLButtonElement>()

  function getInitialInputValue() {
    if (initialValue !== undefined) {
      return initialValue
    }

    const initialUrlParam = urlState.params.url
    if (initialUrlParam !== undefined) {
      return initialUrlParam
    }

    const initialDataParam = urlState.params.data
    return initialDataParam ? JSON.stringify(initialDataParam, null, 2) : ''
  }

  const initialInputValue = getInitialInputValue()

  let inputValue = $state(initialInputValue)
  let error = $state('')
  let isDraggingOver = $state(false)
  let hasCopiedInputValue = $state(false)
  let copyFeedbackTimeout: ReturnType<typeof setTimeout> | undefined
  let mode = $state<Mode>('url')
  let hasSelectedInitialInput = $state(false)
  let isSmallScreen = $state(false)
  let placeholder = $derived(
    isSmallScreen ? smallScreenPlaceholder : desktopPlaceholder
  )
  let sourceValueForCopy = $derived(currentSourceValue ?? initialInputValue)
  let inputMatchesCurrentSource = $derived(inputValue === sourceValueForCopy)
  let visibleButton = $derived.by(() => {
    if (button === 'none') {
      return 'none'
    }

    if (button === 'copy' && !inputMatchesCurrentSource) {
      return 'submit'
    }

    return button
  })

  $effect(() => {
    const mediaQuery = window.matchMedia(smallScreenMediaQuery)
    const updateSmallScreen = () => {
      isSmallScreen = mediaQuery.matches
    }

    updateSmallScreen()
    mediaQuery.addEventListener('change', updateSmallScreen)

    return () => {
      mediaQuery.removeEventListener('change', updateSmallScreen)
    }
  })

  $effect(() => {
    if (autoFocus && inputRef && !hasSelectedInitialInput) {
      inputRef.select()
      hasSelectedInitialInput = true
    }
  })

  // Initialize mode based on initial content
  $effect(() => {
    if (inputValue && isMultiLine(inputValue)) {
      mode = 'json'
    }
  })

  function isMultiLine(text: string): boolean {
    return text.includes('\n')
  }

  function parseJson(text: string): JsonParseResult {
    if (jsonParseResult?.text === text) {
      return jsonParseResult
    }

    try {
      jsonParseResult = {
        ok: true,
        text,
        value: JSON.parse(text)
      }
    } catch {
      jsonParseResult = {
        ok: false,
        text
      }
    }

    return jsonParseResult
  }

  function setValidInput() {
    error = ''
  }

  function setInvalidInput(message: string) {
    error = message
  }

  function validateUrl() {
    try {
      new URL(inputValue)
      setValidInput()
      return true
    } catch {
      setInvalidInput('Invalid URL')
      return false
    }
  }

  function validateJson(text = inputValue) {
    if (text !== inputValue || !isMultiLine(inputValue)) {
      return
    }

    const parsedJson = parseJson(text)
    if (parsedJson.ok) {
      setValidInput()
      return
    }

    setInvalidInput('Invalid JSON format')
  }

  const debouncedValidateJson = debounce(
    validateJson,
    JSON_VALIDATION_DEBOUNCE_MS
  )

  function handleSubmit(event: Event) {
    event.preventDefault()
    debouncedValidateJson.cancel()

    if (!inputValue) {
      setInvalidInput(
        isMultiLine(inputValue)
          ? 'Please enter valid JSON'
          : 'Please enter a valid URL'
      )
      return
    }

    if (isMultiLine(inputValue)) {
      // Multi-line: treat as JSON
      validateJson()

      const parsedJson = parseJson(inputValue)
      if (!parsedJson.ok) {
        return
      }

      setValidInput()
      urlState.updateParams({
        data: parsedJson.value,
        url: undefined,
        mapId: undefined
      })
    } else {
      // Single-line: treat as URL
      if (!validateUrl()) {
        return
      }

      urlState.updateParams({
        url: inputValue,
        data: undefined,
        mapId: undefined
      })
    }
  }

  function handleInput() {
    if (!inputRef || !inputValue) {
      error = ''
      resizeInput()
      return
    }

    if (isMultiLine(inputValue)) {
      debouncedValidateJson(inputValue)
    } else {
      debouncedValidateJson.cancel()
      // Single-line mode: validate as URL
      validateUrl()
    }

    resizeInput()
  }

  function resizeInput() {
    if (isMultiLine(inputValue)) {
      mode = 'json'
    } else {
      mode = 'url'
    }
  }

  async function focusSubmitButton() {
    if (visibleButton !== 'submit') {
      return
    }

    await tick()
    submitButtonRef?.focus()
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && (event.shiftKey || !isMultiLine(inputValue))) {
      event.preventDefault()
      form?.requestSubmit()
    }
  }

  function getClipboardText(event: ClipboardEvent) {
    return (
      event.clipboardData?.getData('text/plain') ||
      event.clipboardData?.getData('text') ||
      event.clipboardData?.getData('text/uri-list')
    )
  }

  function getPastedInputValue(pastedText: string) {
    const trimmedText = pastedText.trim()

    if (trimmedText) {
      try {
        new URL(trimmedText)
        return trimmedText
      } catch {
        // Keep non-URL text exactly as pasted.
      }
    }

    return pastedText
  }

  function insertPastedText(pastedText: string) {
    if (!inputRef) {
      inputValue = pastedText
      return
    }

    const selectionStart = inputRef.selectionStart ?? inputValue.length
    const selectionEnd = inputRef.selectionEnd ?? selectionStart

    inputValue =
      inputValue.slice(0, selectionStart) +
      pastedText +
      inputValue.slice(selectionEnd)
  }

  function handlePaste(event: ClipboardEvent) {
    const pastedText = getClipboardText(event)
    if (!pastedText) {
      return
    }

    event.preventDefault()

    // Check if pasted content is JSON or multi-line
    const pastedJson = parseJson(pastedText)

    if (pastedJson.ok || isMultiLine(pastedText)) {
      mode = 'json'
      // If valid JSON, format it
      if (pastedJson.ok) {
        inputValue = JSON.stringify(pastedJson.value, null, 2)
        jsonParseResult = {
          ok: true,
          text: inputValue,
          value: pastedJson.value
        }
        setValidInput()
      } else {
        insertPastedText(getPastedInputValue(pastedText))
        debouncedValidateJson(inputValue)
      }
    } else {
      insertPastedText(getPastedInputValue(pastedText))
      if (isMultiLine(inputValue)) {
        debouncedValidateJson(inputValue)
      } else {
        debouncedValidateJson.cancel()
        validateUrl()
      }
    }

    resizeInput()
    void focusSubmitButton()
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    isDraggingOver = true
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault()
    isDraggingOver = false
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault()
    isDraggingOver = false

    const files = event.dataTransfer?.files
    if (!files || files.length === 0) {
      return
    }

    const file = files[0]
    const text = await file.text()
    const parsedJson = parseJson(text)

    if (parsedJson.ok) {
      // Format valid JSON with indentation
      inputValue = JSON.stringify(parsedJson.value, null, 2)
      jsonParseResult = {
        ok: true,
        text: inputValue,
        value: parsedJson.value
      }
      mode = 'json'
      setValidInput()
    } else {
      // Allow invalid content, but set error
      inputValue = text
      mode = 'json'
      setInvalidInput('Invalid JSON file')
    }
  }

  async function handleCopyInputValue() {
    try {
      await navigator.clipboard.writeText(inputValue)
    } catch (error) {
      console.error('Failed to copy input value:', error)
      return
    }

    hasCopiedInputValue = true

    if (copyFeedbackTimeout) {
      clearTimeout(copyFeedbackTimeout)
    }

    copyFeedbackTimeout = setTimeout(() => {
      hasCopiedInputValue = false
      copyFeedbackTimeout = undefined
    }, COPY_FEEDBACK_DURATION_MS)
  }

  $effect(() => {
    return () => {
      debouncedValidateJson.cancel()
      if (copyFeedbackTimeout) {
        clearTimeout(copyFeedbackTimeout)
      }
    }
  })

  // Watch for paste events that might change line count
  $effect(() => {
    if (inputValue !== undefined) {
      resizeInput()
    }
  })
</script>

<form
  bind:this={form}
  onsubmit={handleSubmit}
  novalidate
  class={[
    'grid w-full gap-1 border p-1 transition-colors inset-shadow-xs overflow-hidden',
    'focus-within:outline-1',
    mode === 'url' && 'grid-cols-[1fr_auto] grid-rows-1 items-center',
    mode === 'json' && 'grid-cols-1 grid-rows-2 items-end',
    mode === 'url' && 'rounded-full',
    mode === 'json' && 'rounded-2xl',
    error
      ? 'border-red-500 focus-within:outline-red-500'
      : 'border-gray-200 focus-within:border-pink-500 focus-within:outline-pink-500',
    isDraggingOver && 'border-pink-500 bg-pink/10 *:placeholder:text-pink'
  ]}
>
  {#if mode === 'url'}
    <input
      id={inputId}
      type="text"
      name="input"
      bind:this={inputRef}
      bind:value={inputValue}
      onsubmit={handleSubmit}
      oninput={handleInput}
      onkeydown={handleKeyDown}
      onpaste={handlePaste}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      {placeholder}
      aria-label={inputLabel}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? errorId : undefined}
      aria-required="true"
      class="text-sm font-mono w-full px-2 pr-1 transition-colors outline-0"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    />
  {:else}
    <textarea
      id={inputId}
      name="input"
      bind:this={inputRef}
      bind:value={inputValue}
      oninput={handleInput}
      onkeydown={handleKeyDown}
      onpaste={handlePaste}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      {placeholder}
      aria-label={inputLabel}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? errorId : undefined}
      aria-required="true"
      class={[
        'col-span-full row-span-full text-sm font-mono outline-0 w-full p-1 resize-none overflow-y-auto',
        jsonModeHeightClass
      ]}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
    ></textarea>
  {/if}

  <div
    class={[
      'flex flex-row gap-2 items-center',
      mode === 'json' && 'col-1 row-2 place-self-end'
    ]}
  >
    {#if error}
      <span
        id={errorId}
        role="alert"
        transition:fade={{ duration: 200 }}
        class="px-2 py-0.5 text-xs text-red-500 bg-red/10 shrink-0 rounded-full"
        >{error}</span
      >
    {/if}

    {#if visibleButton === 'submit'}
      <div class="flex flex-row gap-2 items-center">
        <button
          bind:this={submitButtonRef}
          type="submit"
          disabled={error !== '' || inputValue.length === 0}
          class={[
            'text-white bg-pink-500 hover:bg-pink-400 transition-colors disabled:bg-gray-500 font-medium',
            'text-sm px-3 py-1  focus-visible:outline-pink-100 not-disabled:cursor-pointer rounded-full'
          ]}>Open</button
        >
      </div>
    {:else if visibleButton === 'copy'}
      <button
        type="button"
        onclick={handleCopyInputValue}
        aria-label={hasCopiedInputValue ? 'Copied' : 'Copy'}
        title={hasCopiedInputValue ? 'Copied' : 'Copy'}
        class={[
          'disabled:text-gray transition-colors rounded-full text-sm p-0.5 not-disabled:cursor-pointer',
          hasCopiedInputValue ? 'bg-green-100' : 'hover:bg-gray-100'
        ]}
      >
        {#if hasCopiedInputValue}
          <CheckIcon class="size-5 text-green-600" weight="bold" />
        {:else}
          <CopyIcon class="size-5" />
        {/if}
      </button>
    {/if}
  </div>
</form>
