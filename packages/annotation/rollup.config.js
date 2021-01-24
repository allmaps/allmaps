import node from '@rollup/plugin-node-resolve'
// import commonjs from '@rollup/plugin-commonjs'
import {terser} from 'rollup-plugin-terser'
import * as meta from './package.json'

const copyright = `// ${meta.homepage} v${meta.version} Copyright ${(new Date()).getFullYear()} ${meta.author.name}`

// export default {
//   input: 'src/main.js',
//   output: {
//     file: 'dist/bundle.js',
//     format: 'iife',
//     sourcemap: true
//   },
//   plugins: [
//     resolve({
//       jsnext: true,
//       main: true,
//       browser: true
//     }),
//     commonjs()
//     // TODO:
//     // Add terser: https://github.com/rollup/rollup-starter-app/blob/master/rollup.config.js
//     // Add prettier
//   ]
// }

export default [
  {
    input: 'index.js',
    external: Object.keys(meta.dependencies || {}).filter(key => /^d3-/.test(key)),
    output: {
      file: 'dist/annotation.node.js',
      format: 'cjs'
    }
  },
  {
    input: 'index.js',
    plugins: [

    ],
    output: {
      extend: true,
      banner: copyright,
      file: 'dist/annotation.js',
      format: 'umd',
      indent: false,
      name: 'annotation'
    }
  },
  {
    input: 'index.js',
    plugins: [
      node(),
      terser({output: {preamble: copyright}})
    ],
    output: {
      extend: true,
      file: 'dist/annotation.min.js',
      format: 'umd',
      indent: false,
      name: 'annotation'
    }
  }
]
