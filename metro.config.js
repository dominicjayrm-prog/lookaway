const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix TDZ crash on web: Metro's minifier renames variables to short
// names that can shadow outer-scope const/let declarations, causing
// "Cannot access X before initialization". Disabling mangle prevents
// ALL variable renaming, eliminating the issue completely.
// Trade-off: bundle is ~15% larger but guaranteed to work.
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      reduce_vars: false,
      collapse_vars: false,
    },
    mangle: false,
  },
};

module.exports = config;
