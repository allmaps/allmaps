import nodeResolve from '@rollup/plugin-node-resolve'
import babel from '@rollup/plugin-babel'
import {terser} from 'rollup-plugin-terser'
import * as meta from './package.json'

const copyright = `// ${meta.homepage} v${meta.version} Copyright ${(new Date()).getFullYear()} ${meta.author.name}`
const name = meta.name.split('/')[1]

export default [
  {
    input: 'index.js',
    plugins: [
      nodeResolve(),
      babel({
        babelHelpers: 'bundled'
      }),
      terser({output: {preamble: copyright}})
    ],
    output: {
      file: `dist/${name}.min.js`,
      banner: copyright,
      format: 'umd',
      name,
      esModule: false,
      exports: 'named',
      sourcemap: true
    }
  },
  {
    input: 'index.js',
    plugins: [
      nodeResolve()
    ],
    output: [
      {
        dir: 'dist/esm',
        format: 'esm',
        exports: 'named',
        sourcemap: true
      },
      {
        dir: 'dist/cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true
      }
    ]
  }
]
