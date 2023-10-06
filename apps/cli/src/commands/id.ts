import { Command } from 'commander'

import { generateId } from '@allmaps/id'

import { readFromStdin, printString } from '../lib/io.js'

// Instead of supplying input files, you can also use the standard input

export default function id() {
  return new Command('id')
    .argument('[urls...]')
    .summary('generate Allmaps IDs from input URLs')
    .description('Generates Allmaps IDs from input URLs')
    .action(async (urls) => {
      if (!urls.length) {
        const stdinUrls = await readFromStdin()
        urls = stdinUrls.trim().split('\n')
      }

      for (const url of urls) {
        const id = await generateId(url.trim())
        printString(id)
      }
    })
}
