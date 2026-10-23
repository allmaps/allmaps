import { serveNode } from '@allmaps/api-shared/node'
import { parseAnnotationsEnv } from '@allmaps/env/annotations'

import { createApp } from './app.js'

serveNode(parseAnnotationsEnv(process.env), createApp)
