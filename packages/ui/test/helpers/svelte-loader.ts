import { registerHooks } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compile, compileModule } from 'svelte/compiler'

export const svelteLoader = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('$lib/')) {
      specifier = './' + specifier.slice('$lib/'.length)
      context = {
        ...context,
        parentURL: new URL('../../src/lib/index.ts', import.meta.url).href
      }
    }
    if (specifier.endsWith('?url') || specifier.endsWith('.css')) {
      return {
        url: 'data:text/javascript,export default ' + JSON.stringify(specifier),
        shortCircuit: true
      }
    }
    try {
      return next(specifier, {
        ...context,
        conditions: [...context.conditions, 'svelte']
      })
    } catch (error) {
      if (!specifier.startsWith('.')) throw error
      if (specifier.endsWith('.js'))
        return next(specifier.slice(0, -3) + '.ts', context)
      return next(specifier + '.js', context)
    }
  },
  load(url, context, next) {
    if (url.endsWith('.svelte') || url.endsWith('.svelte.js')) {
      const filename = fileURLToPath(url)
      const source = readFileSync(filename, 'utf8')
      const compiler = url.endsWith('.svelte') ? compile : compileModule
      return {
        format: 'module',
        source: compiler(source, { filename, generate: 'server' }).js.code,
        shortCircuit: true
      }
    }
    return next(url, context)
  }
})
