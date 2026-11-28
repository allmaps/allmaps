<script module lang="ts">
  import { svelteExample } from './playground-usage.js'

  const resources = [
    { label: 'Map', icon: 'MapTrifoldIcon' },
    { label: 'Image', icon: 'ImageIcon' },
    { label: 'Manifest', icon: 'BookOpenIcon' }
  ] as const

  type Selection =
    { type: 'single'; value: string } | { type: 'multiple'; value: string[] }

  export function formatUsage({
    selection = { type: 'single', value: 'Map' } as Selection,
    align = 'start',
    disabled = false,
    showIcons = false
  } = {}) {
    const script = ["import * as Select from '@allmaps/ui/select'"]
    if (showIcons) {
      for (const { icon } of resources)
        script.push(`import ${icon} from 'phosphor-svelte/lib/${icon}'`)
    }
    const multiple = selection.type === 'multiple'
    script.push(
      '',
      `let value = $state${multiple ? '<string[]>' : ''}(${JSON.stringify(selection.value)})`
    )
    let items: string
    if (showIcons) {
      script.push(
        '',
        'const resources = [',
        ...resources.map(
          ({ label, icon }) => `  { label: '${label}', icon: ${icon} },`
        ),
        ']',
        `const SelectedIcon = $derived(resources.find(({ label }) => label === ${multiple ? 'value[0]' : 'value'})?.icon)`
      )
      items = `    {#each resources as resource (resource.label)}
      <Select.Item value={resource.label} label={resource.label}>
        {#snippet icon()}<resource.icon size={16} />{/snippet}
      </Select.Item>
    {/each}`
    } else {
      items = resources
        .map(
          ({ label }) => `    <Select.Item value="${label}" label="${label}" />`
        )
        .join('\n')
    }

    return svelteExample(
      script,
      `<Select.Root type="${selection.type}" bind:value placeholder="Choose…"${disabled ? ' disabled' : ''}>
  <Select.Trigger aria-label="Resource">${showIcons ? '\n    {#snippet icon()}{#if SelectedIcon}<SelectedIcon size={16} />{/if}{/snippet}' : ''}
    <Select.Value${multiple ? ' maxLabels={1}' : ''} />
  </Select.Trigger>
  <Select.Content align="${align}">
${items}
  </Select.Content>
</Select.Root>`
    )
  }
</script>

<script lang="ts">
  import MapTrifoldIcon from 'phosphor-svelte/lib/MapTrifoldIcon'
  import ImageIcon from 'phosphor-svelte/lib/ImageIcon'
  import BookOpenIcon from 'phosphor-svelte/lib/BookOpenIcon'
  import { Checkbox } from '$lib/checkbox.js'
  import * as Select from '$lib/select.js'
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'

  const icons = { MapTrifoldIcon, ImageIcon, BookOpenIcon }
  const triggerId = $props.id()
  let selection = $state<Selection>({ type: 'single', value: 'Map' })
  let align = $state<'start' | 'center' | 'end'>('start')
  let disabled = $state(false)
  let showIcons = $state(false)

  const firstValue = $derived(
    selection.type === 'multiple' ? selection.value[0] : selection.value
  )
  const selectedResource = $derived(
    resources.find(({ label }) => label === firstValue)
  )
  const SelectedIcon = $derived(
    selectedResource && icons[selectedResource.icon]
  )

  function setMultiple(multiple: boolean) {
    if (multiple && selection.type === 'single')
      selection = {
        type: 'multiple',
        value: selection.value ? [selection.value] : []
      }
    else if (!multiple && selection.type === 'multiple')
      selection = { type: 'single', value: selection.value[0] ?? '' }
  }
</script>

{#snippet selectParts()}
  {#snippet selectedIcon()}{#if SelectedIcon}<SelectedIcon
        size={16}
      />{/if}{/snippet}
  <Select.Trigger
    id={triggerId}
    icon={showIcons && SelectedIcon ? selectedIcon : undefined}
  >
    <Select.Value maxLabels={selection.type === 'multiple' ? 1 : undefined} />
  </Select.Trigger>
  <Select.Content {align}>
    {#each resources as resource (resource.label)}
      {@const Icon = icons[resource.icon]}
      {#snippet itemIcon()}<Icon size={16} />{/snippet}
      <Select.Item
        value={resource.label}
        label={resource.label}
        icon={showIcons ? itemIcon : undefined}
      />
    {/each}
  </Select.Content>
{/snippet}

<Playground usage={formatUsage({ selection, align, disabled, showIcons })}>
  {#snippet preview()}
    <div class="grid w-40 max-w-full gap-1.5 text-sm">
      <label for={triggerId}>Resource</label>
      {#if selection.type === 'multiple'}
        <Select.Root
          type="multiple"
          bind:value={selection.value}
          {disabled}
          placeholder="Choose…"
        >
          {@render selectParts()}
        </Select.Root>
      {:else}
        <Select.Root
          type="single"
          bind:value={selection.value}
          {disabled}
          placeholder="Choose…"
        >
          {@render selectParts()}
        </Select.Root>
      {/if}
    </div>
  {/snippet}
  {#snippet controls()}
    <PlaygroundSelect
      label="Align"
      options={['start', 'center', 'end']}
      bind:value={align}
    />
  {/snippet}
  {#snippet secondColumn()}
    <Checkbox bind:checked={() => selection.type === 'multiple', setMultiple}
      >Multiple</Checkbox
    >
    <Checkbox bind:checked={showIcons}>Show icons</Checkbox>
    <Checkbox bind:checked={disabled}>Disabled</Checkbox>
  {/snippet}
</Playground>
