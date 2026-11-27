import { svelteExample } from './playground-usage.js'
import type { ButtonVariant, Rounded } from '$lib/button.js'

type Settings = {
  variant?: ButtonVariant
  rounded?: Rounded
  label?: string
  icon?: 'none' | 'leading' | 'trailing' | 'only'
  disabled?: boolean
  loading?: boolean
  customIndicator?: boolean
}

function escapeMarkup(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('{', '&#123;')
    .replaceAll('}', '&#125;')
}

export function formatButtonUsage({
  variant = 'default',
  rounded = 'rounded',
  label = 'Open map',
  icon = 'leading',
  disabled,
  loading,
  customIndicator
}: Settings = {}) {
  const imports = ["import { Button } from '@allmaps/ui/button'"]
  const attributes = []
  const children = []
  if (variant !== 'default') attributes.push(`variant="${variant}"`)
  if (rounded !== 'rounded') attributes.push(`rounded="${rounded}"`)
  if (icon === 'only') {
    const name = escapeMarkup(label || 'Open map').replaceAll('"', '&quot;')
    attributes.push('iconOnly', `aria-label="${name}"`)
  }
  if (icon === 'trailing') attributes.push('iconPosition="trailing"')
  if (disabled) attributes.push('disabled')
  if (loading) attributes.push('loading')

  const iconName = icon === 'trailing' ? 'ArrowRightIcon' : 'GlobeIcon'
  const iconMarkup = `<${iconName} class="size-5" aria-hidden="true" />`
  if (icon !== 'none')
    imports.push(`import ${iconName} from 'phosphor-svelte/lib/${iconName}'`)
  if (customIndicator && icon !== 'none')
    children.push('{#snippet loadingIndicator()}<span>•••</span>{/snippet}')
  if (icon !== 'none') children.push(`{#snippet icon()}${iconMarkup}{/snippet}`)
  if (icon !== 'only') children.push(escapeMarkup(label))

  const markup = [
    `<${['Button', ...attributes].join(' ')}>`,
    ...children.map((line) => `  ${line}`),
    '</Button>'
  ].join('\n')
  return svelteExample(imports, markup)
}
