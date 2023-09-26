import { defineConfig, type PluginOption } from 'vite'
import { exec } from 'child_process'

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

type OLVersion = '6' | '7' | '8'

function getOLVersion(envVar: string | undefined): OLVersion {
  if (envVar === '6') {
    return '6'
  } else if (envVar === '7') {
    return '7'
  } else {
    return '8'
  }
}

// OpenLayers version
const olVersion: OLVersion = getOLVersion(process.env.OL_VERSION) || '8'

console.log(`Building for OpenLayers ${olVersion}`)

function getOLPath(olModule: string) {
  return `ol${olVersion}/${olModule}`
}

export default defineConfig({
  server: {
    port: ports.openlayers
  },
  build: {
    target: 'es2020',
    sourcemap: true,
    emptyOutDir: false,
    // minify: false,
    lib: {
      entry: `./src/${olVersion}/index.ts`,
      name: 'Allmaps',
      fileName: (format) =>
        `bundled/allmaps-openlayers-${olVersion}.${format}.${
          format === 'umd' ? 'cjs' : 'js'
        }`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: [
        getOLPath('View.js'),
        getOLPath('layer/Layer.js'),
        getOLPath('Object.js'),
        getOLPath('events/Event.js'),
        getOLPath('proj.js'),
        getOLPath('transform.js')
      ],
      output: {
        globals: {
          [getOLPath('View.js')]: 'ol.View',
          [getOLPath('layer/Layer.js')]: 'ol.layer.Layer',
          [getOLPath('Object.js')]: 'ol.Object',
          [getOLPath('events/Event.js')]: 'ol.events.Event',
          [getOLPath('proj.js')]: 'ol.proj',
          [getOLPath('transform.js')]: 'ol.transform'
        }
      }
    }
    // assetsDir: ''
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  base: '',
  plugins: [buildTypes]
})
