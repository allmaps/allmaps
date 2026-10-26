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

## Live import credential

The REST and Live schemas accept the optional server-only `LIVE_IMPORT_SECRET`.
A configured value must contain at least 32 characters after trimming. An empty
or absent value disables HTTP georeference imports without preventing either
service from starting. See the [Live API setup](../../apis/live/README.md).
