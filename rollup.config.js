import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import terser from '@rollup/plugin-terser'

const sharedPlugins = [
  resolve({ preferBuiltins: false }),
  commonjs(),
  terser()
]

export default [
  // 主入口：core + Vue
  {
    input: 'src/index.js',
    external: ['vue'],
    output: [
      { file: 'dist/index.esm.js', format: 'esm', sourcemap: true },
      { file: 'dist/index.cjs.js', format: 'cjs', sourcemap: true, exports: 'named' }
    ],
    plugins: sharedPlugins
  },
  // React 入口
  {
    input: 'src/react.js',
    external: ['react'],
    output: [
      { file: 'dist/react.esm.js', format: 'esm', sourcemap: true },
      { file: 'dist/react.cjs.js', format: 'cjs', sourcemap: true, exports: 'named' }
    ],
    plugins: sharedPlugins
  }
]
