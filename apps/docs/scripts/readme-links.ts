import { statSync } from 'node:fs'
import path from 'node:path'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'

const markdown = remark().use(remarkGfm)
type Root = ReturnType<typeof markdown.parse>
type MarkdownNode = Root | Root['children'][number]

type ReadmeLinkOptions = {
  repositoryRoot: string
  readmePath: string
  packageNames: ReadonlySet<string>
  branch?: string
}

/** Rewrite repository-relative Markdown links in the generated docs only. */
export function rewriteReadmeLinks(
  source: string,
  {
    repositoryRoot,
    readmePath,
    packageNames,
    branch = 'develop'
  }: ReadmeLinkOptions
) {
  const relativeReadmePath = path.relative(repositoryRoot, readmePath)
  const baseUrl = new URL(
    relativeReadmePath.split(path.sep).map(encodeURIComponent).join('/'),
    'https://repository.invalid/'
  )
  const tree = markdown.parse(source)
  const imageReferences = new Set<string>()
  const changed = new Set<MarkdownNode>()
  const serializer = remark()
    .use(remarkGfm)
    .data('settings', {
      handlers: {
        inlineCode(node: Extract<MarkdownNode, { type: 'inlineCode' }>) {
          return source.slice(
            node.position!.start.offset,
            node.position!.end.offset
          )
        }
      }
    })

  function visit(node: MarkdownNode, callback: (node: MarkdownNode) => void) {
    callback(node)
    if ('children' in node) {
      for (const child of node.children) visit(child, callback)
    }
  }

  function rewrite(destination: string, image: boolean) {
    // Leave absolute URLs, root-relative URLs, and same-page anchors alone.
    if (!destination || /^(?:[a-z][a-z\d+.-]*:|\/|#|\?)/i.test(destination)) {
      return destination
    }

    const url = new URL(destination, baseUrl)
    const repositoryPath = decodeURIComponent(url.pathname.slice(1))
    const packageMatch = /^packages\/([^/]+)(?:\/(?:README\.md)?)?$/i.exec(
      repositoryPath
    )
    const suffix = url.search + url.hash

    if (!image && packageMatch && packageNames.has(packageMatch[1])) {
      return `/packages/${encodeURIComponent(packageMatch[1])}${suffix}`
    }

    if (image) {
      return `https://raw.githubusercontent.com/allmaps/allmaps/${encodeURIComponent(branch)}${url.pathname}${suffix}`
    }

    let directory = url.pathname.endsWith('/')
    try {
      directory = statSync(
        path.join(repositoryRoot, repositoryPath)
      ).isDirectory()
    } catch {
      // Preserve unresolved links as repository links; do not invent docs routes.
    }
    const view = directory ? 'tree' : 'blob'
    return `https://github.com/allmaps/allmaps/${view}/${encodeURIComponent(branch)}${url.pathname}${suffix}`
  }

  visit(tree, (node) => {
    if (node.type === 'imageReference') imageReferences.add(node.identifier)
  })
  visit(tree, (node) => {
    if (
      node.type === 'link' ||
      node.type === 'image' ||
      node.type === 'definition'
    ) {
      const image =
        node.type === 'image' ||
        (node.type === 'definition' && imageReferences.has(node.identifier))
      const destination = rewrite(node.url, image)
      if (destination !== node.url) {
        node.url = destination
        changed.add(node)
      }
    }
  })

  // Serialize only changed links, not the whole README: stringifying tables
  // can otherwise reformat multiline inline code in generated API references.
  const edits: { start: number; end: number; text: string }[] = []
  function collectEdits(node: MarkdownNode, inTable = false) {
    if (
      changed.has(node) &&
      (node.type === 'link' ||
        node.type === 'image' ||
        node.type === 'definition')
    ) {
      const replacement: Root = {
        type: 'root',
        children: [
          node.type === 'definition'
            ? node
            : { type: 'paragraph', children: [node] }
        ]
      }
      let text = serializer.stringify(replacement).trimEnd()
      if (inTable) {
        text = text.replace(/(\\*)\|/g, (match, slashes: string) =>
          slashes.length % 2 ? match : `${slashes}\\|`
        )
      }
      edits.push({
        start: node.position!.start.offset!,
        end: node.position!.end.offset!,
        text
      })
      // Nested images have already been rewritten and are serialized here too.
      return
    }
    if ('children' in node) {
      node.children.forEach((child) =>
        collectEdits(child, inTable || node.type === 'table')
      )
    }
  }
  collectEdits(tree)
  let result = source
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    result = result.slice(0, edit.start) + edit.text + result.slice(edit.end)
  }
  return result
}
