<script lang="ts">
  import { page } from '$app/state'
  import { DropdownMenu } from 'bits-ui'
  import {
    CaretRight as CaretRightIcon,
    Check as CheckIcon,
    Translate as TranslateIcon
  } from 'phosphor-svelte'

  import { m } from '$lib/paraglide/messages.js'
  import { getLocale, locales } from '$lib/paraglide/runtime.js'

  const labels: Record<string, () => string> = {
    en: m.english,
    nl: m.dutch
  }

  function hrefForLocale(locale: string) {
    const url = new URL(page.url)
    url.searchParams.set('lang', locale)

    return `${url.pathname}?${url.searchParams.toString()}${url.hash}`
  }

  function selectLocale(locale: string) {
    window.location.assign(hrefForLocale(locale))
  }
</script>

<DropdownMenu.Sub>
  <DropdownMenu.SubTrigger
    class="data-highlighted:bg-muted flex h-10 cursor-pointer items-center gap-2 rounded-md py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none hover:bg-gray-100"
  >
    <TranslateIcon class="size-4 shrink-0" />
    <span class="min-w-0 flex-1 truncate">{m.language()}</span>
    <CaretRightIcon class="size-4 shrink-0 text-gray-400" />
  </DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent
    class="w-40 rounded-lg border border-gray-100 bg-white px-1 py-1.5 shadow-md data-[state=open]:animate-scale-in"
    sideOffset={8}
    alignOffset={-6}
  >
    {#each locales as locale (locale)}
      <DropdownMenu.Item
        onSelect={() => selectLocale(locale)}
        textValue={labels[locale]?.() || locale}
        class="data-highlighted:bg-muted flex h-10 cursor-pointer items-center gap-2 rounded-md py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none hover:bg-gray-100"
      >
        <span class="min-w-0 flex-1 truncate">
          {labels[locale]?.() || locale}
        </span>
        {#if getLocale() === locale}
          <CheckIcon class="size-4 shrink-0" weight="bold" />
        {/if}
      </DropdownMenu.Item>
    {/each}
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>
