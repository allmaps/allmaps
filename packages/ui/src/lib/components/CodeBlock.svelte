<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags -- Shiki escapes source text when rendering HTML. */
  import { onMount, untrack } from 'svelte'
  import { getCodeSections } from '../code/folds.js'
  import type { CodeBlockProps, RenderedCodeBlock } from '../code/types.js'

  let {
    code,
    language,
    title,
    titleContent,
    headerActions,
    ondownload,
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
  const actionButtonClasses =
    'grid place-items-center relative w-10 h-10 m-0 p-[0.475rem] border-[length:var(--border-width)] border-solid border-[color:color-mix(in_srgb,var(--allmaps-code-button-border,var(--foreground))_40%,transparent)] rounded-[0.2rem] text-[color:var(--allmaps-code-button-foreground,var(--foreground))] bg-[color:var(--background)] cursor-pointer opacity-75 [transition:opacity_0.2s,background_0.2s] [@media(hover:hover)]:w-8 [@media(hover:hover)]:h-8 [@media(hover:hover)]:opacity-0 hover:opacity-100 hover:bg-[color:color-mix(in_srgb,var(--allmaps-code-button-background,var(--foreground))_20%,var(--background))] focus-visible:opacity-100 focus-visible:bg-[color:color-mix(in_srgb,var(--allmaps-code-button-background,var(--foreground))_20%,var(--background))] disabled:invisible focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[color:var(--allmaps-code-focus,#ff56ba)] focus-visible:outline-offset-[-3px]'
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
  class="not-content [color-scheme:light_dark] [--background:var(--allmaps-code-background,light-dark(rgb(255_255_255_/_85%),rgb(255_255_255_/_6%)))] [--foreground:var(--allmaps-code-foreground,light-dark(#24292e,#e1e4e8))] [--border-width:var(--allmaps-code-border-width,1px)] [--border-color:var(--allmaps-code-border-color,light-dark(#bac4c8,#495c62))] m-0 overflow-hidden border-[length:var(--border-width)] border-solid border-[color:var(--border-color)] rounded-[var(--allmaps-code-border-radius,0.25rem)] bg-[color:var(--background)] text-[color:var(--foreground)] [box-shadow:var(--allmaps-code-shadow,none)] font-[family-name:var(--allmaps-code-ui-font,var(--allmaps-ui-font-sans,system-ui,sans-serif))] text-[length:var(--allmaps-code-ui-font-size,0.875rem)] leading-[1.65] text-start [&[data-terminal=true]]:[--background:var(--allmaps-code-terminal-background,light-dark(#f6f8fa,#1f2428))] [@media(hover:hover)]:[&:hover_[data-code-action]]:opacity-75 [@media(hover:hover)]:[&:focus-within_[data-code-action]]:opacity-75 [@media(hover:hover)]:[&_[data-code-action]:hover]:opacity-100 [@media(hover:hover)]:[&_[data-code-action]:focus-visible]:opacity-100 [:root:is(.light,_[data-theme='light'])_&]:[color-scheme:light] [:root:is(.dark,_[data-theme='dark'])_&]:[color-scheme:dark]"
  data-terminal={terminal}
  data-wrapped={wrap}
  style={styles}
>
  {#if title || titleContent || terminal || headerActions}
    <div
      class="relative flex items-center min-h-10 border-b-[length:var(--border-width)] border-solid border-b-[color:var(--border-color)] bg-[color:var(--allmaps-code-header-background,transparent)] text-[color:var(--allmaps-code-header-foreground,var(--foreground))] [[data-terminal=true]_&:not([data-with-title-content=true])]:justify-center [&[data-with-actions=true]]:flex-wrap [&[data-with-actions=true]]:justify-between [&[data-with-actions=true]]:gap-2 [&[data-with-actions=true]]:py-2 [&[data-with-actions=true]]:px-4 [[data-terminal=true]_&[data-with-actions=true]]:ps-16"
      data-part="header"
      data-with-title-content={!!titleContent}
      data-with-actions={!!headerActions}
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
      {#if titleContent}
        <div class="min-w-0 py-1 ps-4 pe-4 [[data-terminal=true]_&]:ps-16">
          {@render titleContent()}
        </div>
      {:else if title}<span
          class="py-1 px-4 [[data-terminal=true]_&]:px-16 [[data-part~=header][data-with-actions=true]_&]:min-w-0 [[data-part~=header][data-with-actions=true]_&]:p-0 [[data-part~=header][data-with-actions=true]_&]:wrap-anywhere"
          >{title}</span
        >{/if}
      {#if headerActions}
        <div class="shrink-0 ms-auto">{@render headerActions()}</div>
      {/if}
    </div>
  {/if}
  <div
    class="relative [&_pre]:m-0 [&_pre]:[padding:var(--allmaps-code-padding-block,1rem)_var(--allmaps-code-padding-inline,1.35rem)] [&_pre]:overflow-auto [&_pre]:bg-[color:transparent] [&_pre]:text-[color:light-dark(var(--shiki-light,var(--foreground)),var(--shiki-dark,var(--foreground)))] [&_pre]:font-[family-name:var(--allmaps-code-font,var(--allmaps-ui-font-mono,ui-monospace,monospace))] [&_pre]:text-[length:var(--allmaps-code-font-size,0.85rem)] [&_pre]:[font-weight:var(--allmaps-code-font-weight,400)] [&_pre]:leading-[var(--allmaps-code-line-height,1.65)] [&_pre]:[tab-size:2] [&_pre]:[direction:ltr] [&_code]:[--shiki-light-bg:transparent] [&_code]:[--shiki-dark-bg:transparent] [&_code]:[font-family:inherit] [&_code]:[font-size:inherit] [&_code]:[font-weight:inherit] [&_code]:[line-height:inherit] [&_code]:bg-transparent [&_code]:border-0 [&_code]:p-0 [[data-wrapped=true]_&_pre]:whitespace-pre-wrap [[data-wrapped=true]_&_pre]:wrap-anywhere [&_.shiki_span]:text-[color:light-dark(var(--shiki-light,inherit),var(--shiki-dark,inherit))] [&_.shiki_span]:bg-[color:light-dark(var(--shiki-light-bg,transparent),var(--shiki-dark-bg,transparent))] [&_.shiki_span]:[font-style:var(--shiki-light-font-style,inherit)] [&_.shiki_span]:[font-weight:var(--shiki-light-font-weight,inherit)] [&_.shiki_span]:[text-decoration:var(--shiki-light-text-decoration,inherit)] [&_pre:focus-visible]:outline-3 [&_pre:focus-visible]:outline-solid [&_pre:focus-visible]:outline-[color:var(--allmaps-code-focus,#ff56ba)] [&_pre:focus-visible]:outline-offset-[-3px] [:root:is(.dark,_[data-theme='dark'])_&_.shiki_span]:[font-style:var(--shiki-dark-font-style,inherit)] [:root:is(.dark,_[data-theme='dark'])_&_.shiki_span]:[font-weight:var(--shiki-dark-font-weight,inherit)] [:root:is(.dark,_[data-theme='dark'])_&_.shiki_span]:[text-decoration:var(--shiki-dark-text-decoration,inherit)] [@media(prefers-color-scheme:dark)]:[:root:not(.light):not([data-theme='light'])_&_.shiki_span]:[font-style:var(--shiki-dark-font-style,inherit)] [@media(prefers-color-scheme:dark)]:[:root:not(.light):not([data-theme='light'])_&_.shiki_span]:[font-weight:var(--shiki-dark-font-weight,inherit)] [@media(prefers-color-scheme:dark)]:[:root:not(.light):not([data-theme='light'])_&_.shiki_span]:[text-decoration:var(--shiki-dark-text-decoration,inherit)]"
  >
    <div class="[max-height:var(--allmaps-code-max-height,none)] overflow-auto">
      {#if folds.length}
        {#each sections as section, index (`${rendered?.code ?? code}-${index}`)}
          {#if section.fold}
            <details
              class="[&_summary]:relative [&_summary]:block [&_summary]:[padding:var(--allmaps-code-padding-block,1rem)_4rem_0_var(--allmaps-code-padding-inline,1.35rem)] [&_summary]:list-none [&_summary]:text-[color:color-mix(in_srgb,var(--foreground)_65%,var(--background))] [&_summary]:cursor-pointer [&_summary]:[font-weight:var(--allmaps-code-font-weight,400)] [&_summary]:font-[family-name:var(--allmaps-code-font,var(--allmaps-ui-font-mono,ui-monospace,monospace))] [&_summary]:text-[length:var(--allmaps-code-font-size,0.85rem)] [&_summary]:leading-[var(--allmaps-code-line-height,1.65)] [&_summary::-webkit-details-marker]:hidden [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-solid [&_summary:focus-visible]:outline-[color:var(--allmaps-code-focus,#ff56ba)] [&_summary:focus-visible]:outline-offset-[-2px]"
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
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -- Scrollable code must be keyboard focusable. -->
        <pre tabindex="0" aria-label={title ?? language}><code>{code}</code
          ></pre>
      {/if}
    </div>
    <div class="absolute top-2 right-2 flex items-center gap-2">
      <span
        class="opacity-0 py-0.5 px-3 rounded-[0.2rem] text-[color:var(--allmaps-code-feedback-foreground,white)] bg-[color:var(--allmaps-code-feedback-background,#208638)] pointer-events-none [&[data-visible=true]]:opacity-100"
        data-visible={feedback !== ''}
        role="status">{feedback}</span
      >
      {#if ondownload}
        <button
          class={actionButtonClasses}
          type="button"
          data-code-action
          title="Download script"
          aria-label="Download script"
          onclick={ondownload}
          disabled={!mounted}
        >
          <svg
            class="size-full"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6" />
          </svg>
        </button>
      {/if}
      <button
        class={actionButtonClasses}
        type="button"
        data-code-action
        data-code-copy
        title="Copy to clipboard"
        aria-label="Copy to clipboard"
        onclick={copy}
        disabled={!mounted}
      >
        <svg
          class="[button_&]:w-full [button_&]:h-full"
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
