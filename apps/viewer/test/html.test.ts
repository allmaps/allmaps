import { describe, expect, test } from 'vitest'

import {
  decodeHtmlEntities,
  isSafeHref,
  parseRichTextValue,
  parseSafeHref,
  parseSafeHtmlParts
} from '../src/lib/shared/html.js'

describe('viewer safe rich text parsing', () => {
  test('decodes the HTML entities used in IIIF metadata values', () => {
    expect(decodeHtmlEntities('&lt;a&gt;AT&amp;T &quot;Maps&quot;&#39;s')).toBe(
      '<a>AT&T "Maps"\'s'
    )
    expect(decodeHtmlEntities('Maps&nbsp;&#169;&#xAE;')).toBe(
      'Maps \u00a9\u00ae'
    )
  })

  test('only allows absolute http, https, and mailto hrefs', () => {
    expect(isSafeHref('https://example.org/maps')).toBe(true)
    expect(isSafeHref('http://example.org/maps')).toBe(true)
    expect(isSafeHref('mailto:maps@example.org')).toBe(true)
    expect(isSafeHref('/relative/path')).toBe(false)
    expect(isSafeHref('javascript:alert(1)')).toBe(false)
  })

  test('parses safe anchor, span, and break markup into rich text parts', () => {
    expect(
      parseSafeHtmlParts(
        'Provided by <span><a href="https://example.org">Example &amp; Co</a></span><br />Archive'
      )
    ).toEqual([
      {
        type: 'text',
        value: 'Provided by '
      },
      {
        type: 'link',
        href: 'https://example.org',
        label: 'Example & Co'
      },
      {
        type: 'break'
      },
      {
        type: 'text',
        value: 'Archive'
      }
    ])
  })

  test('supports single-quoted and unquoted anchor hrefs', () => {
    expect(
      parseSafeHtmlParts("<a href='https://example.org'>Example</a>")
    ).toEqual([
      {
        type: 'link',
        href: 'https://example.org',
        label: 'Example'
      }
    ])

    expect(
      parseSafeHtmlParts('<a href=https://example.org>Example</a>')
    ).toEqual([
      {
        type: 'link',
        href: 'https://example.org',
        label: 'Example'
      }
    ])
  })

  test('rejects unsupported or unsafe markup', () => {
    expect(parseSafeHtmlParts('<strong>Example</strong>')).toBeUndefined()
    expect(
      parseSafeHtmlParts('<span data-x="1">Example</span>')
    ).toBeUndefined()
    expect(
      parseSafeHtmlParts('<a href="javascript:alert(1)">Example</a>')
    ).toBeUndefined()
    expect(
      parseSafeHtmlParts('<a href="https://example.org">Example')
    ).toBeUndefined()
    expect(
      parseSafeHtmlParts(
        '<a href="https://example.org"><span>Example</span></a>'
      )
    ).toBeUndefined()
  })

  test('parses plain values with attribution-compatible text decoding', () => {
    expect(parseRichTextValue('https://example.org/maps')).toEqual([
      {
        type: 'link',
        href: 'https://example.org/maps',
        label: 'https://example.org/maps'
      }
    ])
    expect(parseRichTextValue('AT&amp;T', { decodeText: true })).toEqual([
      {
        type: 'text',
        value: 'AT&T'
      }
    ])
  })

  test('keeps plain text undecoded unless requested', () => {
    expect(parseRichTextValue('AT&amp;T')).toEqual([
      {
        type: 'text',
        value: 'AT&amp;T'
      }
    ])
  })

  test('extracts safe plain hrefs from trimmed values', () => {
    expect(parseSafeHref(' https://example.org/maps ')).toBe(
      'https://example.org/maps'
    )
    expect(parseSafeHref('https://example.org/maps?a=1&amp;b=2')).toBe(
      'https://example.org/maps?a=1&b=2'
    )
    expect(parseSafeHref('not a url')).toBeUndefined()
  })

  test('decodes safe anchor href entities before storing links', () => {
    expect(
      parseSafeHtmlParts(
        '<a href="https://example.org/maps?a=1&amp;b=2">Example</a>'
      )
    ).toEqual([
      {
        type: 'link',
        href: 'https://example.org/maps?a=1&b=2',
        label: 'Example'
      }
    ])
  })
})
