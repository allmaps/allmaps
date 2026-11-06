import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { compile } from 'svelte/compiler'
import { render } from 'svelte/server'
import {
  defineScreenshot,
  screenshotHighlights
} from '../src/lib/screenshots.ts'
import type { ScreenshotGeometry } from '../src/lib/screenshots.ts'

const definition = defineScreenshot({
  url: 'https://editor.allmaps.org',
  slug: 'editor'
})
const geometry: ScreenshotGeometry = {
  schemaVersion: 1,
  slug: 'editor',
  version: 1,
  imageSha256: 'a'.repeat(64),
  viewport: { width: 1440, height: 900 },
  targets: {
    settings: { x: 100, y: 80, width: 32, height: 32 },
    panel: { x: 800, y: 120, width: 400, height: 600 }
  }
}

async function component(customHighlight = false) {
  const filename = new URL(
    '../src/lib/components/Screenshot.svelte',
    import.meta.url
  )
  const source = await readFile(filename, 'utf8')
  const compiled = compile(source, {
    generate: 'server',
    filename: filename.pathname
  })
  const javascript = compiled.js.code.replace(
    /(['"])(svelte(?:\/[^'"]*)?|@allmaps\/ui\/screenshots\/integration|\.\.\/[^'"]+)\1/g,
    (_, quote, specifier) => {
      const resolved = !specifier.startsWith('..')
        ? import.meta.resolve(specifier)
        : new URL(specifier.replace(/\.js$/, '.ts'), filename).href
      return `${quote}${resolved}${quote}`
    }
  )
  const componentUrl = `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
  if (!customHighlight) return (await import(componentUrl)).default

  const wrapper = compile(
    `
    <script>
      import Screenshot from ${JSON.stringify(componentUrl)}
      let { highlights, ...props } = $props()
    </script>
    <Screenshot {...props} {highlights}>
      {#snippet highlight({ name, bounds })}
        <rect
          data-custom-highlight={name}
          x={bounds.x} y={bounds.y}
          width={bounds.width} height={bounds.height}
          class="fill-blue-500/10 stroke-blue-600 stroke-2"
          vector-effect="non-scaling-stroke"
        />
        <text x={bounds.x + 8} y={bounds.y + 20}>{name}</text>
      {/snippet}
    </Screenshot>
  `,
    { generate: 'server', filename: 'CustomScreenshot.svelte' }
  )
  const wrapperJavascript = wrapper.js.code.replace(
    /(['"])(svelte(?:\/[^'"]*)?)\1/g,
    (_, quote, specifier) => `${quote}${import.meta.resolve(specifier)}${quote}`
  )
  return (
    await import(
      `data:text/javascript;base64,${Buffer.from(wrapperJavascript).toString('base64')}`
    )
  ).default
}

test('renders clean images as before and SVG outlines in initial server HTML', async () => {
  const Screenshot = await component()
  const props = { ...definition, alt: 'Editor settings', geometry }
  const clean = render(Screenshot, { props }).body
  assert.ok(!clean.includes('data-highlight'))
  const highlighted = render(Screenshot, {
    props: { ...props, highlights: ['settings'], highlightPadding: 5 }
  }).body
  assert.match(highlighted, /viewBox="0 0 1440 900"/)
  assert.match(
    highlighted,
    /data-highlight="settings" x="95" y="75" width="42" height="42"/
  )
  assert.match(highlighted, /vector-effect="non-scaling-stroke"/)
  assert.match(highlighted, /aria-hidden="true" focusable="false"/)
  assert.ok(!highlighted.includes('data-highlight="panel"'))
  assert.ok(highlighted.indexOf('<img') < highlighted.indexOf('data-highlight'))
  const panel = render(Screenshot, {
    props: { ...props, highlights: ['panel'] }
  }).body
  assert.match(panel, /data-highlight="panel"/)
  assert.match(panel, /alt="Editor settings"/)
})

test('keeps the URL bar opt-in', async () => {
  const Screenshot = await component()
  const output = render(Screenshot, {
    props: { ...definition, alt: 'Editor', urlDisplay: 'hostname' }
  }).body
  assert.doesNotMatch(output, /url-bar|<a\b|<input\b/)
})

test('renders responsive candidates with an original fallback and appropriate sizes', async () => {
  const Screenshot = await component()
  const props = { ...definition, alt: 'Editor', widths: [960, 480, 960] }
  const responsive = render(Screenshot, { props }).body
  assert.match(
    responsive,
    /src="https:\/\/files.allmaps.org\/screenshots\/editor\/v1.webp"/
  )
  assert.match(
    responsive,
    /srcset="https:\/\/files.allmaps.org\/screenshots\/editor\/v1-480w.webp 480w, https:\/\/files.allmaps.org\/screenshots\/editor\/v1-960w.webp 960w"/
  )
  assert.match(responsive, /sizes="auto, 100vw"/)
  assert.match(responsive, /width="1440" height="900"/)
  assert.match(
    render(Screenshot, { props: { ...props, loading: 'eager' } }).body,
    /sizes="100vw"/
  )
  const custom = render(Screenshot, {
    props: {
      ...props,
      filesBaseUrl: 'https://images.example.org/',
      sizes: '(min-width: 768px) 448px, 100vw'
    }
  }).body
  assert.match(
    custom,
    /https:\/\/images.example.org\/screenshots\/editor\/v1-480w.webp 480w/
  )
  assert.match(custom, /sizes="\(min-width: 768px\) 448px, 100vw"/)
  const original = render(Screenshot, {
    props: { ...definition, alt: 'Editor', sizes: '448px' }
  }).body
  assert.doesNotMatch(original, /srcset=|sizes=/)
})

test('keeps custom sources in control of their candidates', async () => {
  const Screenshot = await component()
  const props = {
    ...definition,
    alt: 'Editor',
    src: '/editor.webp',
    widths: [480, 960]
  }
  const image = render(Screenshot, { props }).body
  assert.match(image, /src="\/editor.webp"/)
  assert.doesNotMatch(image, /srcset=|sizes=/)
  const responsive = render(Screenshot, {
    props: {
      ...props,
      srcset: '/small.webp 480w, /large.webp 960w',
      sizes: '448px'
    }
  }).body
  assert.match(
    responsive,
    /srcset="\/small.webp 480w, \/large.webp 960w" sizes="448px"/
  )
})

test('formats the inert URL bar without adding links or inputs', async () => {
  const Screenshot = await component()
  const url =
    'https://editor.allmaps.org:8443/georeference?map=example#settings'
  for (const [urlDisplay, expected] of [
    [undefined, url],
    ['full', url],
    ['hostname', 'editor.allmaps.org'],
    ['route', 'editor.allmaps.org:8443/georeference']
  ]) {
    const output = render(Screenshot, {
      props: {
        ...definition,
        url,
        alt: 'Editor settings',
        showUrl: true,
        urlDisplay,
        geometry,
        highlights: ['settings']
      }
    }).body
    assert.equal(
      output.match(/<div class="url-bar[^\"]*">([^<]*)<\/div>/)?.[1],
      expected
    )
    assert.match(output, /class="toolbar[^\"]*" aria-hidden="true" inert/)
    assert.doesNotMatch(output, /<a\b|<input\b/)
    assert.match(output, /<img\b[\s\S]*data-highlight="settings"/)
  }
})

test('keeps cropped screenshots frameless with showUrl enabled', async () => {
  const Screenshot = await component()
  const output = render(Screenshot, {
    props: {
      ...definition,
      alt: 'Settings',
      showUrl: true,
      crop: { x: 100, y: 80, width: 400, height: 300 }
    }
  }).body
  assert.doesNotMatch(output, /toolbar|url-bar|<a\b/)
  assert.match(output, /width="400" height="300"/)
})

test('renders a custom SVG snippet for each selected target with raw bounds and no fallback styles', async () => {
  const Screenshot = await component(true)
  const props = {
    ...definition,
    geometry,
    alt: 'Highlighted editor',
    highlightPadding: 20
  }
  const output = render(Screenshot, {
    props: { ...props, highlights: ['panel', 'settings'] }
  })
  assert.match(
    output.body,
    /data-custom-highlight="panel" x="800" y="120" width="400" height="600"/
  )
  assert.match(
    output.body,
    /data-custom-highlight="settings" x="100" y="80" width="32" height="32"/
  )
  assert.match(
    output.body,
    /class="fill-blue-500\/10 stroke-blue-600 stroke-2"/
  )
  assert.match(output.body, /<text x="108" y="100">settings<\/text>/)
  assert.ok(!output.body.includes('default-highlight'))
  assert.ok(!output.body.includes('data-highlight='))
  assert.match(output.body, /viewBox="0 0 1440 900"/)
  assert.match(output.body, /aria-hidden="true" focusable="false"/)
  assert.ok(
    output.body.indexOf('data-custom-highlight="panel"') <
      output.body.indexOf('data-custom-highlight="settings"')
  )
  // Default styling must target the fallback class, not arbitrary snippet rects.
  const source = await readFile(
    new URL('../src/lib/components/Screenshot.svelte', import.meta.url),
    'utf8'
  )
  const css = compile(source, { generate: 'server' }).css?.code
  assert.ok(css)
  assert.ok(!/\.highlights[^{}]*rect/.test(css))
  const clean = render(Screenshot, { props: { ...props, highlights: [] } }).body
  assert.ok(!clean.includes('data-custom-highlight'))
  assert.ok(!clean.includes('viewBox="0 0 1440 900"'))
})

test('rejects missing, stale, invalid, and unknown geometry rather than drawing misleading outlines', () => {
  assert.throws(
    () => screenshotHighlights(definition, undefined, ['settings']),
    /require captured geometry/
  )
  assert.throws(
    () =>
      screenshotHighlights(definition, { ...geometry, version: 2 }, [
        'settings'
      ]),
    /does not match/
  )
  assert.throws(
    () =>
      screenshotHighlights(
        definition,
        { ...geometry, viewport: { width: 720, height: 450 } },
        ['settings']
      ),
    /bounds|does not match/
  )
  assert.throws(
    () => screenshotHighlights(definition, geometry, ['missing']),
    /Unknown screenshot highlight/
  )
  assert.throws(
    () =>
      screenshotHighlights(
        definition,
        {
          ...geometry,
          targets: { settings: { x: NaN, y: 0, width: 10, height: 10 } }
        },
        ['settings']
      ),
    /Invalid screenshot bounds/
  )
  assert.equal(
    screenshotHighlights(definition, geometry, ['settings', 'settings']).length,
    1
  )
})

test('highlight selection and appearance do not affect manifest definitions', () => {
  const extra = {
    ...definition,
    geometry,
    highlights: ['settings'],
    highlightPadding: 8
  }
  assert.deepEqual(defineScreenshot(extra), defineScreenshot(definition))
})

test('uses cropped image dimensions and image-relative bounds for custom highlights', async () => {
  const Screenshot = await component(true)
  const crop = { x: 780, y: 100, width: 440, height: 640 }
  const croppedGeometry = {
    ...geometry,
    crop,
    targets: { panel: { x: 20, y: 20, width: 400, height: 600 } }
  }
  const props = {
    ...definition,
    crop: { selector: '#panel', padding: 20 },
    geometry: croppedGeometry,
    highlights: ['panel'],
    alt: 'Settings'
  }
  const output = render(Screenshot, { props }).body
  assert.match(output, /width="440" height="640"/)
  assert.match(output, /viewBox="0 0 440 640"/)
  assert.match(
    output,
    /data-custom-highlight="panel" x="20" y="20" width="400" height="600"/
  )
  const fixed = render(Screenshot, {
    props: { ...definition, crop, alt: 'Settings' }
  }).body
  assert.match(fixed, /width="440" height="640"/)
  assert.throws(
    () => render(Screenshot, { props: { ...props, geometry } }).body,
    /bounds|does not match/
  )
  assert.throws(
    () =>
      render(Screenshot, {
        props: {
          ...props,
          geometry: { ...croppedGeometry, targets: geometry.targets }
        }
      }).body,
    /bounds/
  )
  assert.throws(
    () =>
      render(Screenshot, { props: { ...props, crop: { ...crop, x: 1 } } }).body,
    /does not match/
  )
})
