import { writable } from 'svelte/store'

// The playground and Usage block hydrate as separate islands on a component page.
export const playgroundUsage = writable<string>()

export function svelteExample(script: string[], markup: string) {
  const indented = script.map((line) => (line ? '  ' + line : '')).join('\n')
  return `<script lang="ts">\n${indented}\n</script>\n\n${markup}`
}
