import { serveNode } from '@allmaps/api-shared/node'
import { parseRestEnv } from '@allmaps/env/rest'

import { createApp } from './app.js'

serveNode(parseRestEnv(process.env), createApp)
