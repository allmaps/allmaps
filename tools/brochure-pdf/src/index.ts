import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright'

const [
  sourceUrl = 'https://allmaps.org/iiif-partnership',
  outputPath = 'allmaps-iiif-partnership.pdf'
] = process.argv.slice(2)

const url = new URL(sourceUrl)
url.searchParams.set('print', '')
const output = resolve(outputPath)
await mkdir(dirname(output), { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
try {
  const page = await browser.newPage()
  await page.goto(url.href, { waitUntil: 'networkidle' })
  await page.pdf({
    path: output,
    pageRanges: '1-3',
    printBackground: true,
    preferCSSPageSize: true,
    tagged: true
  })
  console.log(`Saved ${output}`)
} finally {
  await browser.close()
}
