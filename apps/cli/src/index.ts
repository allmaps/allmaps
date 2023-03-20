#!/usr/bin/env node

import { Command, CommanderError } from 'commander'

import iiif from './commands/iiif.js'
import annotation from './commands/annotation.js'
import transform from './commands/transform.js'

const fixedWidth = process.env.NODE_ENV === 'test'

const program = new Command()
  .name('allmaps')
  .exitOverride()
  // .showHelpAfterError()
  .addCommand(annotation())
  .addCommand(transform())
  .addCommand(iiif())
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
        console.error(`error: file not found "${err.path}"`)
      } else {
        console.error(err.message)
      }
    } else {
      console.error('Unkown error', err)
    }
    process.exit(1)
  }
}

parse()
