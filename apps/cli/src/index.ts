#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import iiif from './commands/iiif.js'
import annotation from './commands/annotation.js'
import transform from './commands/transform.js'

yargs(hideBin(process.argv))
  .command(iiif)
  .command(annotation)
  .command(transform)
  .showHelpOnFail(true)
  .demandCommand(1, '').argv
