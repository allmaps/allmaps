<script lang="ts">
  import { browser } from '$app/environment'
  import { onDestroy } from 'svelte'
  import { Check as CheckIcon, Copy as CopyIcon } from 'phosphor-svelte'

  type Props = {
    href: string
    label?: string
  }

  let { href, label = href }: Props = $props()

  let copied = $state(false)
  let copyTimeout: number | undefined

  async function copyHref() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(href)
    } else {
      const textarea = document.createElement('textarea')

      textarea.value = href
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.append(textarea)
      textarea.select()
      document.execCommand('copy')
      textarea.remove()
    }

    copied = true
    window.clearTimeout(copyTimeout)
    copyTimeout = window.setTimeout(() => {
      copied = false
    }, 1200)
  }

  onDestroy(() => {
    if (browser) {
      window.clearTimeout(copyTimeout)
    }
  })
</script>

<span class="inline-flex max-w-full items-center gap-1.5 align-top">
  <!-- eslint-disable svelte/no-navigation-without-resolve -->
  <a class="wrap-break-word text-blue-700 underline" {href}>{label}</a>
  <!-- eslint-enable svelte/no-navigation-without-resolve -->
  <button
    aria-label="Copy link"
    class={[
      'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white/80 p-0 hover:bg-white',
      copied
        ? 'border-emerald-300 text-emerald-700'
        : 'border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-950'
    ]}
    title="Copy link"
    type="button"
    onclick={copyHref}
  >
    {#if copied}
      <CheckIcon size={16} weight="bold" />
    {:else}
      <CopyIcon size={16} />
    {/if}
  </button>
</span>
