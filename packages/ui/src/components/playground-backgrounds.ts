import { black, white, shades, originalColorIndex } from '@allmaps/tailwind'

const colors = Object.entries(shades).map(([name, scale]) => ({
  name,
  label:
    name === 'darkblue' ? 'Dark blue' : name[0].toUpperCase() + name.slice(1),
  solid: scale[originalColorIndex],
  faded: scale[0]
}))

export const backgrounds = [
  {
    name: 'theme',
    label: 'Theme background',
    color: 'var(--allmaps-ui-muted)'
  },
  { name: 'white', label: 'White', color: white },
  { name: 'black', label: 'Black', color: black },
  ...colors.map(({ name, label, solid }) => ({ name, label, color: solid })),
  ...colors.map(({ name, label, faded }) => ({
    name: name + '-faded',
    label: label + ' (faded)',
    color: faded
  }))
]

export const backgroundColors = Object.fromEntries(
  backgrounds.map(({ name, color }) => [name, color])
)
export const backgroundLabels = Object.fromEntries(
  backgrounds.map(({ name, label }) => [name, label])
)
export const backgroundOptions = backgrounds.map(({ name }) => name)
