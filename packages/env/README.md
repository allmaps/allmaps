# `@allmaps/env`

Shared Zod schemas and parser helpers for environment variables used across the
Allmaps monorepo.

This package is the typed contract for env vars used by apps, APIs, and
workers. Consumers import a workspace-specific parser, validate their runtime
env once at startup, and then use the parsed result throughout the app.

Usage in SvelteKit app:

```js
import { env as publicEnv } from '$env/dynamic/public'

import { parseEditorPublicEnv } from '@allmaps/env/editor'

const editorPublicEnv = parseEditorPublicEnv(publicEnv)
```
