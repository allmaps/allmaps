<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags -- Shiki escapes source text when rendering HTML. */
  import { untrack } from 'svelte'
  import DownloadButton from './DownloadButton.svelte'
  import CopyButton from './CopyButton.svelte'
  import { generateId } from '@allmaps/id/sync'
  import { getCodeSections } from '../code/folds.js'
  import type { CodeBlockProps, RenderedCodeBlock } from '../code/types.js'

  let {
    code,
    language,
    title,
    titleContent,
    headerActions,
    downloadFilename,
    ondownload,
    wrap = true,
    colorMode = 'auto',
    mark = [],
    folds = [],
    theme,
    initial
  }: CodeBlockProps = $props()
  const serializedThemes = $derived(JSON.stringify(theme?.themes))
  const themeKey = $derived(serializedThemes && generateId(serializedThemes))

  function matches(
    result: RenderedCodeBlock | undefined,
    key: string | undefined
  ) {
    return (
      result?.code === code &&
      result.language === language &&
      // Earlier versions used the serialized themes themselves as the key.
      (result.themeKey === key || result.themeKey === serializedThemes) &&
      JSON.stringify(result.mark ?? []) === JSON.stringify(mark) &&
      JSON.stringify(result.folds ?? []) === JSON.stringify(folds)
    )
  }

  // Keep the displayed result until the next highlighted result is ready.
  let rendered = $state.raw<RenderedCodeBlock | undefined>(
    untrack(() => (matches(initial, themeKey) ? initial : undefined))
  )
  const displayedCode = $derived(rendered?.code ?? code)
  const hasDownload = $derived(!!(downloadFilename || ondownload))
  const terminal = $derived((rendered?.language ?? language) === 'bash')
  const hasHeader = $derived(
    !!(title || titleContent || terminal || headerActions || hasDownload)
  )
  const sections = $derived(rendered?.sections ?? getCodeSections(code, folds))
  const styles = $derived(
    Object.entries(theme?.styles ?? {})
      .map(([name, value]) => `${name}:${value}`)
      .join(';')
  )

  $effect(() => {
    if (matches(initial, themeKey)) {
      rendered = initial
      return
    }
    const options = { code, language, theme, mark, folds }
    let cancelled = false
    void import('../code/renderer.js')
      .then(({ renderCode }) => renderCode(options))
      .then((result) => {
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
</script>

{#snippet sourceSection(section: { code: string; html?: string })}
  {#if section.html}
    {@html section.html}
  {:else}
    <pre><code>{section.code}</code></pre>
  {/if}
{/snippet}

<div
  class="not-content [color-scheme:light_dark] [--background:var(--allmaps-code-background,light-dark(#f6f8fa,#151b23))] [--foreground:var(--allmaps-code-foreground,light-dark(#24292e,#e1e4e8))] [--border-width:var(--allmaps-code-border-width,1px)] [--border-color:var(--allmaps-code-border-color,light-dark(#bac4c8,#495c62))] m-0 overflow-hidden border-[length:var(--border-width)] border-solid border-[color:var(--border-color)] rounded-[var(--allmaps-code-border-radius,0.25rem)] bg-[color:var(--background)] text-[color:var(--foreground)] [box-shadow:var(--allmaps-code-shadow,none)] font-[family-name:var(--allmaps-code-ui-font,var(--allmaps-ui-font-sans,system-ui,sans-serif))] text-[length:var(--allmaps-code-ui-font-size,0.875rem)] leading-[1.65] text-start [&[data-terminal=true]]:[--background:var(--allmaps-code-terminal-background,light-dark(#f6f8fa,#0d1117))] [&[data-color-mode=light]]:scheme-light [&[data-color-mode=dark]]:scheme-dark [:root:is(.light,_[data-theme='light'])_&[data-color-mode=auto]]:scheme-light [:root:is(.dark,_[data-theme='dark'])_&[data-color-mode=auto]]:scheme-dark"
  data-color-mode={colorMode}
  data-terminal={terminal}
  data-wrapped={wrap}
  style={styles}
>
  {#if hasHeader}
    <div
      class="relative flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b border-solid border-[color:var(--border-color)] bg-[color:var(--allmaps-code-header-background,transparent)] py-1.5 ps-[var(--allmaps-code-padding-inline,1rem)] pe-1.5 text-[color:var(--allmaps-code-header-foreground,var(--foreground))] [[data-terminal=true]_&]:ps-16"
      data-part="header"
    >
      {#if terminal}
        <svg
          class="[button_&]:w-full [button_&]:h-full absolute left-4 w-[2.1rem] h-[0.56rem] [fill:currentColor] opacity-15"
          viewBox="0 0 60 16"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="8" /><circle cx="30" cy="8" r="8" /><circle
            cx="52"
            cy="8"
            r="8"
          />
        </svg>
      {/if}
      {#if titleContent || title}
        <div
          class="min-w-0 flex-1 wrap-anywhere font-[family-name:var(--allmaps-code-font,var(--allmaps-ui-font-mono,ui-monospace,monospace))] text-[length:var(--allmaps-code-font-size,0.85rem)]"
        >
          {#if titleContent}{@render titleContent()}{:else}{title}{/if}
        </div>
      {/if}
      <div class="ms-auto flex items-center gap-1.5">
        {@render headerActions?.()}
        {#if downloadFilename}
          <DownloadButton
            text={displayedCode}
            filename={downloadFilename}
            {ondownload}
          />
        {:else if ondownload}
          <DownloadButton {ondownload} />
        {/if}
        <CopyButton text={displayedCode} data-code-copy />
      </div>
    </div>
  {/if}
  <div
    class={[
      'relative [&_[data-code-mark]]:inline-block [&_[data-code-mark]]:min-w-full [&_[data-code-mark]]:align-top [&_[data-code-mark]]:border-s-2 [&_[data-code-mark]]:border-pink-400 [&_[data-code-mark]]:ps-2 [&_[data-code-mark]]:-ms-2.5 [&_.shiki_[data-code-label]]:block [&_.shiki_[data-code-label]]:w-fit [&_.shiki_[data-code-label]]:rounded-e [&_[data-code-mark]+[data-code-mark]:has(>[data-code-label])]:mt-2.5 [&_.shiki_[data-code-label]]:bg-pink-400/10 [&_.shiki_[data-code-label]]:text-[color:light-dark(#903567,#ff9dd3)] [&_.shiki_[data-code-label]]:px-2 [&_.shiki_[data-code-label]]:font-sans [&_.shiki_[data-code-label]]:font-semibold [&_.shiki_[data-code-label]]:select-none [&_pre]:m-0 [&_pre]:p-0 [&_pre]:overflow-visible [&_pre]:bg-[color:transparent] [&_pre]:text-[color:light-dark(var(--shiki-light,var(--foreground)),var(--shiki-dark,var(--foreground)))] [&_pre]:font-[family-name:var(--allmaps-code-font,var(--allmaps-ui-font-mono,ui-monospace,monospace))] [&_pre]:text-[length:var(--allmaps-code-font-size,0.85rem)] [&_pre]:[font-weight:var(--allmaps-code-font-weight,400)] [&_pre]:leading-[var(--allmaps-code-line-height,1.65)] [&_pre]:[tab-size:2] [&_pre]:[direction:ltr] [&_code]:[--shiki-light-bg:transparent] [&_code]:[--shiki-dark-bg:transparent] [&_code]:[font-family:inherit] [&_code]:[font-size:inherit] [&_code]:[font-weight:inherit] [&_code]:[line-height:inherit] [&_code]:bg-transparent [&_code]:border-0 [&_code]:p-0 [[data-wrapped=true]_&_pre]:whitespace-pre-wrap [[data-wrapped=true]_&_pre]:wrap-anywhere [&_.shiki_span]:text-[color:light-dark(var(--shiki-light,inherit),var(--shiki-dark,inherit))] [&_.shiki_span]:bg-[color:light-dark(var(--shiki-light-bg,transparent),var(--shiki-dark-bg,transparent))] [&_.shiki_span]:[font-style:var(--shiki-light-font-style,inherit)] [&_.shiki_span]:[font-weight:var(--shiki-light-font-weight,inherit)] [&_.shiki_span]:[text-decoration:var(--shiki-light-text-decoration,inherit)]',
      colorMode === 'dark' &&
        '[&_.shiki_span]:[font-style:var(--shiki-dark-font-style,inherit)] [&_.shiki_span]:[font-weight:var(--shiki-dark-font-weight,inherit)] [&_.shiki_span]:[text-decoration:var(--shiki-dark-text-decoration,inherit)]',
      colorMode === 'system' &&
        '[@media(prefers-color-scheme:dark)]:[&_.shiki_span]:[font-style:var(--shiki-dark-font-style,inherit)] [@media(prefers-color-scheme:dark)]:[&_.shiki_span]:[font-weight:var(--shiki-dark-font-weight,inherit)] [@media(prefers-color-scheme:dark)]:[&_.shiki_span]:[text-decoration:var(--shiki-dark-text-decoration,inherit)]',
      colorMode === 'auto' &&
        "[:root:is(.dark,_[data-theme='dark'])_&_.shiki_span]:[font-style:var(--shiki-dark-font-style,inherit)] [:root:is(.dark,_[data-theme='dark'])_&_.shiki_span]:[font-weight:var(--shiki-dark-font-weight,inherit)] [:root:is(.dark,_[data-theme='dark'])_&_.shiki_span]:[text-decoration:var(--shiki-dark-text-decoration,inherit)] [@media(prefers-color-scheme:dark)]:[:root:not(.light):not([data-theme='light'])_&_.shiki_span]:[font-style:var(--shiki-dark-font-style,inherit)] [@media(prefers-color-scheme:dark)]:[:root:not(.light):not([data-theme='light'])_&_.shiki_span]:[font-weight:var(--shiki-dark-font-weight,inherit)] [@media(prefers-color-scheme:dark)]:[:root:not(.light):not([data-theme='light'])_&_.shiki_span]:[text-decoration:var(--shiki-dark-text-decoration,inherit)]"
    ]}
  >
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users scroll the source on both axes.) -->
    <div
      data-part="viewport"
      role="region"
      aria-label={title
        ? `Source code: ${title}`
        : `${rendered?.language ?? language} source code`}
      tabindex="0"
      class="max-h-[var(--allmaps-code-max-height,none)] overflow-auto focus-visible:outline-2 focus-visible:outline-[color:var(--allmaps-code-focus,#ff56ba)] focus-visible:-outline-offset-2"
    >
      <div
        class="px-[var(--allmaps-code-padding-inline,1rem)] py-[var(--allmaps-code-padding-block,0.75rem)] [[data-wrapped=false]_&]:w-max [[data-wrapped=false]_&]:min-w-full"
      >
        {#if rendered ? rendered.folds?.length : folds.length}
          {#each sections as section, index (`${displayedCode}-${index}`)}
            {#if section.fold}
              <details
                class="[&_summary]:relative [&_summary]:block [&_summary]:p-0 [&_summary]:list-none [&_summary]:text-[color:color-mix(in_srgb,var(--foreground)_65%,var(--background))] [&_summary]:cursor-pointer [&_summary]:[font-weight:var(--allmaps-code-font-weight,400)] [&_summary]:font-[family-name:var(--allmaps-code-font,var(--allmaps-ui-font-mono,ui-monospace,monospace))] [&_summary]:text-[length:var(--allmaps-code-font-size,0.85rem)] [&_summary]:leading-[var(--allmaps-code-line-height,1.65)] [&_summary::-webkit-details-marker]:hidden [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-solid [&_summary:focus-visible]:outline-[color:var(--allmaps-code-focus,#ff56ba)] [&_summary:focus-visible]:outline-offset-[-2px]"
                data-part="code-fold"
                open={section.fold.collapsed === false}
              >
                <summary>
                  <span class="relative block">
                    <svg
                      class="[button_&]:w-full [button_&]:h-full absolute left-[-1.2em] [top:calc(var(--allmaps-code-line-height,1.65)_*_0.5em)] [transform:translateY(-50%)] w-[1em] h-[1em] [[data-part~=code-fold][open]_&]:[transform:translateY(-50%)_rotate(90deg)]"
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
                      <span class="font-normal whitespace-nowrap"
                        >· {section.endLine - section.startLine + 1}
                        {section.endLine === section.startLine
                          ? 'line'
                          : 'lines'}</span
                      ></span
                    >
                    <span
                      class="ms-[0.35em] [[data-part~=code-fold][open]_&]:hidden"
                      aria-hidden="true">…</span
                    >
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
          <pre><code>{code}</code></pre>
        {/if}
      </div>
    </div>
    {#if !hasHeader}
      <div class="absolute end-2 top-2">
        <CopyButton text={displayedCode} data-code-copy />
      </div>
    {/if}
  </div>
</div>
