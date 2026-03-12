<script lang="ts">
  export type AnnotationObject = { url: string; name: string; reason?: string }

  let {
    annotationUrl = undefined,
    annotation = $bindable(),
    annotationObjects = []
  }: {
    annotationUrl?: string | undefined
    annotation?: unknown | undefined
    annotationObjects?: (AnnotationObject | undefined)[]
  } = $props()

  $effect(() => {
    if (!annotationUrl) {
      return
    }
    fetch(annotationUrl)
      .then((response) => response.json())
      .then((result) => {
        annotation = result
      })
  })

  const annotationObject = $derived(
    annotationObjects.find((a) => a?.url === annotationUrl)
  )

  const currentIndex = $derived.by(() => {
    const index = annotationObjects.findIndex((a) => a?.url === annotationUrl)
    return index >= 0 ? index : 0
  })

  function prev() {
    if (currentIndex > 0)
      annotationUrl = annotationObjects[currentIndex - 1]?.url
  }

  function next() {
    if (currentIndex < annotationObjects.length - 1)
      annotationUrl = annotationObjects[currentIndex + 1]?.url
  }
</script>

<div class="group">
  <h3 class="group-label">Annotation</h3>
  <div class="field">
    <label for="annotation-object-select">Load test map</label>
    <div class="range-row">
      <button
        id="random"
        onclick={() => {
          annotationUrl = ''
          annotationUrl = 'https://sammeltassen-rumsey_roulette.web.val.run'
        }}
      >
        Random
      </button>
      or
    </div>
    <div class="range-row">
      <select
        value={annotationUrl}
        name="annotation-select"
        onchange={(e) => {
          annotationUrl = e.currentTarget.value
        }}
      >
        {#each annotationObjects as a}
          <option value={a?.url}>{a?.name}</option>
        {/each}
      </select>
      <button onclick={prev} disabled={currentIndex <= 0}>←</button>
      <button
        onclick={next}
        disabled={currentIndex >= annotationObjects.length - 1}>→</button
      >
    </div>
  </div>
  {#if annotationObject?.reason}
    <div class="info">
      🧐 {annotationObject?.reason}
    </div>
  {/if}
  <div class="field">
    <label for="annotation-input">Annotation</label>
    <div class="range-row">
      <input
        type="url"
        id="annotation-input"
        placeholder="URL or JSON…"
        value={annotationUrl ?? ''}
        onclick={(e) => e.currentTarget.select()}
        oninput={(e) => {
          const value = e.currentTarget.value.trim()
          if (!value) {
            annotation = undefined
            annotationUrl = undefined
            return
          }
          try {
            annotation = JSON.parse(value)
            annotationUrl = undefined
          } catch {
            annotationUrl = value
          }
        }}
      />
      <button
        disabled={!annotation}
        onclick={() =>
          navigator.clipboard.writeText(JSON.stringify(annotation))}
      >
        Copy JSON
      </button>
    </div>
  </div>
</div>

<style>
  .group {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    border: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    border-radius: 4px;
    padding: 0.4rem 0.5rem;
    background-color: white;
    font-size: 0.7rem;
    font-family: ui-monospace, monospace;
  }

  .group-label {
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.4;
    margin: 0 0 0.2rem;
  }

  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 1rem;
  }

  .field label {
    opacity: 0.75;
    flex-shrink: 0;
  }

  .range-row {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1;
    justify-content: flex-end;
  }

  .info {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    min-height: 1rem;
    opacity: 0.75;
    flex-shrink: 0;
  }

  select {
    background: transparent;
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    border-radius: 3px;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    padding: 0.1rem 0.25rem;
  }

  input[type='url'] {
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    width: 25rem;
  }

  button {
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    border-radius: 3px;
    background: transparent;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    padding: 0.1rem 0.35rem;
    cursor: pointer;
    line-height: 1;
  }

  button:disabled {
    opacity: 0.25;
    cursor: default;
  }

  button:not(:disabled):hover {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }
</style>
