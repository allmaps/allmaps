<script lang="ts">
  import { getUrlState } from '$lib/shared/params.js'

  const urlState = getUrlState()

  type Mode = 'url' | 'json'

  type Props = {
    jsonModeHeightClass?: string // Tailwind CSS height class
    submitButton?: boolean
    roundedFull?: boolean
    autoFocus?: boolean
  }

  let {
    jsonModeHeightClass = 'h-50',
    submitButton = true,
    roundedFull = true,
    autoFocus = false
  }: Props = $props()

  const placeholder = 'Enter a URL, or paste or drop a file'

  let form = $state<HTMLFormElement>()
  let inputRef = $state<HTMLInputElement | HTMLTextAreaElement>()

  let inputValue = $state(
    urlState.params.url ||
      (urlState.params.data
        ? JSON.stringify(urlState.params.data, null, 2)
        : '')
  )
  let error = $state('')
  let isDraggingOver = $state(false)
  let mode = $state<Mode>('url')

  $effect(() => {
    if (autoFocus && inputRef) {
      inputRef.select()
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

  function handleSubmit(event: Event) {
    event.preventDefault()

    if (!form || !form.checkValidity()) {
      error = isMultiLine(inputValue)
        ? 'Please enter valid JSON'
        : 'Please enter a valid URL'
      return
    }

    error = ''

    if (isMultiLine(inputValue)) {
      // Multi-line: treat as JSON
      urlState.params.data = JSON.parse(inputValue)
    } else {
      // Single-line: treat as URL

      urlState.params.url = inputValue
    }
  }

  function handleInput() {
    if (!inputRef || !inputValue) {
      if (inputRef) {
        inputRef.setCustomValidity('')
      }
      error = ''
      resizeInput()
      return
    }

    if (isMultiLine(inputValue)) {
      // Multi-line mode: validate as JSON
      try {
        JSON.parse(inputValue)
        inputRef.setCustomValidity('')
        error = ''
      } catch {
        inputRef.setCustomValidity('Invalid JSON')
        error = 'Invalid JSON format'
      }
    } else {
      // Single-line mode: validate as URL
      try {
        new URL(inputValue)
        inputRef.setCustomValidity('')
        error = ''
      } catch {
        inputRef.setCustomValidity('Invalid URL')
        error = 'Invalid URL format'
      }
    }

    resizeInput()
  }

  function resizeInput() {
    if (!inputRef) {
      return
    }

    if (isMultiLine(inputValue)) {
      mode = 'json'
    } else {
      mode = 'url'
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (!isMultiLine(inputValue)) {
        // Single-line mode: Enter submits the form
        event.preventDefault()
        form?.requestSubmit()
      }
      // Multi-line mode: allow default (insert newline)
    }
  }

  function handlePaste(event: ClipboardEvent) {
    const pastedText = event.clipboardData?.getData('text')
    if (!pastedText) return

    // Check if pasted content is JSON or multi-line
    const isJson = (() => {
      try {
        JSON.parse(pastedText)
        return true
      } catch {
        return false
      }
    })()

    if (isJson || isMultiLine(pastedText)) {
      mode = 'json'
      // If valid JSON, format it
      if (isJson) {
        event.preventDefault()
        try {
          const parsed = JSON.parse(pastedText)
          inputValue = JSON.stringify(parsed, null, 2)
        } catch {
          // This shouldn't happen since we already validated, but just in case
          inputValue = pastedText
        }
        setTimeout(() => handleInput(), 0)
      }
    }
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

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      // Format valid JSON with indentation
      inputValue = JSON.stringify(parsed, null, 2)
      mode = 'json'
      error = ''
    } catch {
      // Allow invalid content, but set error
      inputValue = await file.text()
      mode = 'json'
      error = 'Invalid JSON file'
    }

    // Delay resize to ensure DOM has updated
    setTimeout(() => handleInput(), 0)
  }

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
  class="flex flex-row items-start gap-2 w-full"
>
  {#if mode === 'json'}
    <textarea
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
      class={[
        'text-sm col-span-2 font-mono w-full px-3 py-2 border transition-colors resize-none overflow-hidden',
        'overflow-y-auto focus-visible:ring-1 focus-visible:outline-pink-500 focus-visible:outline-1',
        roundedFull ? 'rounded-2xl' : 'rounded-md',
        jsonModeHeightClass,
        isDraggingOver
          ? 'border-pink-400 bg-pink-50 ring-2 ring-pink-300 bg-pink/20'
          : 'border-gray-200 inset-shadow-xs focus-within:ring-1 focus-within:ring-pink-500 focus-within:border-pink-500'
      ]}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      required
    ></textarea>
  {:else}
    <input
      type="text"
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
      class={[
        'text-sm col-span-2 font-mono w-full px-3 py-2 border transition-colors',
        'focus-visible:ring-1 focus-visible:outline-pink-500 focus-visible:outline-1',
        roundedFull ? 'rounded-full' : 'rounded-md',
        isDraggingOver
          ? 'border-pink-400 bg-pink-50 ring-2 ring-pink-300 bg-pink/20'
          : 'border-gray-200 inset-shadow-xs focus-within:ring-1 focus-within:ring-pink-500 focus-within:border-pink-500'
      ]}
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      required
    />
  {/if}
  {#if submitButton}
    <div class="flex flex-row gap-2 items-center">
      <button
        type="submit"
        disabled={error !== '' || inputValue.length === 0}
        class="text-white bg-pink-500 hover:bg-pink-400 transition-colors disabled:bg-gray-500 focus:ring focus:ring-pink-200 font-medium
          rounded-full text-sm px-5 py-2.5 focus:outline-none not-disabled:cursor-pointer"
        >Go!</button
      >
      <!-- {#if error}
        <p class="text-red-500">{error}</p>
      {/if} -->
    </div>
  {/if}
</form>
