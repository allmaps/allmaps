<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags -- Shiki escapes source text when rendering HTML. */
  import { onMount, untrack } from 'svelte'
  import { getCodeSections } from '../code/folds.js'
  import type { CodeBlockProps, RenderedCodeBlock } from '../code/types.js'

  let {
    code,
    language,
    title,
    wrap = true,
    folds = [],
    theme,
    initial
  }: CodeBlockProps = $props()
  let mounted = $state(false)
  let rendered = $state.raw<RenderedCodeBlock | undefined>(
    untrack(() =>
      initial?.code === code &&
      initial.language === language &&
      JSON.stringify(initial.folds ?? []) === JSON.stringify(folds)
        ? initial
        : undefined
    )
  )
  let feedback = $state('')
  let feedbackTimeout: ReturnType<typeof setTimeout> | undefined
  const terminal = $derived(language === 'bash')
  const sections = $derived(rendered?.sections ?? getCodeSections(code, folds))
  const styles = $derived(
    Object.entries(theme?.styles ?? {})
      .map(([name, value]) => `${name}:${value}`)
      .join(';')
  )

  onMount(() => {
    mounted = true
    return () => {
      mounted = false
      clearTimeout(feedbackTimeout)
    }
  })

  $effect(() => {
    if (!mounted) return
    const options = { code, language, theme, folds }
    let cancelled = false
    void import('../code/renderer.js')
      .then(({ renderCode }) => renderCode(options))
      .then((result) => {
        // Replace highlighted code atomically, without a plain-text flash.
        if (!cancelled) rendered = result
      })
      .catch((error) => {
        if (!cancelled) {
          rendered = undefined
          console.error('[Allmaps CodeBlock] Could not highlight code', error)
        }
      })
    return () => {
      cancelled = true
    }
  })

  async function copy() {
    clearTimeout(feedbackTimeout)
    const source = code
    let message = 'Copied!'
    try {
      await navigator.clipboard.writeText(source)
    } catch {
      message = 'Could not copy code'
    }
    if (!mounted) return
    feedback = message
    feedbackTimeout = setTimeout(() => {
      feedback = ''
    }, 2000)
  }
</script>

{#snippet sourceSection(section: { code: string; html?: string })}
  {#if section.html}
    {@html section.html}
  {:else}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -- Scrollable code must be keyboard focusable. -->
    <pre tabindex="0" aria-label={title ?? language}><code>{section.code}</code
      ></pre>
  {/if}
{/snippet}

<div
  class="code-block not-content"
  class:terminal
  class:wrapped={wrap}
  style={styles}
>
  {#if title || terminal}
    <div class="header">
      {#if terminal}
        <svg class="terminal-dots" viewBox="0 0 60 16" aria-hidden="true">
          <circle cx="8" cy="8" r="8" /><circle cx="30" cy="8" r="8" /><circle
            cx="52"
            cy="8"
            r="8"
          />
        </svg>
      {/if}
      {#if title}<span class="title">{title}</span>{/if}
    </div>
  {/if}
  <div class="source">
    <div class="source-content">
      {#if folds.length}
        {#each sections as section, index (`${rendered?.code ?? code}-${index}`)}
          {#if section.fold}
            <details class="code-fold" open={section.fold.collapsed === false}>
              <summary>
                <span class="fold-label">
                  <svg
                    class="fold-arrow"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="m6 4 4 4-4 4"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                  </svg>
                  <span
                    >// {section.fold.label}
                    <span class="line-count"
                      >· {section.endLine - section.startLine + 1}
                      {section.endLine === section.startLine
                        ? 'line'
                        : 'lines'}</span
                    ></span
                  >
                  <span class="fold-ellipsis" aria-hidden="true">…</span>
                </span>
              </summary>
              {@render sourceSection(section)}
            </details>
          {:else}
            {@render sourceSection(section)}
          {/if}
        {/each}
      {:else if rendered}
        {@html rendered.html}
      {:else}
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -- Scrollable code must be keyboard focusable. -->
        <pre tabindex="0" aria-label={title ?? language}><code>{code}</code
          ></pre>
      {/if}
    </div>
    <div class="copy-control">
      <span class="feedback" class:visible={feedback !== ''} role="status"
        >{feedback}</span
      >
      <button
        type="button"
        title="Copy to clipboard"
        aria-label="Copy to clipboard"
        onclick={copy}
        disabled={!mounted}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          aria-hidden="true"
        >
          <path d="M3 19a2 2 0 0 1-1-2V2a2 2 0 0 1 1-1h13a2 2 0 0 1 2 1" />
          <rect x="6" y="5" width="16" height="18" rx="1.5" ry="1.5" />
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .code-block {
    color-scheme: light dark;
    --background: var(--allmaps-code-background, light-dark(#f3f7f9, #182a2f));
    --foreground: var(--allmaps-code-foreground, light-dark(#24292e, #e1e4e8));
    --border-width: var(--allmaps-code-border-width, 1px);
    --border-color: var(
      --allmaps-code-border-color,
      light-dark(#bac4c8, #495c62)
    );
    margin: 0;
    overflow: hidden;
    border: var(--border-width) solid var(--border-color);
    border-radius: var(--allmaps-code-border-radius, 0.25rem);
    background: var(--background);
    color: var(--foreground);
    box-shadow: var(--allmaps-code-shadow, none);
    font-family: var(
      --allmaps-code-ui-font,
      var(--allmaps-ui-font-sans, system-ui, sans-serif)
    );
    font-size: var(--allmaps-code-ui-font-size, 0.875rem);
    line-height: 1.65;
    text-align: start;
  }
  :global(:root:is(.light, [data-theme='light'])) .code-block {
    color-scheme: light;
  }
  :global(:root:is(.dark, [data-theme='dark'])) .code-block {
    color-scheme: dark;
  }
  .terminal {
    --background: var(
      --allmaps-code-terminal-background,
      light-dark(#f6f8fa, #1f2428)
    );
  }
  .header {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 2.5rem;
    border-bottom: var(--border-width) solid var(--border-color);
    background: var(--allmaps-code-header-background, var(--background));
    color: var(--allmaps-code-header-foreground, var(--foreground));
  }
  .title {
    padding: 0.25rem 1rem;
  }
  .terminal .header {
    justify-content: center;
  }
  .terminal-dots {
    position: absolute;
    left: 1rem;
    width: 2.1rem;
    height: 0.56rem;
    fill: currentColor;
    opacity: 0.15;
  }
  .terminal .title {
    padding-inline: 4rem;
  }
  .source {
    position: relative;
  }
  .source-content {
    max-height: var(--allmaps-code-max-height, none);
    overflow: auto;
  }
  .code-fold summary {
    position: relative;
    display: block;
    padding: var(--allmaps-code-padding-block, 1rem) 4rem 0
      var(--allmaps-code-padding-inline, 1.35rem);
    list-style: none;
    color: color-mix(in srgb, var(--foreground) 65%, var(--background));
    cursor: pointer;
    font-weight: var(--allmaps-code-font-weight, 400);
    font-family: var(
      --allmaps-code-font,
      var(--allmaps-ui-font-mono, ui-monospace, monospace)
    );
    font-size: var(--allmaps-code-font-size, 0.85rem);
    line-height: var(--allmaps-code-line-height, 1.65);
  }
  .code-fold summary::-webkit-details-marker {
    display: none;
  }
  .fold-label {
    position: relative;
    display: block;
  }
  .fold-arrow {
    position: absolute;
    left: -1.2em;
    top: calc(var(--allmaps-code-line-height, 1.65) * 0.5em);
    transform: translateY(-50%);
    width: 1em;
    height: 1em;
  }
  .code-fold[open] .fold-arrow {
    transform: translateY(-50%) rotate(90deg);
  }
  .fold-ellipsis {
    margin-inline-start: 0.35em;
  }
  .code-fold[open] .fold-ellipsis {
    display: none;
  }
  .code-fold summary:focus-visible {
    outline: 2px solid var(--allmaps-code-focus, #ff56ba);
    outline-offset: -2px;
  }
  .line-count {
    font-weight: 400;
    white-space: nowrap;
  }
  .source :global(pre) {
    margin: 0;
    padding: var(--allmaps-code-padding-block, 1rem)
      var(--allmaps-code-padding-inline, 1.35rem);
    overflow: auto;
    background: var(--background);
    color: light-dark(
      var(--shiki-light, var(--foreground)),
      var(--shiki-dark, var(--foreground))
    );
    font-family: var(
      --allmaps-code-font,
      var(--allmaps-ui-font-mono, ui-monospace, monospace)
    );
    font-size: var(--allmaps-code-font-size, 0.85rem);
    font-weight: var(--allmaps-code-font-weight, 400);
    line-height: var(--allmaps-code-line-height, 1.65);
    tab-size: 2;
    direction: ltr;
  }
  .source :global(code) {
    font: inherit;
    background: none;
    border: 0;
    padding: 0;
  }
  .wrapped .source :global(pre) {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .source :global(.shiki span) {
    color: light-dark(var(--shiki-light, inherit), var(--shiki-dark, inherit));
    background-color: light-dark(
      var(--shiki-light-bg, transparent),
      var(--shiki-dark-bg, transparent)
    );
    font-style: var(--shiki-light-font-style, inherit);
    font-weight: var(--shiki-light-font-weight, inherit);
    text-decoration: var(--shiki-light-text-decoration, inherit);
  }
  :global(:root:is(.dark, [data-theme='dark'])) .source :global(.shiki span) {
    font-style: var(--shiki-dark-font-style, inherit);
    font-weight: var(--shiki-dark-font-weight, inherit);
    text-decoration: var(--shiki-dark-text-decoration, inherit);
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not(.light):not([data-theme='light']))
      .source
      :global(.shiki span) {
      font-style: var(--shiki-dark-font-style, inherit);
      font-weight: var(--shiki-dark-font-weight, inherit);
      text-decoration: var(--shiki-dark-text-decoration, inherit);
    }
  }
  .copy-control {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  button {
    display: grid;
    place-items: center;
    position: relative;
    width: 2.5rem;
    height: 2.5rem;
    margin: 0;
    padding: 0.475rem;
    border: var(--border-width) solid
      color-mix(
        in srgb,
        var(--allmaps-code-button-border, var(--foreground)) 40%,
        transparent
      );
    border-radius: 0.2rem;
    color: var(--allmaps-code-button-foreground, var(--foreground));
    background: var(--background);
    cursor: pointer;
    opacity: 0.75;
    transition:
      opacity 0.2s,
      background 0.2s;
  }
  button svg {
    width: 100%;
    height: 100%;
  }
  button:hover,
  button:focus-visible {
    opacity: 1;
    background: color-mix(
      in srgb,
      var(--allmaps-code-button-background, var(--foreground)) 20%,
      var(--background)
    );
  }
  button:disabled {
    visibility: hidden;
  }
  button:focus-visible,
  .source :global(pre:focus-visible) {
    outline: 3px solid var(--allmaps-code-focus, #ff56ba);
    outline-offset: -3px;
  }
  .feedback {
    opacity: 0;
    padding: 0.125rem 0.75rem;
    border-radius: 0.2rem;
    color: var(--allmaps-code-feedback-foreground, white);
    background: var(--allmaps-code-feedback-background, #208638);
    pointer-events: none;
  }
  .feedback.visible {
    opacity: 1;
  }
  @media (hover: hover) {
    button {
      width: 2rem;
      height: 2rem;
      opacity: 0;
    }
    .code-block:hover button,
    .code-block:focus-within button {
      opacity: 0.75;
    }
    .code-block button:hover,
    .code-block button:focus-visible {
      opacity: 1;
    }
  }
</style>
