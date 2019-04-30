// rollup.config.js
import * as fs from 'fs';
import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/main.js',
  output: {
    sourcemap: true,
    file: '../wagtail_drawer/static/wagtail_drawer/wagtail-drawer.js',
    name: 'app',
    format: 'iife'
  },
  plugins: [
    svelte({
      dev: !production,
      css: function (css) {
        css.write('../wagtail_drawer/static/wagtail_drawer/wagtail-drawer.css');
      },
    }),
    resolve(),
    commonjs(),
    // !production && livereload('public'), // auto reload for dev
    production && terser() // minify for prod
  ]
}
