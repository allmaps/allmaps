type CacheStorage = {
  default: Cache
}

declare module '@cloudflare/pages-plugin-vercel-og/api' {
  import { ImageResponse as VercelImageResponse } from '@vercel/og'
  export declare class ImageResponse extends Response {
    constructor(...args: ConstructorParameters<typeof VercelImageResponse>)
  }
}
declare module '*.woff2' {
  const content: ArrayBuffer
  export default content
}

declare module '*.woff' {
  const content: ArrayBuffer
  export default content
}

declare module '*.ttf' {
  const content: ArrayBuffer
  export default content
}
