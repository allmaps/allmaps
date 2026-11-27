import { glob, readFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { defineConfig, runnerImport } from 'vite'
import dts from 'vite-plugin-dts'

const entry = resolve('src/index.ts')
const staticDirectory = resolve('src/static')

export default defineConfig({
  publicDir: false,
  build: {
    lib: { entry, formats: ['es'], fileName: () => 'index.js' },
    rolldownOptions: {
      external: ['@allmaps/annotation/serialized', 'zod']
    }
  },
  plugins: [
    dts({ include: ['src/**/*.ts'] }),
    {
      name: 'allmaps-schema-documents',
      async buildStart() {
        // Evaluate the current annotation sources on every rebuild, including
        // when only a transitive Zod definition has changed.
        const { module, dependencies } = await runnerImport<
          typeof import('./src/index.ts')
        >(entry, {
          resolve: {
            alias: {
              '@allmaps/annotation/serialized': resolve(
                '../annotation/src/schemas/serialized.ts'
              )
            }
          }
        })
        for (const dependency of dependencies) this.addWatchFile(dependency)

        for (const schema of [module.map1Schema, module.map2Schema]) {
          this.emitFile({
            type: 'asset',
            fileName: 'site' + new URL(schema.$id).pathname,
            source: JSON.stringify(schema, null, 2) + '\n'
          })
        }

        this.emitFile({
          type: 'asset',
          fileName: 'site/map/2/context.json',
          source: JSON.stringify(module.map2Context, null, 2) + '\n'
        })

        for await (const file of glob('**/*', {
          cwd: staticDirectory,
          withFileTypes: true
        })) {
          const path = resolve(file.parentPath, file.name)
          if (!file.isFile()) continue
          this.addWatchFile(path)
          this.emitFile({
            type: 'asset',
            fileName: 'site/' + relative(staticDirectory, path),
            source: await readFile(path)
          })
        }
      },
      generateBundle(_, bundle) {
        const collections: Record<
          string,
          Record<string, Record<string, string>>
        > = {}
        for (const path of Object.keys(bundle).sort()) {
          const match = /^site\/(\w+)\/(\d+)\/(schema|context)\.json$/.exec(
            path
          )
          if (!match) continue
          const [, collection, version, kind] = match
          const versions = (collections[
            collection === 'map' ? 'maps' : collection
          ] ??= {})
          const documents = (versions[version] ??= {})
          documents[kind] = path.slice('site'.length)
        }
        this.emitFile({
          type: 'asset',
          fileName: 'site/index.json',
          source:
            JSON.stringify(
              { name: 'Allmaps schemas', ...collections },
              null,
              2
            ) + '\n'
        })
      }
    }
  ]
})
