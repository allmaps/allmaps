import { z } from 'zod'

/* These vars are prefixed with PUBLIC_ because they are used in both SvelteKit apps
 and Cloudflare Workers. SvelteKit/Vite exposes only vars prefixed with PUBLIC_ to the client.
*/

export const urlsEnvSchema = z.object({
  PUBLIC_TILE_SERVER_BASE_URL: z.string().url(),
  PUBLIC_TILE_VIEWER_BASE_URL: z.string().url(),
  PUBLIC_PREVIEW_BASE_URL: z.string().url(),
  PUBLIC_VIEWER_BASE_URL: z.string().url(),

  PUBLIC_REST_BASE_URL: z.string().url(),
  PUBLIC_ANNOTATIONS_BASE_URL: z.string().url(),
  PUBLIC_LIVE_BASE_URL: z.string().url(),

  PUBLIC_EXAMPLES_API_URL: z.string().url()
})
