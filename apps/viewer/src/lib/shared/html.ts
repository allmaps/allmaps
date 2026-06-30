export type RichTextPart =
  | {
      type: 'text'
      value: string
    }
  | {
      type: 'link'
      href: string
      label: string
    }
  | {
      type: 'break'
    }

type ParseRichTextOptions = {
  decodeText?: boolean
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  copy: '\u00a9',
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
  reg: '\u00ae'
}

export function decodeHtmlEntities(value: string) {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z][a-z0-9]+));/gi,
    (entity, decimal, hexadecimal, name) => {
      if (decimal || hexadecimal) {
        const codePoint = Number.parseInt(
          decimal ?? hexadecimal,
          decimal ? 10 : 16
        )

        try {
          return String.fromCodePoint(codePoint)
        } catch {
          return entity
        }
      }

      return HTML_ENTITIES[name.toLowerCase()] ?? entity
    }
  )
}

export function isSafeHref(href: string) {
  try {
    const url = new URL(href)
    return ['http:', 'https:', 'mailto:'].includes(url.protocol)
  } catch {
    return false
  }
}

export function parseSafeHref(value: string) {
  const trimmedValue = decodeHtmlEntities(value).trim()

  return isSafeHref(trimmedValue) ? trimmedValue : undefined
}

export function parseSafeHtmlParts(value: string): RichTextPart[] | undefined {
  const trimmedValue = value.trim()

  if (!/<[^>]+>/.test(trimmedValue)) {
    return
  }

  const parts: RichTextPart[] = []
  const tagPattern = /<[^>]+>/g
  let lastIndex = 0
  let spanDepth = 0
  let activeLink:
    | {
        href: string
        label: string
      }
    | undefined

  const appendText = (text: string) => {
    if (!text) {
      return
    }

    const decodedText = decodeHtmlEntities(text)

    if (activeLink) {
      activeLink.label += decodedText
    } else if (decodedText) {
      parts.push({
        type: 'text',
        value: decodedText
      })
    }
  }

  for (const match of trimmedValue.matchAll(tagPattern)) {
    appendText(trimmedValue.slice(lastIndex, match.index))

    const tag = match[0].slice(1, -1).trim()

    if (/^span$/i.test(tag)) {
      spanDepth += 1
    } else if (/^\/span$/i.test(tag)) {
      if (spanDepth === 0 || activeLink) {
        return
      }

      spanDepth -= 1
    } else if (/^br\s*\/?$/i.test(tag)) {
      if (activeLink) {
        return
      }

      parts.push({ type: 'break' })
    } else if (/^a(?:\s|$)/i.test(tag)) {
      if (activeLink) {
        return
      }

      const hrefMatch = tag.match(
        /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i
      )
      const href = hrefMatch?.[1] ?? hrefMatch?.[2] ?? hrefMatch?.[3]
      const safeHref = href ? parseSafeHref(href) : undefined

      if (!safeHref) {
        return
      }

      activeLink = {
        href: safeHref,
        label: ''
      }
    } else if (/^\/a$/i.test(tag)) {
      if (!activeLink) {
        return
      }

      parts.push({
        type: 'link',
        href: activeLink.href,
        label: activeLink.label.trim() || activeLink.href
      })
      activeLink = undefined
    } else {
      return
    }

    lastIndex = match.index + match[0].length
  }

  appendText(trimmedValue.slice(lastIndex))

  if (spanDepth !== 0 || activeLink) {
    return
  }

  return parts.length > 0 ? parts : undefined
}

function parsePlainRichTextParts(
  value: string,
  options: ParseRichTextOptions = {}
): RichTextPart[] {
  const trimmedValue = value.trim()
  const href = parseSafeHref(trimmedValue)

  if (href) {
    return [
      {
        type: 'link',
        href,
        label: href
      }
    ]
  }

  return [
    {
      type: 'text',
      value: options.decodeText
        ? decodeHtmlEntities(trimmedValue)
        : trimmedValue
    }
  ]
}

export function parseRichTextValue(
  value: string,
  options: ParseRichTextOptions = {}
) {
  return parseSafeHtmlParts(value) ?? parsePlainRichTextParts(value, options)
}
