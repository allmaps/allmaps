import { defineConfig, type PluginOption } from 'vite'
import { exec } from 'child_process'
import { mkdirp } from 'mkdirp'
import { copyFile } from 'node:fs/promises'

import ports from '../../ports.json'

// TODO: move to @allmaps/stdlib?
const buildTypes: PluginOption = {
  name: 'build:types',
  buildEnd: (error) => {
    if (!error) {
      return new Promise((resolve, reject) => {
        exec('npm run build:types', (err) => (err ? reject(err) : resolve()))
      })
    }
  }
}

const buildShaders: PluginOption = {
  name: 'build:shaders',
  buildEnd: async function (error) {
    if (!error) {
      const files = [
        'fragment-shader.glsl',
        'vertex-shader.glsl',
        'spectral.glsl',
        'shaders.d.ts'
      ]

      await mkdirp('./dist/shaders')
      for (let file of files) {
        await copyFile(`./src/shaders/${file}`, `./dist/shaders/${file}`)
      }
    }
  }
}

export default defineConfig({
  server: {
    port: ports.render
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    emptyOutDir: false,
    minify: true,
    lib: {
      entry: './src/index.ts',
      name: 'Allmaps',
      fileName: (format) => `bundled/index.${format}.js`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [
        '@allmaps/annotation',
        '@allmaps/id',
        '@allmaps/iiif-parser',
        '@allmaps/transform',
        '@allmaps/triangulate',
        '@allmaps/stdlib',
        'potpack',
        'rbush'
      ],
      output: {
        globals: {
          '@allmaps/annotation': '@allmaps/annotation',
          '@allmaps/id': '@allmaps/id',
          '@allmaps/iiif-parser': '@allmaps/iiif-parser',
          '@allmaps/transform': '@allmaps/transform',
          '@allmaps/triangulate': '@allmaps/triangulate',
          '@allmaps/stdlib': '@allmaps/stdlib',
          rbush: 'rbush',
          potpack: 'potpack'
        }
      }
    }
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  base: '',
  plugins: [buildTypes, buildShaders],
  define: {
    // To fix error "Uncaught ReferenceError: global is not defined" in poly2tri.js, add this:
    global: 'globalThis'
  }
})
