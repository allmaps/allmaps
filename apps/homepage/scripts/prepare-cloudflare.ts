import { access, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  getLegacyRedirect,
  legacyPathnames
} from '../src/lib/legacy-redirects.ts'

export function createCloudflareRedirects(docsBaseUrl: string) {
  const docsUrl = new URL(docsBaseUrl)
  if (docsUrl.protocol !== 'https:')
    throw new Error('Cloudflare deployment requires an HTTPS docs URL')

  return (
    legacyPathnames
      .flatMap((pathname) => {
        const destination = getLegacyRedirect(pathname, docsBaseUrl)
        if (!destination) throw new Error(`Missing redirect: ${pathname}`)
        return [
          `${pathname} ${destination} 308`,
          `${pathname}/ ${destination} 308`
        ]
      })
      .join('\n') + '\n'
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const docsBaseUrl = process.env.PUBLIC_DOCS_BASE_URL
  if (!docsBaseUrl) throw new Error('PUBLIC_DOCS_BASE_URL is required')
  const directory = fileURLToPath(new URL('../build/', import.meta.url))
  await Promise.all(
    ['index.html', '404.html'].map((name) => access(resolve(directory, name)))
  )
  await writeFile(
    resolve(directory, '_redirects'),
    createCloudflareRedirects(docsBaseUrl)
  )
  console.log('Prepared Cloudflare redirects for the prerendered homepage')
}
