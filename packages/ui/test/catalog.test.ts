import assert from 'node:assert/strict'
import test from 'node:test'
import { createRawSnippet } from 'svelte'
import { render } from 'svelte/server'
import { svelteLoader } from './helpers/svelte-loader.ts'

const { default: Logo } =
  await import('../src/lib/components/AllmapsLogo.svelte')
const { default: Kbd } = await import('../src/lib/components/ui/kbd/kbd.svelte')
const { default: OpacitySlider } =
  await import('../src/lib/components/ui/opacity-slider/opacity-slider.svelte')
const { default: Checkbox } =
  await import('../src/lib/components/Checkbox.svelte')
const { default: Toggle } =
  await import('../src/lib/components/ui/toggle/toggle.svelte')
const { default: StarToggle } =
  await import('../src/lib/components/ui/star-toggle/star-toggle.svelte')
const { default: MenuCheckbox } = await import('./fixtures/MenuCheckbox.svelte')
const { default: CatalogSelect } =
  await import('./fixtures/CatalogSelect.svelte')
const { default: NorthArrow } =
  await import('../src/lib/components/NorthArrow.svelte')
svelteLoader.deregister()

test('the SDK renders the logo as an image with the requested artwork and accessible name', () => {
  const { body } = render(Logo, { props: { inverted: true, alt: '' } })
  assert.match(body, /<img\s/)
  assert.match(body, /allmaps-logo-inverted\.svg/)
  assert.match(body, /alt=""/)
})

test('the SDK preserves the native keyboard input element and its shortcut label', () => {
  const children = createRawSnippet(() => ({
    render: () => '<span>Enter</span>'
  }))
  const { body } = render(Kbd, { props: { children } })
  assert.match(body, /<kbd\s/)
  assert.match(body, /<span>Enter<\/span>/)
})

test('the opacity control exposes its layer name and collapsed state before hydration', () => {
  const { body } = render(OpacitySlider, {
    props: { opacity: 0.5, label: 'Historic map opacity' }
  })
  assert.match(body, /<button\s/)
  assert.match(body, /aria-label="Historic map opacity"/)
  assert.match(body, /aria-expanded="false"/)
  assert.doesNotMatch(body, /type="range"/)
})

test('a mixed checkbox is labeled and exposes mixed state before hydration', () => {
  const children = createRawSnippet(() => ({
    render: () => '<span>Show labels</span>'
  }))
  const { body } = render(Checkbox, {
    props: { id: 'labels', indeterminate: true, children }
  })
  assert.match(body, /aria-checked="mixed"/)
  assert.match(body, /<label[^>]*for="labels"/)
  assert.match(body, /Show labels/)
})

test('a mixed menu checkbox exposes its state independently of its checked value', () => {
  for (const checked of [false, true]) {
    for (const indeterminate of [false, true]) {
      const { body } = render(MenuCheckbox, {
        props: { checked, indeterminate }
      })
      const item = body.match(/<div\b[^>]*role="menuitemcheckbox"[^>]*>/)?.[0]
      assert.ok(item)
      assert.ok(
        item.includes(`aria-checked="${indeterminate ? 'mixed' : checked}"`)
      )
    }
  }
})

test('toggle shapes use standard Tailwind radii', () => {
  assert.match(render(Toggle).body, /\brounded-md\b/)
  assert.match(
    render(Toggle, { props: { rounded: 'full' } }).body,
    /\brounded-full\b/
  )
})

test('toggle buttons expose their controlled state and accessible name', () => {
  const toggle = render(Toggle, {
    props: { pressed: true, 'aria-label': 'Map labels' }
  })
  const star = render(StarToggle, { props: { starred: true, disabled: true } })
  for (const { body } of [toggle, star])
    assert.match(body, /aria-pressed="true"/)
  assert.match(toggle.body, /aria-label="Map labels"/)
  assert.match(star.body, /aria-label="Star map"/)
  assert.match(star.body, /<button[^>]*disabled/)
})

test('a multiple select renders its selected label and submits its value before hydration', () => {
  const { body } = render(CatalogSelect)
  assert.match(body, /role="combobox"/)
  assert.match(body, /aria-expanded="false"/)
  assert.match(body, /Source image/)
  assert.match(body, /name="layers"/)
})

test('the north arrow exposes its action and describes wrapped directions before hydration', () => {
  const { body } = render(NorthArrow, {
    props: {
      rotation: -2,
      imageUpRotation: 3,
      followOrientation: true,
      'aria-label': 'Change compass mode',
      onclick: () => {}
    }
  })
  assert.match(body, /<button[^>]*type="button"/)
  assert.match(body, /aria-label="Change compass mode"/)
  const descriptionId = body.match(/aria-describedby="([^"]+)"/)?.[1]
  assert.ok(descriptionId && body.includes(`id="${descriptionId}"`))
  assert.match(
    body,
    /North points 358° clockwise from up\. Image top points 3° clockwise from up\. Following device orientation\./
  )
  assert.doesNotMatch(body, /<line\b/)
})

test('a passive compass has image semantics and shows a distinct image-up direction', () => {
  const { body } = render(NorthArrow, {
    props: { rotation: 0, imageUpRotation: 30 }
  })
  assert.match(body, /role="img"/)
  assert.match(body, /aria-label="Map orientation"/)
  assert.doesNotMatch(body, /<button|tabindex=/)
  assert.match(body, /<line[^>]*rotate\(30 400 400\)/)
})
