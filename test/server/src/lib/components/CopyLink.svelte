<script lang="ts">
  import { browser } from '$app/environment'
  import { onDestroy } from 'svelte'
  import {
    ArrowSquareOut as ArrowSquareOutIcon,
    Check as CheckIcon,
    Copy as CopyIcon
  } from 'phosphor-svelte'

  type Props = {
    href: string
    label?: string
    description?: string
    compact?: boolean
  }

  let { href, label = href, description, compact = false }: Props = $props()

  let copied = $state(false)
  let copyTimeout: number | undefined
  const openLabel = $derived(description ? `Open ${description}` : label)
  const copyLabel = $derived(
    description ? `Copy ${description}` : `Copy ${label}`
  )

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

{#if compact}
  <span class="inline-flex max-w-full items-center gap-1 align-top">
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    <a
      aria-label={openLabel}
      class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white/80 text-gray-600 hover:border-blue hover:bg-white hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
      {href}
      title={openLabel}
    >
      <ArrowSquareOutIcon size={16} />
    </a>
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
    <button
      aria-label={copyLabel}
      class={[
        'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white/80 p-0 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink',
        copied
          ? 'border-green text-green-700'
          : 'border-gray-300 text-gray-600 hover:border-gray-600 hover:text-black'
      ]}
      title={copyLabel}
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
{:else}
  <span class="inline-flex max-w-full items-center gap-1.5 align-top">
    <!-- eslint-disable svelte/no-navigation-without-resolve -->
    <a
      class="wrap-break-word text-darkblue-900 underline decoration-pink underline-offset-2 hover:text-pink"
      {href}>{label}</a
    >
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
    <button
      aria-label={copyLabel}
      class={[
        'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white/80 p-0 hover:bg-white',
        copied
          ? 'border-green text-green-700'
          : 'border-gray-300 text-gray-600 hover:border-gray-600 hover:text-black'
      ]}
      title={copyLabel}
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
{/if}
