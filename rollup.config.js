import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';
import bundleSize from 'rollup-plugin-bundle-size';
import { terser } from 'rollup-plugin-terser';

module.exports = {
  input: 'src/index-es6.js',
  output: {
    file: 'public/bundle.js',
    format: 'umd'
  },
  plugins: [
    serve('public'),
    livereload('src/'),
    bundleSize(),
    terser()
  ]
};
