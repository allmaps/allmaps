#!/usr/bin/env node

import { Command, CommanderError } from '@commander-js/extra-typings'
import { prettifyError, ZodError } from 'zod'

import { analyze } from './commands/analyze.ts'
import { attach } from './commands/attach.ts'
import { annotation } from './commands/annotation.ts'
import { script } from './commands/script.ts'
import { fetch } from './commands/fetch.ts'
import { frame } from './commands/frame.ts'
import { open } from './commands/open.ts'
import { id } from './commands/id.ts'
import { iiif } from './commands/iiif.ts'
import { transform } from './commands/transform.ts'

const fixedWidth = process.env.NODE_ENV === 'test'

const program = new Command()
  .name('allmaps')
  .exitOverride()
  .addCommand(annotation())
  .addCommand(analyze())
  .addCommand(attach())
  .addCommand(fetch())
  .addCommand(frame())
  .addCommand(iiif())
  .addCommand(id())
  .addCommand(open())
  .addCommand(script())
  .addCommand(transform())
  .configureHelp({
    helpWidth: fixedWidth ? 80 : undefined
  })
  .addHelpText('beforeAll', `Allmaps CLI\n`)
  .addHelpText(
    'afterAll',
    `\nFor more details about Allmaps, see https://allmaps.org`
  )

async function parse() {
  try {
    await program.parseAsync(process.argv)
  } catch (err: unknown) {
    if (err instanceof CommanderError) {
      // TODO: I probably don't completely understand how errors should be handled
      // Ignore these errors!
    } else if (err instanceof Error) {
      if ('code' in err && err.code === 'ENOENT' && 'path' in err) {
        console.error(`File not found "${err.path}"`)
      } else if (err instanceof ZodError) {
        console.error(prettifyError(err))
      } else {
        console.error('Error:', err.message)
      }
    } else {
      console.error('Unkown error:', err)
    }
    process.exit(1)
  }
}

parse()
