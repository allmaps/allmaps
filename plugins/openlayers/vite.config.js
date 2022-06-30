import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      entry: './src/index.ts',
      name: 'allmaps-openLayers',
      fileName: (format) => `allmaps-openlayers.${format}.js`
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      // external: ['ol'],
      // output: {
      //   // Provide global variables to use in the UMD build
      //   // for externalized deps
      //   globals: {
      //     ol: 'OpenLayers'
      //   }
      // }
    },
    // assetsDir: ''
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020'
    }
  },
  // resolve: {
  //   alias: {
  //     "@/": new URL("./dist/", import.meta.url).pathname,
  //   },
  // },
  // worker: {
  //   format: 'es'
  // },
  base: ''
})
