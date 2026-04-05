const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix: Metro's minifier can rename a function and a local const to the
// same short name, causing "Cannot access X before initialization" on web.
// keep_fnames prevents function names from being shortened, avoiding collisions.
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      reduce_vars: false,
      collapse_vars: false,
    },
    mangle: {
      keep_fnames: true,
    },
  },
};

module.exports = config;
