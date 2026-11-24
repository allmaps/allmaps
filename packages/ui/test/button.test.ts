import assert from 'node:assert/strict'
import test from 'node:test'
import { createRawSnippet } from 'svelte'
import { render } from 'svelte/server'
import { svelteLoader } from './helpers/svelte-loader.ts'

const { default: Button } = await import(
  new URL('../src/lib/components/ui/button/button.svelte', import.meta.url).href
)
svelteLoader.deregister()
const children = createRawSnippet(() => ({
  render: () => '<span>Open map</span>'
}))

test('buttons do not submit forms unless explicitly requested', () => {
  assert.match(render(Button, { props: { children } }).body, /type="button"/)
  assert.match(
    render(Button, {
      props: { children, type: 'submit', name: 'action', value: 'open' }
    }).body,
    /type="submit"/
  )
})

test('button shapes use standard Tailwind radii', () => {
  assert.match(render(Button, { props: { children } }).body, /\brounded-md\b/)
  assert.match(
    render(Button, { props: { children, rounded: 'full' } }).body,
    /\brounded-full\b/
  )
})

test('navigation renders a real anchor with its native attributes', () => {
  const html = render(Button, {
    props: {
      children,
      href: '/maps',
      target: '_blank',
      rel: 'noreferrer',
      'aria-label': 'Open maps'
    }
  }).body
  assert.match(html, /<a\s/)
  assert.match(html, /href="\/maps"/)
  assert.match(html, /target="_blank"/)
  assert.match(html, /rel="noreferrer"/)
  assert.match(html, /aria-label="Open maps"/)
  assert.doesNotMatch(html, /<button|type="button"/)
})

test('disabled links have no navigation target and leave the tab order', () => {
  const html = render(Button, {
    props: { children, href: '/maps', disabled: true }
  }).body
  assert.doesNotMatch(html, /href=/)
  assert.match(html, /role="link"/)
  assert.match(html, /aria-disabled="true"/)
  assert.match(html, /tabindex="-1"/)
})

test('loading disables actions and exposes busy state while preserving the label', () => {
  const html = render(Button, { props: { children, loading: true } }).body
  assert.match(html, /<button[^>]*\sdisabled(?:="")?(?:\s|>)/)
  assert.match(html, /aria-busy="true"/)
  assert.match(html, /Open map/)
  const link = render(Button, {
    props: { children, href: '/maps', loading: true }
  }).body
  assert.doesNotMatch(link, /href=/)
  assert.match(link, /aria-busy="true"/)
  assert.match(link, /aria-disabled="true"/)
})

test('loading uses LoadingSmall by default and accepts a replacement snippet', () => {
  const icon = createRawSnippet(() => ({ render: () => '<svg></svg>' }))
  const loadingIndicator = createRawSnippet(() => ({
    render: () => '<span>Custom indicator</span>'
  }))
  const textOnly = render(Button, {
    props: { children, loading: true, loadingIndicator }
  }).body
  assert.doesNotMatch(
    textOnly,
    /data-slot="loading-indicator"|Custom indicator|loading-small.webp/
  )
  const defaultButton = render(Button, {
    props: { children, icon, loading: true }
  }).body
  assert.match(defaultButton, /color: *currentColor/i)
  assert.match(defaultButton, /--loader-image:.*loading-small.webp/)
  const customLink = render(Button, {
    props: { children, icon, loading: true, href: '/maps', loadingIndicator }
  }).body
  assert.match(customLink, /Custom indicator/)
  assert.doesNotMatch(customLink, /loading-small.webp/)
  assert.doesNotMatch(
    render(Button, { props: { children, icon, loadingIndicator } }).body,
    /Custom indicator|loading-small.webp/
  )
})

test('trigger and toggle semantics pass through to the native control', () => {
  const html = render(Button, {
    props: {
      children,
      id: 'map-toggle',
      'aria-label': 'Map view',
      'aria-pressed': false,
      'aria-expanded': true,
      'aria-controls': 'map-options',
      'data-state': 'open',
      class: 'custom-layout'
    }
  }).body
  assert.match(html, /id="map-toggle"/)
  assert.match(html, /aria-pressed="false"/)
  assert.match(html, /aria-expanded="true"/)
  assert.match(html, /aria-controls="map-options"/)
  assert.match(html, /data-state="open"/)
  assert.match(html, /custom-layout/)
})
