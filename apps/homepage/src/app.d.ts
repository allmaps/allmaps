declare global {
  namespace App {}
}

declare module '*.svx' {
  import type { Component } from 'svelte'

  export const metadata: Record<string, unknown>

  const component: Component
  export default component
}

export {}
