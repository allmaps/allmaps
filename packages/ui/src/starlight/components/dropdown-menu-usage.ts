import { svelteExample } from './playground-usage.js'

export function formatDropdownMenuUsage({
  align = 'start',
  showIcons = true,
  enableShortcut = true
} = {}) {
  const script = [
    "import * as DropdownMenu from '@allmaps/ui/dropdown-menu'",
    "import { Button } from '@allmaps/ui/button'"
  ]
  if (enableShortcut) script.push("import * as Kbd from '@allmaps/ui/kbd'")
  if (showIcons) {
    for (const icon of [
      'StarIcon',
      'KeyboardIcon',
      'FolderIcon',
      'DownloadSimpleIcon'
    ]) {
      script.push(`import ${icon} from 'phosphor-svelte/lib/${icon}'`)
    }
  }
  script.push('', 'let favorite = $state(false)', "let message = $state('')")
  if (enableShortcut) script.push('let open = $state(false)')
  script.push(
    '',
    'function toggleFavorite() {',
    '  favorite = !favorite',
    "  message = favorite ? 'Map added to favorites.' : 'Map removed from favorites.'",
    '}'
  )
  if (enableShortcut) {
    script.push(
      '',
      'function handleShortcut(event: KeyboardEvent) {',
      "  if (event.key.toLowerCase() !== 'f' || event.altKey || event.ctrlKey ||",
      '      event.metaKey || event.shiftKey || event.repeat || event.isComposing) return',
      '  event.preventDefault()',
      '  toggleFavorite()',
      '  open = false',
      '}'
    )
  }
  const shortcut = enableShortcut ? ' onkeydowncapture={handleShortcut}' : ''
  const icon = (name: string) =>
    showIcons ? `<${name} aria-hidden="true" /> ` : ''
  return svelteExample(
    script,
    `<DropdownMenu.Root${enableShortcut ? ' bind:open' : ''}>
  <DropdownMenu.Trigger${shortcut}>
    {#snippet child({ props })}
      <Button {...props}>Map actions</Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="${align}"${shortcut}>
    <DropdownMenu.Item onSelect={toggleFavorite}${enableShortcut ? ' aria-keyshortcuts="F"' : ''}>
      ${icon('StarIcon')}{favorite ? 'Remove from favorites' : 'Add to favorites'}${enableShortcut ? '\n      <DropdownMenu.Shortcut><Kbd.Root>F</Kbd.Root></DropdownMenu.Shortcut>' : ''}
    </DropdownMenu.Item>
    <DropdownMenu.Item>
      {#snippet child({ props })}
        <a {...props} href="/components/kbd">${icon('KeyboardIcon')}View keycaps</a>
      {/snippet}
    </DropdownMenu.Item>
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>${icon('FolderIcon')}Add to collection</DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        {#each ['Field notes', 'Research atlas'] as collection (collection)}
          <DropdownMenu.Item onSelect={() => (message = \`Map added to \${collection}.\`)}>
            {collection}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
    <DropdownMenu.Item disabled>${icon('DownloadSimpleIcon')}Download map</DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>
{#if message}<p role="status">{message}</p>{/if}`
  )
}
