const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable tree shaking and minification for production
config.transformer.minifierConfig = {
  mangle: {
    keep_fnames: true,
  },
  output: {
    ascii_only: true,
    quote_keys: true,
    wrap_iife: true,
  },
  sourceMap: false,
  toplevel: false,
  warnings: false,
  parse: {
    html5_comments: false,
    shebang: false,
  },
  compress: {
    drop_console: true,
    drop_debugger: true,
    pure_getters: true,
    unsafe: true,
    unsafe_comps: true,
    warnings: false,
  },
};

module.exports = config;
